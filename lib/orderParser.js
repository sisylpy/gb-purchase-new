/**
 * 订单解析工具 - 五层解析链重构版
 * 将文字内容解析为订单数组
 *
 * 解析链：预处理 → 切片 → 数量识别 → 名称清洗 → 校验
 * 核心原则：先找数量+单位，剩余部分才是商品名
 *
 * @param {string} content - 要解析的文字内容
 * @param {Object} options - 配置选项
 * @param {string|number} options.depId - 部门ID
 * @param {string|number} options.depFatherId - 父部门ID
 * @param {string|number} options.disId - 配送商ID
 * @param {string|number} options.userId - 用户ID
 * @returns {Object} 返回 { orders: Array, formatted: string, invalidSegments: Array, contentForHighlight: string }
 */

// ==================== 工具函数 ====================

// 中文数字转阿拉伯数字
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

// 商品名称归一化：° -> 度，去掉空格
function normalizeGoodsName(name) {
  if (name == null) return name;
  return String(name)
    .replace(/°/g, '度')
    .replace(/\s+/g, '');
}

// 语音识别常见误转归一化（数字+单位→商品名）
function normalizeVoiceText(content) {
  const map = {
    '13箱': '十三香',
    '13香': '十三香',
  };
  for (const [pattern, replacement] of Object.entries(map)) {
    content = content.replace(new RegExp(pattern, 'g'), replacement);
  }
  return content;
}

// 有效单位列表
const VALID_UNITS = ['公斤','斤','两','克','目','个','只','对','包','扎','把','束','根','棵','颗','条','尾','头','张','板','盒','听','捆','袋','跟','块','瓶','罐','桶','箱','件','筐','肠'];
const UNIT_PATTERN = VALID_UNITS.join('|');

// ==================== 对外接口 ====================

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
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    jsonStr = jsonStr.trim();

    const ordersJson = JSON.parse(jsonStr);

    if (Array.isArray(ordersJson) && ordersJson.length > 0) {
      console.log('[parseOrderFromText] JSON 解析成功，订单数量:', ordersJson.length);

      const formattedOrders = ordersJson.map(item => {
        const originalName = item.name || '';
        return makeOrderItem({
          nxDoGoodsName: originalName,
          nxDoGoodsOriginalName: originalName,
          nxDoQuantity: item.qty || '',
          nxDoStandard: item.unit || '斤',
          nxDoRemark: item.remark || '',
        }, depId, depFatherId, disId, userId);
      });

      const validOrders = formattedOrders
        .filter(order => order.nxDoGoodsName && order.nxDoGoodsName.trim())
        .map(o => ({
          ...o,
          nxDoGoodsName: normalizeGoodsName(o.nxDoGoodsName),
          nxDoGoodsOriginalName: normalizeGoodsName(o.nxDoGoodsOriginalName)
        }));

      console.log('[parseOrderFromText] 有效订单数量:', validOrders.length);

      const formatted = validOrders.map(orderToPreviewStr).join('\n');

      return { orders: validOrders, formatted, invalidSegments: [] };
    } else {
      console.log('[parseOrderFromText] JSON 解析结果不是有效数组，使用文本解析兜底');
      throw new Error('JSON 不是有效数组');
    }
  } catch (jsonError) {
    console.log('[parseOrderFromText] JSON 解析失败，使用文本解析兜底:', jsonError.message);

    // 预处理：数字后空格压缩、全角数字转半角、水平空白归一化
    content = content
      .replace(/(\d)\s+/g, '$1')
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[^\S\r\n]+/g, ' ');

    // 语音识别常见误转归一化（数字+单位被误当成商品名）
    content = normalizeVoiceText(content);

    const result = formatOrderContent(content, depId, depFatherId, disId, userId);
    result.contentForHighlight = content;
    return result;
  }
}

// ==================== 五层解析链 ====================

function formatOrderContent(content, depId, depFatherId, disId, userId) {
  console.log('[formatOrderContent] 入参 content:', content);

  let orders = [];
  const allLines = content.split(/\r?\n/);

  for (let i = 0; i < allLines.length; i++) {
    const rawLine = allLines[i];

    // ===== LAYER 0: 备注行处理 =====
    if (/^备注[:：]/.test(rawLine)) {
      if (orders.length > 0) {
        const last = orders[orders.length - 1];
        last.nxDoRemark = (last.nxDoRemark ? last.nxDoRemark + ' ' : '') +
          rawLine.replace(/^备注[:：]/, '').trim();
      }
      continue;
    }

    // ===== LAYER 1: 文本预处理 =====
    let lineText = rawLine.trim();
    if (!lineText) continue;

    // 序号格式 "1、商品名: 5斤" → "商品名 5斤"
    const serialMatch = lineText.match(/^(\d+)[、，\.．]\s*(.+?)[:：]\s*(.+)$/);
    if (serialMatch) {
      lineText = `${serialMatch[2]} ${serialMatch[3]}`;
    }

    // "备注："开头的行（非备注行）中，去掉"备注："前缀
    if (/^备注[:：]/.test(lineText)) {
      lineText = lineText.replace(/^备注[:：]/, '').trim();
    }

    // 冒号替换为空格： "商品:5斤" → "商品 5斤"
    if (/^(.+?)[:：](.+)$/.test(lineText)) {
      lineText = lineText.replace(/^(.+?)[:：](.+)$/, '$1 $2');
    }

    // ===== LAYER 2: 商品片段切分 =====
    const items = splitItems(lineText);

    // ===== LAYER 3: 数量单位识别 + LAYER 4/5 在后续 =====
    for (let j = 0; j < items.length; j++) {
      const itemSeg = items[j];
      const parsed = extractQuantity(itemSeg);

      const order = makeOrderItem({
        nxDoGoodsName: parsed.goodsName,
        nxDoGoodsOriginalName: parsed.goodsName,
        nxDoQuantity: parsed.qty !== null ? String(parsed.qty) : '',
        nxDoStandard: parsed.unit || '',
        nxDoRemark: parsed.remark || '',
      }, depId, depFatherId, disId, userId);

      order._sourceLineIndex = i;
      order._sourceSegmentText = itemSeg;
      order._confidence = parsed.confidence;
      order._needConfirm = !!parsed.needConfirm;

      orders.push(order);
    }
  }

  if (orders.length === 0) {
    return { orders: [], formatted: '', invalidSegments: [] };
  }

  // ===== LAYER 4: 名称清洗 =====
  orders = orders.map(o => ({
    ...o,
    nxDoGoodsName: normalizeGoodsName(o.nxDoGoodsName),
    nxDoGoodsOriginalName: normalizeGoodsName(o.nxDoGoodsOriginalName)
  }));

  // ===== LAYER 5: 业务校验 =====
  // 统一设置备注标记
  orders.forEach(o => o.nxDoAddRemark = !!o.nxDoRemark);

  const invalidSegments = [];
  const invalidKeys = new Set(); // 用 lineIndex+segmentText 索引，便于下面过滤
  orders.forEach(o => {
    const err = validateOrder(o);
    if (err != null) {
      o.nxDoIsValid = false;
      if (o._sourceLineIndex != null) {
        const segmentText = o._sourceSegmentText || `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
        const key = `${o._sourceLineIndex}::${segmentText}`;
        if (!invalidKeys.has(key)) {
          invalidKeys.add(key);
          invalidSegments.push({ lineIndex: o._sourceLineIndex, segmentText });
        }
      }
      console.warn('[formatOrderContent] 校验不合格，行索引:', o._sourceLineIndex, '片段:', o._sourceSegmentText, '原因:', err);
    } else {
      o.nxDoIsValid = true;
    }
  });

  // 移除内部字段
  orders = orders.map(({ _sourceLineIndex, _sourceSegmentText, _confidence, _needConfirm, ...o }) => o);

  // 生成预览字符串
  const formatted = orders.map(orderToPreviewStr).join('\n');

  return { orders, formatted, invalidSegments: invalidSegments || [] };
}

// ==================== 解析链子函数 ====================

/**
 * LAYER 2: 商品切片
 * 按逗号、分号切分（保留括号内内容）
 */
function splitItems(text) {
  let result = [];
  let depth = 0, current = '';

  for (let c of text) {
    if ('（(【'.includes(c)) { depth++; current += c; }
    else if ('）)】'.includes(c)) { depth = Math.max(0, depth - 1); current += c; }
    else if ('，,、；;。.!！|\t'.includes(c) && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

/**
 * LAYER 3: 数量单位识别（核心）
 * 原则：先找末尾的数量+单位，剩余部分就是商品名
 *
 * @param {string} segment - 单个商品片段
 * @returns {{ goodsName: string, qty: number|null, unit: string|null, remark: string, confidence: number, needConfirm: boolean }}
 */
function extractQuantity(segment) {
  let seg = segment.trim();
  let remark = '';

  // 去尾部标点
  seg = seg.replace(/[。，,.、；;]+$/g, '').trim();

  // 提取括号备注
  [...seg.matchAll(/(?:（|\(|【)(.+?)(?:）|\)|】)/g)].forEach(m => {
    remark = remark ? remark + ' ' + m[1] : m[1];
  });
  let segClean = seg.replace(/(?:（|\(|【).+?(?:）|\)|】)/g, '').trim();

  // 去掉"加"前缀： "加2箱满特起酥油" → "2箱满特起酥油"
  segClean = segClean.replace(/^加\s*/, '').trim();

  if (!segClean) {
    return { goodsName: '', qty: null, unit: null, remark, confidence: 0, needConfirm: true };
  }

  // ======== 第一优先：阿拉伯数字 + 单位（取最后一组匹配） ========
  // 数字前不能是字母/数字，防止 "500ml瓶" 被误匹配
  const arabicRegex = new RegExp(`(?<![A-Za-z0-9])(\\d+(\\.\\d+)?)\\s*(${UNIT_PATTERN})`, 'g');
  const arabicMatches = [...segClean.matchAll(arabicRegex)];

  if (arabicMatches.length > 0) {
    const m = arabicMatches[arabicMatches.length - 1]; // 取最后一次匹配
    const qty = parseFloat(m[1]);
    const unit = m[3];
    let name = segClean.slice(0, m.index).trim();

    // 如果数量在开头（如 "2箱满特起酥油"），名字在后面
    if (!name || !/[\u4e00-\u9fa5]/.test(name)) {
      name = segClean.slice(m.index + m[0].length).replace(/\s+/g, '');
    }

    if (name && /[\u4e00-\u9fa5]/.test(name)) {
      console.log('[extractQuantity] 阿拉伯数字解析成功:', { name, qty, unit, remark });
      return { goodsName: name.replace(/\s+/g, ''), qty, unit, remark, confidence: 0.98, needConfirm: false };
    }
  }

  // ======== 第二优先：中文数字 + 单位（取最后一组匹配） ========
  // 中文数字天然靠"后面必须是单位"做边界保护（如 "五香粉" 不会被误判，"香"不是单位）
  const chineseRegex = new RegExp(`([一二两三四五六七八九十百千万半]+)\\s*(${UNIT_PATTERN})`, 'g');
  const chineseMatches = [...segClean.matchAll(chineseRegex)];

  if (chineseMatches.length > 0) {
    const m = chineseMatches[chineseMatches.length - 1]; // 取最后一次匹配
    const qty = chineseNumberToArabic(m[1]);
    const unit = m[2];
    let name = segClean.slice(0, m.index).trim();

    // 如果数量在开头（如 "一袋去皮花生"），名字在后面
    if (!name || !/[\u4e00-\u9fa5]/.test(name)) {
      name = segClean.slice(m.index + m[0].length).replace(/\s+/g, '');
    }

    if (name && /[\u4e00-\u9fa5]/.test(name)) {
      console.log('[extractQuantity] 中文数字解析成功:', { name, qty, unit, remark });
      return { goodsName: name.replace(/\s+/g, ''), qty, unit, remark, confidence: 0.9, needConfirm: false };
    }
  }

  // ======== 第三：没有数量 ========
  return {
    goodsName: segClean.replace(/\s+/g, ''),
    qty: null,
    unit: null,
    remark,
    confidence: 0.5,
    needConfirm: true
  };
}

/**
 * 校验单条订单（与 PlaceOrder.checkOrderContent 规则一致）
 * @returns {string|null} 错误信息，pass 返回 null
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

// ==================== 辅助函数 ====================

/** 创建标准订单项对象 */
function makeOrderItem(overrides, depId, depFatherId, disId, userId) {
  return {
    nxDoGoodsName: overrides.nxDoGoodsName || '',
    nxDoGoodsOriginalName: overrides.nxDoGoodsOriginalName || overrides.nxDoGoodsName || '',
    nxDoQuantity: overrides.nxDoQuantity || '',
    nxDoStandard: overrides.nxDoStandard || '',
    nxDoRemark: overrides.nxDoRemark || '',
    nxDoAddRemark: !!(overrides.nxDoRemark && overrides.nxDoRemark.trim()),
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
}

/**
 * 生成预览字符串
 * - 校验通过 + 有备注 → "商品名+数量+单位（备注）"
 * - 校验失败 → "商品名+数量+单位"（不包备注，让 UI 层根据 invalidSegments 标红）
 */
function orderToPreviewStr(o) {
  let str = `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
  if (o.nxDoIsValid && o.nxDoRemark) str += `(${o.nxDoRemark})`;
  return str;
}

export { parseOrderFromText };
