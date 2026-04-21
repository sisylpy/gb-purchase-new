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
 * @param {string} raw 原始 gbAiMessageContent
 * @returns {string} 供 <rich-text nodes="{{html}}" /> 使用的 HTML
 */
function markdownToRichHtml(raw) {
  try {
    var text = String(raw == null ? '' : raw);
    if (!text) {
      return '<div style="font-size:16px;line-height:1.65;color:#1f1f1f;"></div>';
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
    var plain = escapeHtml(String(raw == null ? '' : raw)).replace(/\n/g, '<br/>');
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
};
