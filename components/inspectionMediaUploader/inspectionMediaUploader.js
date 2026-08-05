var api = require('../../services/franchiseInspection');
var util = require('../../utils/franchiseInspection');

function normalizeIncoming(value) {
  return (value || []).map(function (row) {
    var interrupted = row.uploadStatus === 'uploading' && !row.mediaAssetId;
    return Object.assign({
      localKey: row.localKey || (row.mediaAssetId ? 'asset-' + row.mediaAssetId : util.createKey('media')),
      uploadStatus: row.status === 'READY' ? 'ready' : (interrupted ? 'failed' : (row.uploadStatus || 'ready')),
      uploadError: interrupted ? '上传已中断，请点击重试' : (row.uploadError || ''),
      progress: row.status === 'READY' ? 100 : Number(row.progress || 0),
    }, row, interrupted ? { uploadStatus: 'failed', uploadError: '上传已中断，请点击重试' } : {});
  });
}

function findFileIndex(files, localKey) {
  return (files || []).findIndex(function (row) { return row.localKey === localKey; });
}

Component({
  properties: {
    storeId: { type: Number, value: 0 },
    businessType: { type: String, value: '' },
    businessId: { type: Number, value: 0 },
    mediaStage: { type: String, value: '' },
    value: { type: Array, value: [] },
    editable: { type: Boolean, value: true },
    max: { type: Number, value: 9 },
  },

  data: { files: [] },

  observers: {
    value: function (value) {
      if (this.settingInternally) return;
      var files = normalizeIncoming(value);
      this.setData({ files: files });
      this.loadThumbnails();
    },
  },

  lifetimes: {
    attached: function () {
      this.componentDetached = false;
      this.uploadTasks = {};
      var files = normalizeIncoming(this.data.value);
      this.setData({ files: files });
      this.loadThumbnails();
      this.emitChange();
    },
    detached: function () {
      this.componentDetached = true;
      Object.keys(this.uploadTasks || {}).forEach(function (key) {
        var task = this.uploadTasks[key];
        if (task && typeof task.abort === 'function') task.abort();
      }, this);
    },
  },

  methods: {
    loadThumbnails: function () {
      var that = this;
      (this.data.files || []).forEach(function (file) {
        if (!file.mediaAssetId || file.thumbPath || file.thumbnailLoading || file.uploadStatus !== 'ready') return;
        var localKey = file.localKey;
        var startIndex = findFileIndex(that.data.files, localKey);
        if (startIndex < 0) return;
        that.setData({ ['files[' + startIndex + '].thumbnailLoading']: true });
        api.downloadMedia(file, false).then(function (path) {
          var index = findFileIndex(that.data.files, localKey);
          if (index < 0) return;
          that.setData({
            ['files[' + index + '].thumbPath']: path,
            ['files[' + index + '].thumbError']: '',
            ['files[' + index + '].thumbnailLoading']: false,
          });
          that.emitChange();
        }).catch(function () {
          var index = findFileIndex(that.data.files, localKey);
          if (index < 0) return;
          that.setData({
            ['files[' + index + '].thumbError']: '缩略图加载失败，点击可重试',
            ['files[' + index + '].thumbnailLoading']: false,
          });
        });
      });
    },

    chooseMedia: function () {
      if (!this.data.editable || !this.data.businessId || !this.data.storeId) {
        wx.showToast({ title: '请先保存业务草稿再添加照片', icon: 'none' });
        return;
      }
      var remaining = Math.max(0, Number(this.data.max) - this.data.files.length);
      if (!remaining) {
        wx.showToast({ title: '最多上传 ' + this.data.max + ' 张照片', icon: 'none' });
        return;
      }
      var that = this;
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['camera', 'album'],
        sizeType: ['original', 'compressed'],
        success: function (result) {
          (result.tempFiles || []).forEach(function (temp) {
            var localKey = util.createKey('media');
            var files = that.data.files.concat([{
              localKey: localKey,
              localPath: temp.tempFilePath,
              thumbPath: temp.tempFilePath,
              fileSize: temp.size,
              uploadStatus: 'uploading',
              progress: 0,
            }]);
            that.setData({ files: files });
            that.emitChange();
            that.uploadOne(files.length - 1);
          });
        },
      });
    },

    uploadOne: function (index) {
      var that = this;
      var file = this.data.files[index];
      if (!file || !file.localPath) return;
      var localKey = file.localKey;
      this.setData({
        ['files[' + index + '].uploadStatus']: 'uploading',
        ['files[' + index + '].uploadError']: '',
        ['files[' + index + '].progress']: 0,
      });
      this.emitChange();
      var operation = api.uploadMedia({
        storeId: this.data.storeId,
        businessType: this.data.businessType,
        businessId: this.data.businessId,
        mediaStage: this.data.mediaStage,
        filePath: file.localPath,
      }, function (progress) {
        var currentIndex = findFileIndex(that.data.files, localKey);
        if (currentIndex >= 0) that.setData({ ['files[' + currentIndex + '].progress']: progress });
      });
      this.uploadTasks[file.localKey] = operation.task();
      operation.promise.then(function (asset) {
        delete that.uploadTasks[file.localKey];
        if (that.componentDetached) return;
        var currentIndex = findFileIndex(that.data.files, localKey);
        if (currentIndex < 0) return;
        var ready = Object.assign({}, file, asset, {
          uploadStatus: 'ready',
          progress: 100,
          uploadError: '',
        });
        that.setData({ ['files[' + currentIndex + ']']: ready });
        that.emitChange();
      }).catch(function (error) {
        delete that.uploadTasks[file.localKey];
        if (that.componentDetached) return;
        var currentIndex = findFileIndex(that.data.files, localKey);
        if (currentIndex < 0) return;
        that.setData({
          ['files[' + currentIndex + '].uploadStatus']: 'failed',
          ['files[' + currentIndex + '].uploadError']: error.message || '上传失败，请重试',
          ['files[' + currentIndex + '].uploadErrorStatus']: Number(error.status || 0),
          ['files[' + currentIndex + '].uploadErrorCode']: error.errorCode || '',
        });
        that.emitChange();
      });
    },

    retry: function (event) {
      var index = Number(event.currentTarget.dataset.index);
      var file = this.data.files[index];
      var needsLogin = file && (Number(file.uploadErrorStatus) === 401 ||
        ['AUTH_REQUIRED', 'TOKEN_INVALID', 'TOKEN_EXPIRED'].indexOf(file.uploadErrorCode) >= 0);
      var that = this;
      (needsLogin ? api.ensureToken(true) : Promise.resolve()).then(function () {
        that.uploadOne(index);
      }).catch(function (error) { util.showError(error); });
    },

    remove: function (event) {
      var index = Number(event.currentTarget.dataset.index);
      var file = this.data.files[index];
      var that = this;
      util.confirm('删除照片', file.mediaAssetId ? '照片将由后台正式作废，是否继续？' : '是否移除这张未上传照片？')
        .then(function (confirmed) {
          if (!confirmed) return;
          var action = file.mediaAssetId ? api.voidMedia(file.mediaAssetId, file.rowVersion) : Promise.resolve();
          action.then(function () {
            var files = that.data.files.slice();
            files.splice(index, 1);
            that.setData({ files: files });
            that.emitChange();
          }).catch(function (error) { util.showError(error); });
        });
    },

    move: function (event) {
      var index = Number(event.currentTarget.dataset.index);
      var direction = Number(event.currentTarget.dataset.direction);
      var target = index + direction;
      if (target < 0 || target >= this.data.files.length) return;
      var files = this.data.files.slice();
      var row = files[index];
      files[index] = files[target];
      files[target] = row;
      this.setData({ files: files });
      this.emitChange();
    },

    preview: function (event) {
      var index = Number(event.currentTarget.dataset.index);
      var file = this.data.files[index];
      if (!file) return;
      if (!file.mediaAssetId) {
        if (file.localPath) wx.previewImage({ urls: [file.localPath], current: file.localPath });
        return;
      }
      wx.showLoading({ title: '加载原图' });
      api.downloadMedia(file, true).then(function (path) {
        wx.hideLoading();
        wx.previewImage({ urls: [path], current: path });
      }).catch(function (error) {
        wx.hideLoading();
        util.showError(error);
      });
    },

    reloadThumbnail: function (event) {
      var index = Number(event.currentTarget.dataset.index);
      this.setData({
        ['files[' + index + '].thumbError']: '',
        ['files[' + index + '].thumbnailLoading']: false,
      });
      this.loadThumbnails();
    },

    emitChange: function () {
      var files = this.data.files.slice();
      var ids = [];
      var uploading = false;
      files.forEach(function (file) {
        if (file.uploadStatus === 'uploading') uploading = true;
        if (file.uploadStatus === 'ready' && file.status === 'READY' && file.mediaAssetId) ids.push(file.mediaAssetId);
      });
      this.settingInternally = true;
      this.triggerEvent('change', { files: files, mediaAssetIds: ids, uploading: uploading });
      this.settingInternally = false;
    },
  },
});
