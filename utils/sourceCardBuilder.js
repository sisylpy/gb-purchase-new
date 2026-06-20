/**
 * 从 source-card API / 公告 sourceCard 构建 businessCardRenderer 所需 cardData
 */
var cardNormalizer = require('./cardNormalizer');

function buildSourceCardData(cardType, sourceMeta, payload) {
  sourceMeta = sourceMeta || {};
  payload = payload || {};

  if (cardType === 'WAREHOUSE_INVENTORY_RISK_LIST_CARD') {
    var riskItems = payload.riskItems;
    if (!riskItems || !riskItems.length) {
      riskItems = [payload];
    }
    return {
      title: sourceMeta.cardTitle || '库存风险关注列表',
      subtitle: sourceMeta.cardSubtitle || '',
      payload: {
        riskItems: riskItems,
        summary: { narrative: sourceMeta.rawFactText || '' },
      },
    };
  }

  var resolved = cardNormalizer.resolveDisplayCard({
    cardType: cardType,
    title: sourceMeta.cardTitle || '',
    subtitle: sourceMeta.cardSubtitle || '',
    payload: payload,
  });
  return resolved ? resolved.cardData : payload;
}

/**
 * 从公告 note.sourceCard / cardSnapshotJson 提取渲染字段
 */
function parseAnnouncementSourceCard(note) {
  if (!note) return null;
  var sourceCard = note.sourceCard || null;
  if (!sourceCard && note.cardSnapshotJson) {
    try {
      var snap = typeof note.cardSnapshotJson === 'string'
        ? JSON.parse(note.cardSnapshotJson)
        : note.cardSnapshotJson;
      if (snap && snap.cardType) sourceCard = snap;
    } catch (e) {
      sourceCard = null;
    }
  }
  if (!sourceCard || !sourceCard.cardType) return null;
  return {
    cardType: sourceCard.cardType,
    payload: sourceCard.payload || sourceCard.cardPayload || {},
    title: sourceCard.title || sourceCard.cardTitle || '',
    subtitle: sourceCard.subtitle || sourceCard.cardSubtitle || '',
    sourceItemKey: sourceCard.sourceItemKey || '',
  };
}

module.exports = {
  buildSourceCardData: buildSourceCardData,
  parseAnnouncementSourceCard: parseAnnouncementSourceCard,
};
