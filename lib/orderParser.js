/**
 * 订单解析工具
 * 将文字内容解析为订单数组
 * 
 * @param {string} content - 要解析的文字内容
 * @param {Object} options - 配置选项
 * @param {string|number} options.depId - 部门ID
 * @param {string|number} options.depFatherId - 父部门ID
 * @param {string|number} options.disId - 配送商ID
 * @param {string|number} options.userId - 用户ID
 * @returns {Object} 返回 { orders: Array, formatted: string }
 */
function parseOrderFromText(content, options = {}) {
  console.log('[parseOrderFromText] 开始处理内容:', content);
  
  if (!content || content.trim() === '') {
    console.log('[parseOrderFromText] 内容为空，跳过处理');
    return { orders: [], formatted: '' };
  }

  const {
    depId = null,
    depFatherId = null,
    disId = null,
    userId = null
  } = options;

  // 优先尝试解析 JSON（AI 返回的格式）
  try {
    // 尝试提取 JSON（可能包含 markdown 代码块标记）
    let jsonStr = content.trim();
    
    // 移除可能的 markdown 代码块标记
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    jsonStr = jsonStr.trim();
    
    // 尝试解析 JSON
    const ordersJson = JSON.parse(jsonStr);
    
    if (Array.isArray(ordersJson) && ordersJson.length > 0) {
      console.log('[parseOrderFromText] JSON 解析成功，订单数量:', ordersJson.length);
      
      // 转换为系统需要的格式
      const formattedOrders = ordersJson.map(item => {
        const originalName = item.name || '';
        return {
          nxDoGoodsName: originalName,
          nxDoGoodsOriginalName: originalName,
          nxDoQuantity: item.qty || '',
          nxDoStandard: item.unit || '斤',
          nxDoRemark: item.remark || '',
          nxDoAddRemark: !!(item.remark && item.remark.trim()),
          nxDoStatus: -2,
          nxDoDepartmentId: depId,
          nxDoDepartmentFatherId: depFatherId,
          nxDoDisGoodsId: null,
          nxDoStandardWarn: 0,
          goodsNameWarn: 0,
          nxDoDistributerId: disId,
          nxDoPurchaseUserId: -1,
          nxDoOrderUserId: userId,
          nxDoIsAgent: -1,
          standardWeight: "",
          cartonUnit: "",
          itemUnit: "",
          itemsPerCarton: "",
        };
      });
      
      // 过滤掉无效订单（商品名为空）
      const validOrders = formattedOrders.filter(order => 
        order.nxDoGoodsName && order.nxDoGoodsName.trim()
      );
      
      console.log('[parseOrderFromText] 有效订单数量:', validOrders.length);
      
      // 生成预览字符串
      const formatted = validOrders.map(o => {
        let str = `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
        if (o.nxDoRemark) str += `（${o.nxDoRemark}）`;
        return str;
      }).join('\n');
      
      return { orders: validOrders, formatted, invalidSegments: [] };
    } else {
      console.log('[parseOrderFromText] JSON 解析结果不是有效数组，使用正则解析作为兜底');
      throw new Error('JSON 不是有效数组');
    }
  } catch (jsonError) {
    console.log('[parseOrderFromText] JSON 解析失败，使用正则解析作为兜底:', jsonError.message);
    
    // JSON 解析失败，使用原来的正则解析作为兜底
    content = content
      .replace(/(\d)\s+/g, '$1') // 处理数字后的空格
      .replace(/[^\S\r\n]+/g, ' '); // 只替换水平空白，保留换行符

    const result = formatOrderContent(content, options);
    // 供高亮使用：与解析时一致的内容（segmentText 基于此）
    result.contentForHighlight = content;
    return result;
  }
}

/**
 * 校验单条订单（与 PlaceOrder.checkOrderContent 规则一致）
 * @returns {string|null} 错误信息，通过返回 null
 */
function validateOrder(order) {
  if (!order.nxDoGoodsName || order.nxDoGoodsName.trim() === '') {
    return '商品名称为空';
  }
  const qty = order.nxDoQuantity;
  if (qty === undefined || qty === null || String(qty).trim() === '') {
    return '数量为空';
  }
  const qtyNum = Number(qty);
  if (Number.isNaN(qtyNum)) {
    return '数量必须是数字';
  }
  if (qtyNum <= 0) {
    return '数量必须大于 0';
  }
  if (!order.nxDoStandard || order.nxDoStandard.trim() === '') {
    return '规格为空';
  }
  const spec = order.nxDoStandard.trim();
  const chineseOnly = /^[\u4e00-\u9fff]+$/;
  if (!chineseOnly.test(spec)) {
    return '规格必须为汉字';
  }
  if (spec.length > 2) {
    return `规格汉字数量不能大于 2 个，当前为 ${spec.length} 个`;
  }
  return null;
}

/**
 * 使用正则表达式解析订单内容
 * @private
 */
function formatOrderContent(content, options = {}) {
  console.log('[formatOrderContent] 入参 content:', content);
  
  const {
    depId = null,
    depFatherId = null,
    disId = null,
    userId = null
  } = options;
  
  let orders = [];
  // 1. 按行拆分，保留原始行索引用于 invalidSegments 高亮
  const allLines = content.split(/\r?\n/);
  const linesWithIndex = allLines
    .map((line, i) => ({ line: line.trim(), originalIndex: i }))
    .filter(({ line }) => {
      if (!line) return false;
      if (/^备注[:：]/.test(line)) return true;
      const orderRegex = /^\d+[、，\.．]\s*(.+?)[:：]\s*(.+)$/;
      if (orderRegex.test(line)) return true;
      const commaRegex = /^(.*?)\s*[\,，]\s*(.+)$/;
      if (commaRegex.test(line)) return true;
      const hasNumber = /[\d零一二两三四五六七八九十百千万半]/.test(line);
      return hasNumber;
    });

  // ============ A. 中文数字转阿拉伯数字 ============
  function chineseNumberToArabic(chineseNum) {
    const map = {
      '零': 0, '一': 1, '二': 2, '两': 2, '三': 3,
      '四': 4, '五': 5, '六': 6, '七': 7, '八': 8,
      '九': 9, '十': 10, '百': 100, '千': 1000,
      '万': 10000, '半': 0.5
    };
    let result = 0, temp = 0;
    for (let i = 0; i < chineseNum.length; i++) {
      const char = chineseNum[i];
      if (char === '半') {
        result += 0.5;
      } else if (map[char] >= 10) {
        if (temp === 0) temp = 1;
        result += temp * map[char];
        temp = 0;
      } else if (map[char] !== undefined) {
        temp = temp * 10 + map[char];
      }
    }
    result += temp;
    return result;
  }

  // ============ B. 从尾部解析「名称 + 括号备注 + 数量+单位」 ============
  const validUnits = ['斤','个','包','根','棵','条','盒','捆','袋','跟','块','瓶','罐','桶','箱','件'];

  function parseSegmentEndOfLine(segment) {
    segment = segment.trim().replace(/[,，、。.]+$/g, '');


    // 「加」字前缀：加2箱满特起酥油 → 2箱满特起酥油（便于按数量单位前置格式解析）
    if (/^加\s*[\d\.一二两三四五六七八九十百千万半]/.test(segment)) {
      segment = segment.replace(/^加\s*/, '').trim();
    }
    
    // 先移除说明文字，避免被当作备注
    segment = segment.replace(/（说明.+?）/g, '');
    
    const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
    let remarkText = '';
    const bracketMatch = segment.match(bracketRegex);
    if (bracketMatch) {
      remarkText = bracketMatch[1];
      segment = segment.replace(bracketRegex, '').trim();
    }

    const hasArabic = /[0-9]/.test(segment);
    let name = segment, qtyVal = '', qtyUnit = '', regex;

    // 优先：数量+单位 前置格式，如 "2箱满特起酥油"
    if (hasArabic) {
      const unitPattern = validUnits.join('|');
      const fromLeftRegex = new RegExp(`^([\\d\\.]+)(${unitPattern})(.+)$`);
      const mLeft = segment.match(fromLeftRegex);
      if (mLeft) {
        const leftQty = mLeft[1].trim();
        const leftUnit = mLeft[2];
        const leftName = mLeft[3].trim().replace(/\s+/g, '');
        if (leftName && /[\u4e00-\u9fa5]/.test(leftName)) {
          name = leftName;
          qtyVal = leftQty;
          qtyUnit = leftUnit;
          console.log('[parseSegmentEndOfLine] 数量单位前置解析成功:', { name, qtyVal, qtyUnit });
          return {
            nxDoGoodsName: name,
            nxDoGoodsOriginalName: name,
            nxDoQuantity: leftQty,
            nxDoStandard: leftUnit,
            nxDoRemark: remarkText,
          };
        }
      }
    }

    if (hasArabic) {
      regex = /^(.*?)([\d\.]+)(\S*)$/;
    } else {
      regex = /^(.*?)([一二两三四五六七八九十百千万半]+)(\S*)$/;
    }
    const m = segment.match(regex);
    if (m) {
      let potentialName = m[1].trim().replace(/\s+/g, '');
      let potentialQty  = m[2].trim();
      let potentialUnit = m[3].trim();
      name = potentialName;

      console.log('[parseSegmentEndOfLine] 解析结果:', {
        segment,
        potentialName,
        potentialQty,
        potentialUnit
      });

      // 数量值
      if (/^[\d\.]+$/.test(potentialQty)) {
        qtyVal = potentialQty;
      } else {
        qtyVal = chineseNumberToArabic(potentialQty).toString();
      }

      // 单位列表
      let foundUnit = '';
      for (let u of validUnits) {
        if (potentialUnit.startsWith(u)) {
          foundUnit = u; break;
        }
      }
      if (foundUnit) {
        qtyUnit = foundUnit;
        const extra = potentialUnit.slice(foundUnit.length).trim();
        if (extra) remarkText = remarkText ? (remarkText + ' ' + extra) : extra;
      } else {
        qtyUnit = potentialUnit;
      }
      
      // 兜底：当商品名为空或规格无效（非1-2汉字）时，尝试从右往左解析
      // 场景：商品名含数字如 "1.6蒸鱼3箱"、"1.5丘比培煎芝麻沙拉汁1箱"、"800美级1箱"
      const specValid = qtyUnit && /^[\u4e00-\u9fff]+$/.test(qtyUnit) && qtyUnit.length <= 2;
      if ((!name || !specValid) && hasArabic) {
        const unitPattern = validUnits.join('|');
        const fromRightRegex = new RegExp(`^(.+?)([\\d\\.]+)(${unitPattern})$`);
        const m2 = segment.match(fromRightRegex);
        if (m2) {
          const rightName = m2[1].trim().replace(/\s+/g, '');
          const rightQty = m2[2].trim();
          const rightUnit = m2[3];
          if (rightName && /[\u4e00-\u9fa5]/.test(rightName)) {
            name = rightName;
            qtyVal = rightQty;
            qtyUnit = rightUnit;
            console.log('[parseSegmentEndOfLine] 从右往左兜底成功:', { name, qtyVal, qtyUnit });
          }
        }
      }
      
      console.log('[parseSegmentEndOfLine] 最终结果:', {
        name,
        qtyVal,
        qtyUnit,
        remarkText
      });
    }

    return {
      nxDoGoodsName: name,
      nxDoGoodsOriginalName: name,
      nxDoQuantity:  qtyVal,
      nxDoStandard:  qtyUnit,
      nxDoRemark:    remarkText,
    };
  }

  // ============ C. 序号格式解析 ============
  function parseLineWithSerial(line) {
    const match = line.match(/^(\d+)[、，\.．]\s*(.+?)[:：]\s*(.+)$/);
    if (!match) return null;

    let namePart = match[2].trim().replace(/\s+/g, '');
    let qtyPart  = match[3].trim().replace(/[\.。]+$/g, '').trim();

    // 先移除说明文字，避免被当作备注
    namePart = namePart.replace(/（说明.+?）/g, '');
    qtyPart = qtyPart.replace(/（说明.+?）/g, '');

    let remarkText = '';
    const br = namePart.match(/(?:（|\(|【)(.+?)(?:）|\)|】)/);
    if (br) { remarkText = br[1]; namePart = namePart.replace(/(?:（|\(|【).+?(?:）|\)|】)/, '').trim(); }

    const qMatch = qtyPart.match(/^([\d一二三四五六七八九十百千万半\.]+)\s*(\S*)$/);
    let val = '', unit = '';
    if (qMatch) { val = qMatch[1]; unit = qMatch[2]; }
    if (/[零一二两三四五六七八九十百千万半]/.test(val)) {
      val = chineseNumberToArabic(val).toString();
    }
    if (unit === '两' || unit === '量') {
      let v = parseFloat(val) / 10; v = +v.toFixed(1);
      val = v.toString(); unit = '斤';
    }

    return {
      nxDoGoodsName: namePart,
      nxDoGoodsOriginalName: namePart,
      nxDoQuantity:  val,
      nxDoStandard:  unit,
      nxDoRemark:    remarkText
    };
  }

  // ============ D. 拆逗号分隔 ============
  function splitByCommaOutsideBrackets(str) {
    let res = [], depth = 0, cur = '';
    for (let c of str) {
      if ('（(【'.includes(c)) { depth++; cur += c; }
      else if ('）)】'.includes(c)) { depth = Math.max(0, depth - 1); cur += c; }
      else if ((c === ','||c==='，'||c==='、') && depth === 0) {
        if (cur.trim()) res.push(cur.trim());
        cur = '';
      } else cur += c;
    }
    if (cur.trim()) res.push(cur.trim());
    return res;
  }

  function parseLineWithComma(line) {
    console.log('[parseLineWithComma] 开始解析行:', line);
    
    // 先移除说明文字（格式：说明...），避免说明文字中的逗号影响分割
    let remarkText = '';
    const remarkMatch = line.match(/（说明(.+?)）/);
    if (remarkMatch) {
      remarkText = remarkMatch[1];
      line = line.replace(/（说明.+?）/g, '').trim();
      console.log('[parseLineWithComma] 移除说明文字后:', line, '说明内容:', remarkText);
    }
    
    // 先按逗号分割，处理逗号分隔的商品
    if (/[，,]/.test(line)) {
      let commaParts = line.split(/[，,]/);
      let arr = [];
      
      console.log('[parseLineWithComma] 按逗号分割后的部分:', commaParts);
      
      for (let i = 0; i < commaParts.length; i++) {
        let item = commaParts[i].trim();
        if (!item) continue;
        
        console.log('[parseLineWithComma] 处理逗号分割部分:', item);
        
        // 检查是否包含多个商品（用空格分隔）
        if (/\s/.test(item) && item.length > 10) {
          console.log('[parseLineWithComma] 检测到可能包含多个商品，尝试进一步分割:', item);
          let subParts = item.split(/\s+/);
          let subArr = [];
          
          for (let j = 0; j < subParts.length; j++) {
            let subItem = subParts[j].trim();
            if (!subItem) continue;
            
            console.log('[parseLineWithComma] 处理子部分:', subItem);
            
            // 检查子部分是否包含数字
            const subItemHasNumber = /[\d一二两三四五六七八九十百千万半]/.test(subItem);
            
            // 如果子部分没有数字，且下一部分有数字+单位格式，优先组合处理
            if (!subItemHasNumber && j < subParts.length - 1) {
              let nextSubItem = subParts[j + 1].trim();
              const nextSubItemHasNumberUnit = /^[\d一二两三四五六七八九十百千万半\.]+[斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+/.test(nextSubItem);
              
              if (nextSubItem && nextSubItemHasNumberUnit) {
                let combinedSub = subItem + nextSubItem;
                console.log('[parseLineWithComma] 子部分无数字，优先组合:', combinedSub);
                
                // 使用从右往左匹配
                const unitMatch = combinedSub.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤]+)$/);
                if (unitMatch) {
                  let unit = unitMatch[1];
                  const beforeUnit = combinedSub.slice(0, -unit.length);
                  
                  const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
                  if (qtyMatch) {
                    const quantity = qtyMatch[1];
                    const goodsName = beforeUnit.slice(0, -quantity.length).trim();
                    
                    if (goodsName && /[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                      let qtyVal = quantity;
                      if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                        qtyVal = chineseNumberToArabic(quantity).toString();
                      }
                      
                      let subRemarkText = '';
                      const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                      const bracketMatch = unit.match(bracketRegex);
                      if (bracketMatch) {
                        subRemarkText = bracketMatch[1];
                        unit = unit.replace(bracketRegex, '').trim();
                      }
                      
                      console.log('[parseLineWithComma] 子部分组合成功:', { goodsName, qtyVal, unit });
                      subArr.push({
                        nxDoGoodsName: goodsName,
                        nxDoGoodsOriginalName: goodsName,
                        nxDoQuantity: qtyVal,
                        nxDoStandard: unit,
                        nxDoRemark: subRemarkText || remarkText,
                        _sourceSegmentText: combinedSub
                      });
                      j++; // 跳过下一个部分
                      continue;
                    }
                  }
                }
              }
            }
            
            // 对子部分进行解析
            let subMm = subItem.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
            if (subMm) {
              let subGoodsName = subMm[1].trim();
              let subQuantity = subMm[2].trim();
              let subUnit = subMm[3].trim().replace(/[。，,\.]+$/, '');
              
              console.log('[parseLineWithComma] 子部分匹配成功:', { subGoodsName, subQuantity, subUnit });
              
              // 验证：如果数量是单个中文字符，且商品名以中文结尾，可能是误匹配
              const isSingleChineseNumber = /^[一二两三四五六七八九十]$/.test(subQuantity);
              const subGoodsNameEndsWithChinese = /[\u4e00-\u9fa5]$/.test(subGoodsName);
              
              if (isSingleChineseNumber && subGoodsNameEndsWithChinese && j < subParts.length - 1) {
                console.log('[parseLineWithComma] 子部分可能是误匹配，跳过');
                continue;
              }
              
              if (/[\u4e00-\u9fa5]/.test(subGoodsName) && subGoodsName.length > 0 && subGoodsName.length <= 10) {
                let subQtyVal = subQuantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(subQuantity)) {
                  subQtyVal = chineseNumberToArabic(subQuantity).toString();
                }
                
                console.log('[parseLineWithComma] 添加子商品:', { subGoodsName, subQtyVal, subUnit });
                subArr.push({
                  nxDoGoodsName: subGoodsName,
                  nxDoGoodsOriginalName: subGoodsName,
                  nxDoQuantity: subQtyVal,
                  nxDoStandard: subUnit,
                  nxDoRemark: remarkText,
                  _sourceSegmentText: subItem
                });
              }
            } else {
              // 尝试使用 parseSegmentEndOfLine 解析子部分
              let subParsed = parseSegmentEndOfLine(subItem);
              if (subParsed && subParsed.nxDoQuantity) {
                console.log('[parseLineWithComma] 子部分 parseSegmentEndOfLine 解析结果:', subParsed);
                if (remarkText) {
                  subParsed.nxDoRemark = (subParsed.nxDoRemark || '') + ' ' + remarkText;
                }
                if (!subParsed.nxDoGoodsOriginalName) {
                  subParsed.nxDoGoodsOriginalName = subParsed.nxDoGoodsName || '';
                }
                subParsed._sourceSegmentText = subItem;
                subArr.push(subParsed);
              }
            }
          }
          
          if (subArr.length > 0) {
            console.log('[parseLineWithComma] 子部分解析成功，添加多个商品:', subArr);
            arr.push(...subArr);
            continue;
          }
        }
        
        // 1. 尝试匹配 "商品名+数字+单位" 格式
        let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
        console.log('[parseLineWithComma] 正则匹配结果:', mm);
        if (mm) {
          let goodsName = mm[1].trim();
          let quantity = mm[2].trim();
          let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
          
          console.log('[parseLineWithComma] 匹配到格式1:', { goodsName, quantity, unit });
          
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
            let qtyVal = quantity;
            if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
              qtyVal = chineseNumberToArabic(quantity).toString();
            }
            
            console.log('[parseLineWithComma] 添加商品:', { goodsName, qtyVal, unit });
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOriginalName: goodsName,
              nxDoQuantity: qtyVal,
              nxDoStandard: unit,
              nxDoRemark: '',
              _sourceSegmentText: item
            });
            continue;
          }
        }
        
        // 2. 尝试使用 parseSegmentEndOfLine 解析
        let parsed = parseSegmentEndOfLine(item);
        if (parsed && parsed.nxDoQuantity) {
          console.log('[parseLineWithComma] parseSegmentEndOfLine 解析结果:', parsed);
          if (!parsed.nxDoGoodsOriginalName) {
            parsed.nxDoGoodsOriginalName = parsed.nxDoGoodsName || '';
          }
          parsed._sourceSegmentText = item;
          arr.push(parsed);
          continue;
        }
        
        // 3. 如果都失败了，尝试匹配纯数字格式
        mm = item.match(/^(.+?)(\d+)(.+)$/);
        if (mm) {
          let goodsName = mm[1].trim();
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
            console.log('[parseLineWithComma] 匹配到纯数字格式:', mm);
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOriginalName: goodsName,
              nxDoQuantity: mm[2].trim(),
              nxDoStandard: mm[3].trim(),
              nxDoRemark: '',
              _sourceSegmentText: item
            });
            continue;
          }
        }
      }
      
      console.log('[parseLineWithComma] 逗号分割最终解析结果:', arr);
      if (arr.length) {
        return arr;
      }
    }

    // 如果没有逗号，先尝试整行解析（避免 "商品名 1件（备注）" 被过早拆分）
    const wholeLineParsed = parseSegmentEndOfLine(line);
    if (
      wholeLineParsed &&
      wholeLineParsed.nxDoGoodsName &&
      wholeLineParsed.nxDoGoodsName.trim() &&
      wholeLineParsed.nxDoQuantity
    ) {
      wholeLineParsed._sourceSegmentText = line;
      return [wholeLineParsed];
    }

    // 整行解析失败，再尝试按空格分割
    if (/\s/.test(line)) {
      let spaceParts = line.split(/\s+/);
      let arr = [];
      
      console.log('[parseLineWithComma] 按空格分割后的部分:', spaceParts);
      
      for (let i = 0; i < spaceParts.length; i++) {
        let item = spaceParts[i].trim();
        if (!item) continue;
        
        console.log('[parseLineWithComma] 处理空格分割部分:', item);
        
        // 优先处理：如果下一部分有明确的"数字+单位"格式，优先组合处理
        if (i < spaceParts.length - 1) {
          let nextItem = spaceParts[i + 1].trim();
          const nextItemHasNumberUnit = /^[\d一二两三四五六七八九十百千万半\.]+[斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+/.test(nextItem);
          
          if (nextItem && nextItemHasNumberUnit) {
            let combined = item + nextItem;
            console.log('[parseLineWithComma] 下一部分有数字+单位格式，优先组合:', combined);
            
            const unitMatch = combined.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
            if (unitMatch) {
              let unit = unitMatch[1];
              const beforeUnit = combined.slice(0, -unit.length);
              
              const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
              if (qtyMatch) {
                const quantity = qtyMatch[1];
                const goodsName = beforeUnit.slice(0, -quantity.length).trim();
                
                if (goodsName && /[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  let remarkText = '';
                  const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                  const bracketMatch = unit.match(bracketRegex);
                  if (bracketMatch) {
                    remarkText = bracketMatch[1];
                    unit = unit.replace(bracketRegex, '').trim();
                  }
                  
                  console.log('[parseLineWithComma] 从右往左匹配成功:', { goodsName, qtyVal, unit, remarkText });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoGoodsOriginalName: goodsName,
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: remarkText,
                    _sourceSegmentText: combined
                  });
                  i++;
                  continue;
                }
              }
            }
            
            let mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
            if (mm) {
              let goodsName = mm[1].trim();
              let quantity = mm[2].trim();
              let unit = mm[3].trim();
              
              if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.includes(item)) {
                let qtyVal = quantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                  qtyVal = chineseNumberToArabic(quantity).toString();
                }
                
                let remarkText = '';
                const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                const bracketMatch = unit.match(bracketRegex);
                if (bracketMatch) {
                  remarkText = bracketMatch[1];
                  unit = unit.replace(bracketRegex, '').trim();
                }
                
                arr.push({
                  nxDoGoodsName: goodsName,
                  nxDoGoodsOriginalName: goodsName,
                  nxDoQuantity: qtyVal,
                  nxDoStandard: unit,
                  nxDoRemark: remarkText,
                  _sourceSegmentText: combined
                });
                i++;
                continue;
              }
            }
          }
        }
        
        // 1. 尝试匹配 "商品名+数字+单位" 格式
        let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
        if (mm) {
          let goodsName = mm[1].trim();
          let quantity = mm[2].trim();
          let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
          
          const isSingleChineseNumber = /^[一二两三四五六七八九十]$/.test(quantity);
          const goodsNameEndsWithChinese = /[\u4e00-\u9fa5]$/.test(goodsName);
          
          if (isSingleChineseNumber && goodsNameEndsWithChinese && i < spaceParts.length - 1) {
            let nextItem = spaceParts[i + 1].trim();
            if (nextItem && /[\d一二两三四五六七八九十百千万半]/.test(nextItem)) {
              let combined = item + nextItem;
              
              const unitMatch = combined.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
              if (unitMatch) {
                let combinedUnit = unitMatch[1];
                const beforeUnit = combined.slice(0, -combinedUnit.length);
                
                const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
                if (qtyMatch) {
                  const combinedQuantity = qtyMatch[1];
                  const combinedGoodsName = beforeUnit.slice(0, -combinedQuantity.length).trim();
                  
                  if (combinedGoodsName && /[\u4e00-\u9fa5]/.test(combinedGoodsName) && combinedGoodsName.includes(goodsName)) {
                    let qtyVal = combinedQuantity;
                    if (/[零一二两三四五六七八九十百千万半]/.test(combinedQuantity)) {
                      qtyVal = chineseNumberToArabic(combinedQuantity).toString();
                    }
                    
                    let remarkText = '';
                    const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                    const bracketMatch = combinedUnit.match(bracketRegex);
                    if (bracketMatch) {
                      remarkText = bracketMatch[1];
                      combinedUnit = combinedUnit.replace(bracketRegex, '').trim();
                    }
                    
                    arr.push({
                      nxDoGoodsName: combinedGoodsName,
                      nxDoGoodsOriginalName: combinedGoodsName,
                      nxDoQuantity: qtyVal,
                      nxDoStandard: combinedUnit,
                      nxDoRemark: remarkText,
                      _sourceSegmentText: combined
                    });
                    i++;
                    continue;
                  }
                }
              }
            }
          }
          
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
            let qtyVal = quantity;
            if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
              qtyVal = chineseNumberToArabic(quantity).toString();
            }
            
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOriginalName: goodsName,
              nxDoQuantity: qtyVal,
              nxDoStandard: unit,
              nxDoRemark: '',
              _sourceSegmentText: item
            });
            continue;
          }
        }
        
        // 2. 尝试使用 parseSegmentEndOfLine 解析
        let parsed = parseSegmentEndOfLine(item);
        if (parsed && parsed.nxDoQuantity) {
          if (!parsed.nxDoGoodsOriginalName) {
            parsed.nxDoGoodsOriginalName = parsed.nxDoGoodsName || '';
          }
          parsed._sourceSegmentText = item;
          arr.push(parsed);
          continue;
        }
        
        // 3. 如果都失败了，尝试匹配纯数字格式
        mm = item.match(/^(.+?)(\d+)(.+)$/);
        if (mm) {
          let goodsName = mm[1].trim();
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOriginalName: goodsName,
              nxDoQuantity: mm[2].trim(),
              nxDoStandard: mm[3].trim(),
              nxDoRemark: '',
              _sourceSegmentText: item
            });
            continue;
          }
        }
      }
      
      console.log('[parseLineWithComma] 空格分割最终解析结果:', arr);
      if (arr.length) {
        return arr;
      }
    }

    // 逗号分隔
    line = line.replace(/[\u3002]+/g, ',');
    let segs = splitByCommaOutsideBrackets(line), arr = [];
    segs.forEach(seg => {
      let result = parseSegmentEndOfLine(seg);
      if (result) {
        result._sourceSegmentText = seg;
        arr.push(result);
      }
    });
    return arr;
  }

  // ============ E. 逐行处理 ============
  linesWithIndex.forEach(({ line, originalIndex: lineIndex }) => {
    if (/^备注[:：]/.test(line)) {
      if (orders.length) {
        let last = orders[orders.length - 1];
        last.nxDoRemark = (last.nxDoRemark || '') + ' ' + line.replace(/^备注[:：]/, '').trim();
      }
      return;
    }

    // 1) 序号格式
    let obj1 = parseLineWithSerial(line);
    if (obj1) {
      orders.push({
        ...obj1,
        nxDoAddRemark: !!obj1.nxDoRemark,
        nxDoStatus: -2,
        nxDoDepartmentId: depId,
        nxDoDepartmentFatherId: depFatherId,
        nxDoDisGoodsId: null,
        nxDoStandardWarn: 0,
        goodsNameWarn: 0,
        nxDoDistributerId: disId,
        nxDoPurchaseUserId: -1,
        nxDoOrderUserId: userId,
        nxDoIsAgent: -1,
        standardWeight: "",
        cartonUnit: "",
        itemUnit: "",
        itemsPerCarton: "",
        _sourceLineIndex: lineIndex,
        _sourceSegmentText: line,
      });
      return;
    }

    // 2) 冒号替换为空格
    if (/^(.*?)[:：](.+)$/.test(line)) {
      console.log('[formatOrderContent] 检测到冒号，替换为空格');
      line = line.replace(/^(.+?)[:：](.+)$/, '$1 $2');
      console.log('[formatOrderContent] 冒号替换后:', line);
    }

    // 3) 逗号分隔
    let arr2 = parseLineWithComma(line);
    if (arr2 && arr2.length) {
      arr2.forEach(i => {
        if (i && i.nxDoGoodsName) {
          const originalName = i.nxDoGoodsOriginalName || i.nxDoGoodsName;
          const segText = i._sourceSegmentText != null ? i._sourceSegmentText : (i.nxDoGoodsName + (i.nxDoQuantity || '') + (i.nxDoStandard || ''));
          orders.push({
            ...i,
            nxDoGoodsOriginalName: originalName,
            nxDoAddRemark: !!i.nxDoRemark,
            nxDoStatus: -2,
            nxDoDepartmentId: depId,
            nxDoDepartmentFatherId: depFatherId,
            nxDoDisGoodsId: null,
            nxDoStandardWarn: 0,
            goodsNameWarn: 0,
            nxDoDistributerId: disId,
            nxDoPurchaseUserId: -1,
            nxDoOrderUserId: userId,
            nxDoIsAgent: -1,
            standardWeight: "",
            cartonUnit: "",
            itemUnit: "",
            itemsPerCarton: "",
            _sourceLineIndex: lineIndex,
            _sourceSegmentText: segText,
          });
        }
      });
      return;
    }

    // 4) 空格分隔（兜底）
    let parts = line.split(/\s+/);
    parts.forEach(item => {
      let mm = item.match(/^(.+?)(\d+)(.+)$/);
      if (mm) {
        const goodsName = mm[1].trim();
        orders.push({
          nxDoGoodsName: goodsName,
          nxDoGoodsOriginalName: goodsName,
          nxDoQuantity:  mm[2].trim(),
          nxDoStandard:  mm[3].trim(),
          nxDoRemark:    '',
          nxDoAddRemark: false,
          nxDoStatus: -2,
          nxDoDepartmentId: depId,
          nxDoDepartmentFatherId: depFatherId,
          nxDoDisGoodsId: null,
          nxDoStandardWarn: 0,
          goodsNameWarn: 0,
          nxDoDistributerId: disId,
          nxDoPurchaseUserId: -1,
          nxDoOrderUserId: userId,
          nxDoIsAgent: -1,
          standardWeight: "",
          cartonUnit: "",
          itemUnit: "",
          itemsPerCarton: "",
          _sourceLineIndex: lineIndex,
          _sourceSegmentText: item,
        });
      }
    });
  });

  // ============ F3. 最终新增 nxDoAddRemark 字段（保险） ============
  orders = orders.map(o => ({
    ...o,
    nxDoAddRemark: !!o.nxDoRemark
  }));

  // ============ G. 校验并收集不合格片段（用于红色标注） ============
  const invalidSegments = [];
  orders.forEach(o => {
    const err = validateOrder(o);
    if (err != null && o._sourceLineIndex != null) {
      const segmentText = (o._sourceSegmentText != null && String(o._sourceSegmentText).trim() !== '')
        ? o._sourceSegmentText
        : `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
      if (!invalidSegments.some(s => s.lineIndex === o._sourceLineIndex && s.segmentText === segmentText)) {
        invalidSegments.push({ lineIndex: o._sourceLineIndex, segmentText });
      }
      console.warn('[formatOrderContent] 校验不合格，行索引:', o._sourceLineIndex, '片段:', segmentText, '原因:', err);
    }
  });

  // 移除内部字段 _sourceLineIndex、_sourceSegmentText，保持对外接口整洁
  orders = orders.map(({ _sourceLineIndex, _sourceSegmentText, ...o }) => o);

  // ============ H. 可选：返回预览字符串 ============
  const formatted = orders.map(o => {
    let str = `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
    if (o.nxDoRemark) str += `（${o.nxDoRemark}）`;
    return str;
  }).join('\n');
  return { orders, formatted, invalidSegments: invalidSegments || [] };
}

export { parseOrderFromText };
