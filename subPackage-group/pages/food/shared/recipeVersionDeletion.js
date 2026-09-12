var preparationApi = require('../../../../services/preparation');
var preparationUtil = require('../../../../utils/preparation');

var MIGRATION_CACHE_PREFIX = 'preparationFoodRecipeMigration:';

function showIncompleteResult() {
  wx.showModal({
    title: '删除尚未完成',
    content: '后端没有确认删除完成，页面保持原样，请稍后刷新查看。',
    showCancel: false,
  });
}

function confirmPreview(page, context, preview) {
  if (!preview || !preview.deletionPreviewToken) {
    wx.showToast({ title: '删除影响读取失败，请重试', icon: 'none' });
    return;
  }
  wx.showModal({
    title: '确认删除这份配方？',
    content: preparationUtil.deletionPreviewText(
      preview,
      page.data.foodItem && page.data.foodItem.dishName
    ),
    confirmText: '确认删除',
    confirmColor: '#d84d4d',
    success: function (result) {
      if (result.confirm) performDelete(page, context, preview);
    },
  });
}

function retryAfterConflict(page, context) {
  wx.showModal({
    title: '删除影响范围已变化',
    content: '这份配方的内容或使用安排刚被改动，需要按最新情况重新确认。',
    confirmText: '重新确认',
    success: function (result) {
      if (result.confirm) previewAndConfirm(page, context);
    },
  });
}

function performDelete(page, context, preview) {
  if (page.data[context.submittingField]) return Promise.resolve();
  if (!preview || !preview.deletionPreviewToken) {
    wx.showToast({ title: '删除影响已失效，请重新确认', icon: 'none' });
    return Promise.resolve();
  }

  var identity = context.getIdentity();
  page.setData((function () {
    var state = {};
    state[context.submittingField] = true;
    return state;
  })());
  context.showLoading('删除版本');

  return preparationApi.foodVersionAction(
    context.recipe.id,
    context.version.id,
    'delete',
    {
      distributerId: identity.distributerId,
      recipeRowVersion: Number(context.recipe.rowVersion || 0),
      versionRowVersion: Number(context.version.rowVersion || 0),
      operatorId: identity.operatorId,
      deletionReason: context.deletionReason,
      deletionPreviewToken: preview.deletionPreviewToken,
    }
  ).then(function (result) {
    context.hideLoading();
    var state = {};
    state[context.submittingField] = false;
    page.setData(state);
    if (String((result && result.operationStatus) || '') !== 'COMPLETED') {
      showIncompleteResult();
      return result;
    }
    wx.removeStorageSync(MIGRATION_CACHE_PREFIX + page.data.foodId);
    return Promise.resolve(context.onCompleted(result)).then(function () {
      return result;
    });
  }).catch(function (error) {
    context.hideLoading();
    var state = {};
    state[context.submittingField] = false;
    page.setData(state);
    if (Number(error && error.status) === 409) {
      retryAfterConflict(page, context);
      return;
    }
    preparationUtil.showError(error);
  });
}

function previewAndConfirm(page, context) {
  if (page.data[context.submittingField]) return Promise.resolve();
  if (!context.recipe || !context.recipe.id || !context.version || !context.version.id) {
    wx.showToast({ title: '配方版本信息不完整', icon: 'none' });
    return Promise.resolve();
  }

  var identity = context.getIdentity();
  context.showLoading('读取删除影响');
  return preparationApi.previewFoodVersionDeletion(context.recipe.id, context.version.id, {
    distributerId: identity.distributerId,
    recipeRowVersion: Number(context.recipe.rowVersion || 0),
    versionRowVersion: Number(context.version.rowVersion || 0),
    operatorId: identity.operatorId,
  }).then(function (preview) {
    context.hideLoading();
    confirmPreview(page, context, preview);
    return preview;
  }).catch(function (error) {
    context.hideLoading();
    preparationUtil.showError(error);
  });
}

module.exports = {
  previewAndConfirm: previewAndConfirm,
};
