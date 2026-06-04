Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
    },
  },
  data: {},
  methods: {
    _itemEmoji: function(name) {
      if (!name) return '📦';
      var n = String(name).toLowerCase();
      if (n.indexOf('土豆') !== -1 || n.indexOf('马铃薯') !== -1) return '🥔';
      if (n.indexOf('生菜') !== -1 || n.indexOf('蔬菜') !== -1) return '🥬';
      if (n.indexOf('鸡蛋') !== -1 || n.indexOf('蛋') !== -1) return '🥚';
      if (n.indexOf('肉') !== -1) return '🥩';
      if (n.indexOf('鱼') !== -1) return '🐟';
      if (n.indexOf('鸡') !== -1) return '🍗';
      if (n.indexOf('油') !== -1) return '🫒';
      if (n.indexOf('米') !== -1 || n.indexOf('饭') !== -1) return '🍚';
      if (n.indexOf('面') !== -1 || n.indexOf('粉') !== -1) return '🍜';
      return '📦';
    },

    _itemIconClass: function(item) {
      if (!item) return '';
      if (item.status === 'ORDERED') return 'icon-ok';
      return 'icon-warn';
    },

    _orderedCount: function() {
      var d = this.data.cardData || {};
      var list = d.notOrderedItems || [];
      var c = 0;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].status === 'ORDERED') c++;
      }
      return c;
    },
  },
});
