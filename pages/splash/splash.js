/**
 * 开屏页 - 迁移自老项目 pages/splash/splash.js
 * 使用 CommonJS 统一模块规范
 */

var ENTRY_PAGE = '/pages/home/home';

Page({
  data: {
    show: { brand: false, l1: false, l2: false, ul: false, glint: false, s1: false, s2: false },
    autoNavigated: false
  },

  onLoad: function () {
    var seenAt = wx.getStorageSync('seenSplashV1') || 0;
    var now = Date.now();
    if (now - seenAt < 24 * 60 * 60 * 1000) {
      this.quickGo();
      return;
    }
  },

  onReady: function () {
    this.kickoff();
    this.startSpark();
  },

  kickoff: function () {
    var self = this;
    setTimeout(function () { self.setData({ 'show.brand': true }); }, 80);
    setTimeout(function () { self.setData({ 'show.l1': true }); }, 120);
    setTimeout(function () { self.setData({ 'show.l2': true }); }, 520);
    setTimeout(function () { self.setData({ 'show.ul': true }); }, 640);
    setTimeout(function () { self.setData({ 'show.glint': true }); }, 760);
    setTimeout(function () { self.setData({ 'show.s1': true }); }, 980);
    setTimeout(function () { self.setData({ 'show.s2': true }); }, 2000);
    setTimeout(function () { self.goHome(); }, 3000);
  },

  handleSkip: function () { this.goHome(); },

  goHome: function () {
    if (this.data.autoNavigated) return;
    this.setData({ autoNavigated: true });
    wx.setStorageSync('seenSplashV1', Date.now());
    wx.reLaunch({ url: ENTRY_PAGE });
  },

  quickGo: function () {
    this.setData({ autoNavigated: true });
    wx.reLaunch({ url: ENTRY_PAGE });
  },

  startSpark: function () {
    var self = this;
    var query = this.createSelectorQuery();
    query.select('#spark').fields({ node: true, size: true }).exec(function (res) {
      var canvas = res && res[0] && res[0].node;
      if (!canvas || !canvas.getContext) return;

      var dpr = wx.getSystemInfoSync().pixelRatio || 1;
      var ctx = canvas.getContext('2d');

      var width = res[0].width;
      var height = res[0].height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      var sparks = [];
      var maxSparks = 24;

      function spawn() {
        if (sparks.length >= maxSparks) return;
        sparks.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 1 + Math.random() * 2.2,
          life: 600 + Math.random() * 900,
          age: 0,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          hue: 175 + Math.random() * 20
        });
      }

      var last = Date.now();
      var animId;

      var loop = function () {
        var now = Date.now();
        var dt = now - last; last = now;

        ctx.clearRect(0, 0, width, height);

        var g = ctx.createRadialGradient(width * 0.7, height * 0.2, 10, width * 0.7, height * 0.2, Math.max(width, height) * 0.8);
        g.addColorStop(0, 'rgba(32,175,184,0.08)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        for (var i = sparks.length - 1; i >= 0; i--) {
          var s = sparks[i];
          s.age += dt;
          s.x += s.vx * dt * 0.06;
          s.y += s.vy * dt * 0.06;

          var t = s.age / s.life;
          var alpha = Math.max(0, 0.6 - t);
          if (alpha <= 0) { sparks.splice(i, 1); continue; }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * (1 + 0.5 * Math.sin(t * 6.28)), 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + s.hue + ', 60%, 55%, ' + alpha + ')';
          ctx.fill();
        }

        if (Math.random() < 0.4) spawn();

        animId = canvas.requestAnimationFrame(loop);
      };

      loop();
      setTimeout(function () { if (animId && canvas.cancelAnimationFrame) canvas.cancelAnimationFrame(animId); }, 3200);
    });
  }
});
