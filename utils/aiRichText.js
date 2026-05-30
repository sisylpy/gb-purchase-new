/**
 * 将 DeepSeek / 通用 AI 返回的轻量 Markdown 转为 rich-text 可用的 HTML。
 *
 * 说明：
 * - 微信小程序 rich-text 的 nodes 传入 HTML 字符串需基础库 2.19+；不适配时表现为纯文本风险较低。
 * - 仅做「适合经营类长文」的子集：**加粗**、换行、去掉行首 # 标记；不解析表格/代码块（避免渲染差异）。
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 去掉流式/JSON 拼接产生的边缘引号（含 """、""、JSON.parse 可剥的多层包裹）
 */
function stripStreamingQuoteArtifacts(raw) {
  var t = String(raw == null ? '' : raw).replace(/^\uFEFF/, '');
  var guard = 0;
  while (guard < 16) {
    guard++;
    var u = t.trim();
    if (!u) {
      return '';
    }
    var next = u;
    if (u.length >= 6 && u.slice(0, 3) === '"""' && u.slice(-3) === '"""') {
      next = u.slice(3, -3);
    } else if (u.length >= 3 && u.slice(0, 3) === '"""') {
      next = u.slice(3);
    } else if (u.length >= 3 && u.slice(-3) === '"""') {
      next = u.slice(0, -3);
    } else if (u.length >= 4 && u.slice(0, 2) === '""' && u.slice(-2) === '""') {
      next = u.slice(2, -2);
    } else if (u.length >= 2 && u.charAt(0) === '"' && u.charAt(u.length - 1) === '"') {
      try {
        var parsed = JSON.parse(u);
        if (typeof parsed === 'string') {
          next = parsed;
        } else {
          break;
        }
      } catch (e) {
        next = u
          .slice(1, -1)
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    } else {
      break;
    }
    if (next === u) {
      break;
    }
    t = next;
  }
  return t
    .trim()
    .replace(/^"+/, '')
    .replace(/"+$/, '')
    .trim();
}

/**
 * @param {string} raw 原始 gbAiMessageContent
 * @returns {string} 供 <rich-text nodes="{{html}}" /> 使用的 HTML
 */
function markdownToRichHtml(raw) {
  try {
    var text = stripStreamingQuoteArtifacts(raw);
    if (!text || !text.trim()) {
      return '';
    }
    text = text.replace(/^#{1,4}\s?/gm, '');
    var parts = text.split('**');
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      var esc = escapeHtml(parts[i]);
      esc = esc.replace(/\n/g, '<br/>');
      if (i % 2 === 1) {
        out +=
          '<strong style="font-weight:600;color:#1f1f1f;">' + esc + '</strong>';
      } else {
        out += esc;
      }
    }
    return (
      '<div style="font-size:16px;line-height:1.65;color:#1f1f1f;word-break:break-word;">' +
      out +
      '</div>'
    );
  } catch (e) {
    var plain = escapeHtml(stripStreamingQuoteArtifacts(raw)).replace(/\n/g, '<br/>');
    if (!plain || !String(plain).trim()) {
      return '';
    }
    return (
      '<div style="font-size:16px;line-height:1.65;color:#1f1f1f;word-break:break-word;">' +
      plain +
      '</div>'
    );
  }
}

/**
 * 无 rich-text 需求时去掉 **，仅作兜底（当前页面对用户气泡仍用纯文本）。
 */
function stripMarkdownBold(raw) {
  return String(raw == null ? '' : raw).replace(/\*\*([^*]+)\*\*/g, '$1');
}

module.exports = {
  markdownToRichHtml: markdownToRichHtml,
  stripMarkdownBold: stripMarkdownBold,
  stripStreamingQuoteArtifacts: stripStreamingQuoteArtifacts,
};
