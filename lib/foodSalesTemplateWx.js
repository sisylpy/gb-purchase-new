/**
 * 菜品销量 Excel 模板下载：微信端下载 → 校验 → 写入 → openDocument
 *（与 depFoodList / 营业额页的下载入口共用）
 */

function _getRespHeader(headers, key) {
  if (!headers || typeof headers !== 'object') return '';
  var lower = key.toLowerCase();
  for (var k in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, k) && k.toLowerCase() === lower) {
      return String(headers[k] || '');
    }
  }
  return '';
}

function _guessExcelFromHeaders(headers) {
  var ct = _getRespHeader(headers, 'content-type').toLowerCase();
  if (ct.indexOf('spreadsheetml.sheet') >= 0) {
    return { ext: 'xlsx', fileType: 'xlsx' };
  }
  if (ct.indexOf('ms-excel') >= 0 || ct.indexOf('application/excel') >= 0) {
    return { ext: 'xls', fileType: 'xls' };
  }
  var cd = _getRespHeader(headers, 'content-disposition');
  var m = /\.(xlsx|xls)/i.exec(cd);
  if (m) {
    var ext = m[1].toLowerCase();
    return { ext: ext, fileType: ext };
  }
  return null;
}

function _guessExcelFromArrayBuffer(ab) {
  if (!ab || !ab.byteLength || ab.byteLength < 4) return null;
  var u8 = new Uint8Array(ab.slice(0, 8));
  if (u8[0] === 0x50 && u8[1] === 0x4b) {
    return { ext: 'xlsx', fileType: 'xlsx' };
  }
  if (u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0) {
    return { ext: 'xls', fileType: 'xls' };
  }
  if (u8[0] === 0x3c) {
    return { notExcel: 'html' };
  }
  return null;
}

function _isArrayBuffer(v) {
  if (!v) return false;
  if (v instanceof ArrayBuffer) return true;
  return Object.prototype.toString.call(v) === '[object ArrayBuffer]';
}

function _toStandaloneArrayBuffer(data) {
  if (!data) return null;
  if (_isArrayBuffer(data)) {
    return data.byteLength ? data.slice(0) : null;
  }
  if (data.buffer && typeof data.byteLength === 'number' && typeof data.byteOffset === 'number') {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  return null;
}

function _contentLengthMismatch(ab, headers) {
  var cl = _getRespHeader(headers, 'content-length');
  if (!cl) return '';
  var expected = parseInt(String(cl).trim(), 10);
  if (isNaN(expected) || expected <= 0) return '';
  if (ab.byteLength !== expected) {
    return '文件未下完整(' + ab.byteLength + '/' + expected + ')，请重试';
  }
  return '';
}

function _saveFoodSalesTemplateBuffer(ab, headers) {
  if (!ab || !ab.byteLength) {
    wx.showToast({ title: '下载数据为空', icon: 'none' });
    return;
  }
  var buf = _toStandaloneArrayBuffer(ab);
  if (!buf || !buf.byteLength) {
    wx.showToast({ title: '下载数据无效', icon: 'none' });
    return;
  }
  var lenErr = _contentLengthMismatch(buf, headers);
  if (lenErr) {
    wx.showToast({ title: lenErr, icon: 'none', duration: 4500 });
    return;
  }
  var jsonErr = _tryParseJsonErrorMessage(buf);
  if (jsonErr) {
    wx.showToast({
      title: jsonErr.length > 36 ? jsonErr.slice(0, 36) + '…' : jsonErr,
      icon: 'none',
      duration: 4000,
    });
    return;
  }
  var fromBin = _guessExcelFromArrayBuffer(buf);
  if (fromBin && fromBin.notExcel === 'html') {
    wx.showToast({ title: '服务端返回了网页而非表格，请检查接口或登录状态', icon: 'none', duration: 4000 });
    return;
  }
  var fmt = fromBin || _guessExcelFromHeaders(headers) || { ext: 'xls', fileType: 'xls' };
  var filePath = wx.env.USER_DATA_PATH + '/food_sales_template_' + Date.now() + '.' + fmt.ext;
  var fs = wx.getFileSystemManager();
  fs.writeFile({
    filePath: filePath,
    data: buf,
    success: function () {
      _openFoodSalesTemplateDoc(filePath, fmt.fileType, true);
    },
    fail: function (writeErr) {
      console.error('writeFile', writeErr);
      wx.showToast({ title: '保存文件失败', icon: 'none' });
    },
  });
}

function _tryParseJsonErrorMessage(ab) {
  var start = 0;
  var head = new Uint8Array(ab.slice(0, Math.min(ab.byteLength, 4)));
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
    start = 3;
  }
  var u8 = new Uint8Array(ab.slice(start, start + 1));
  if (!u8.length || (u8[0] !== 0x7b && u8[0] !== 0x5b)) return '';
  var len = Math.min(ab.byteLength, 8192);
  var txt = '';
  try {
    txt = new TextDecoder('utf-8').decode(new Uint8Array(ab.slice(start, len)));
  } catch (e) {
    return '';
  }
  if (!/^\s*[\{\[]/.test(txt)) return '';
  try {
    var j = JSON.parse(txt);
    return j.msg || j.message || (j.result && j.result.msg) || '';
  } catch (e2) {
    return '';
  }
}

function _openFoodSalesTemplateDoc(filePath, fileType, onFailTryAlt) {
  wx.openDocument({
    filePath: filePath,
    fileType: fileType,
    showMenu: true,
    success: function () {
      wx.showToast({
        title: '模板已打开。若用 iPhone「Numbers」编辑，填完后请共享→Excel 导出 .xlsx，再上传该 xlsx',
        icon: 'none',
        duration: 4500,
      });
    },
    fail: function (err) {
      if (onFailTryAlt) {
        var alt = fileType === 'xlsx' ? 'xls' : 'xlsx';
        wx.openDocument({
          filePath: filePath,
          fileType: alt,
          showMenu: true,
          success: function () {
            wx.showToast({
              title: '模板已打开。Numbers 用户请导出为 .xlsx 再上传',
              icon: 'none',
              duration: 4000,
            });
          },
          fail: function () {
            console.error('openDocument', err);
            wx.showToast({ title: '无法用系统打开，请把文件发到电脑用 Excel 打开', icon: 'none', duration: 3500 });
          },
        });
      } else {
        console.error('openDocument', err);
        wx.showToast({ title: '打开文件失败', icon: 'none' });
      }
    },
  });
}

function _authHeader() {
  var header = {};
  var token = wx.getStorageSync('token');
  if (token) {
    header.Authorization = token;
  }
  return header;
}

function downloadFoodSalesSmartTemplate(apiBaseUrl, startDate, endDate, departmentId) {
  wx.showLoading({ title: '正在下载...', mask: true });
  var base = apiBaseUrl;
  var q =
    'startDate=' + encodeURIComponent(startDate) +
    '&endDate=' + encodeURIComponent(endDate) +
    '&departmentId=' + encodeURIComponent(String(departmentId));
  var url = base + 'ai/daily-revenue/download-food-sales-smart-template?' + q;
  var header = _authHeader();
  var fs = wx.getFileSystemManager();

  wx.downloadFile({
    url: url,
    header: header,
    success: function (res) {
      var sc = res.statusCode;
      if (sc !== undefined && sc !== null && sc !== 200) {
        wx.hideLoading();
        wx.showToast({ title: '下载失败(' + sc + ')', icon: 'none' });
        return;
      }
      var tmp = res.tempFilePath;
      if (!tmp) {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
        return;
      }
      fs.readFile({
        filePath: tmp,
        encoding: 'base64',
        success: function (readRes) {
          wx.hideLoading();
          var b64 = readRes.data;
          if (!b64) {
            wx.showToast({ title: '下载失败', icon: 'none' });
            return;
          }
          var ab;
          try {
            ab = typeof wx !== 'undefined' && wx.base64ToArrayBuffer ? wx.base64ToArrayBuffer(b64) : null;
          } catch (e) {
            console.error('base64ToArrayBuffer', e);
            ab = null;
          }
          if (!ab || !ab.byteLength) {
            _downloadFoodSalesTemplateFileByRequest(url, header);
            return;
          }
          _saveFoodSalesTemplateBuffer(ab, res.header || {});
        },
        fail: function (readErr) {
          wx.hideLoading();
          console.error('readFile template', readErr);
          _downloadFoodSalesTemplateFileByRequest(url, header);
        },
      });
    },
    fail: function (err) {
      wx.hideLoading();
      console.warn('downloadFile template, fallback request', err);
      _downloadFoodSalesTemplateFileByRequest(url, header);
    },
  });
}

function _downloadFoodSalesTemplateFileByRequest(url, header) {
  wx.showLoading({ title: '正在下载...', mask: true });
  wx.request({
    url: url,
    method: 'GET',
    header: header,
    responseType: 'arraybuffer',
    success: function (res) {
      wx.hideLoading();
      if (res.statusCode !== 200 || !res.data) {
        wx.showToast({ title: '下载失败(' + (res.statusCode || '?') + ')', icon: 'none' });
        return;
      }
      _saveFoodSalesTemplateBuffer(res.data, res.header || {});
    },
    fail: function (err) {
      wx.hideLoading();
      console.error('download template request', err);
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    },
  });
}

/**
 * 合并模板：菜品 Sheet + 日营业额 Sheet + 说明
 * GET /ai/daily-revenue/download-combined-template
 */
function downloadCombinedDailyTemplate(apiBaseUrl, startDate, endDate, departmentId) {
  wx.showLoading({ title: '正在下载...', mask: true });
  var base = apiBaseUrl;
  var q =
    'startDate=' + encodeURIComponent(startDate) +
    '&endDate=' + encodeURIComponent(endDate) +
    '&departmentId=' + encodeURIComponent(String(departmentId));
  var url = base + 'ai/daily-revenue/download-combined-template?' + q;
  var header = _authHeader();
  var fs = wx.getFileSystemManager();

  wx.downloadFile({
    url: url,
    header: header,
    success: function (res) {
      var sc = res.statusCode;
      if (sc !== undefined && sc !== null && sc !== 200) {
        wx.hideLoading();
        wx.showToast({ title: '下载失败(' + sc + ')', icon: 'none' });
        return;
      }
      var tmp = res.tempFilePath;
      if (!tmp) {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
        return;
      }
      fs.readFile({
        filePath: tmp,
        encoding: 'base64',
        success: function (readRes) {
          wx.hideLoading();
          var b64 = readRes.data;
          if (!b64) {
            wx.showToast({ title: '下载失败', icon: 'none' });
            return;
          }
          var ab;
          try {
            ab = typeof wx !== 'undefined' && wx.base64ToArrayBuffer ? wx.base64ToArrayBuffer(b64) : null;
          } catch (e) {
            console.error('base64ToArrayBuffer', e);
            ab = null;
          }
          if (!ab || !ab.byteLength) {
            _downloadFoodSalesTemplateFileByRequest(url, header);
            return;
          }
          _saveFoodSalesTemplateBuffer(ab, res.header || {});
        },
        fail: function (readErr) {
          wx.hideLoading();
          console.error('readFile template', readErr);
          _downloadFoodSalesTemplateFileByRequest(url, header);
        },
      });
    },
    fail: function (err) {
      wx.hideLoading();
      console.warn('downloadFile template, fallback request', err);
      _downloadFoodSalesTemplateFileByRequest(url, header);
    },
  });
}

module.exports = {
  downloadFoodSalesSmartTemplate: downloadFoodSalesSmartTemplate,
  downloadCombinedDailyTemplate: downloadCombinedDailyTemplate,
};
