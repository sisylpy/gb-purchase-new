/**
 * 转发至主包 services/aiChatApi.js。
 * 本子包页面继续使用 require('../../../services/api')；
 * 主包页面请使用 require('../../services/aiChatApi')（禁止主包 require 分包内模块）。
 */
module.exports = require('../../services/aiChatApi');
