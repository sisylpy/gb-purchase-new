/**
 * 分销商支付（流量/定制套餐等）
 * payPage 等页面使用
 */
import apiUrl from '../../config/index.js';
var load = require('../../lib/load.js');

export const gbDisBuyUser = function (data) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpay/gbDisBuyUser',
      method: 'POST',
      data: {
        disId: data.disId,
        openId: data.openId,
        subtotal: data.subtotal,
        quantity: data.quantity,
        type: data.type,
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const gbDisGetBuyType = function (data) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpay/gbDisGetBuyType',
      method: 'POST',
      data: {
        disId: data.disId,
        type: data.type,
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

/**
 * 定制等多笔合并支付
 * @param {Array|Object} data 请求体（与后端约定一致）
 */
export const buyMachines = function (data) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpay/buyMachines',
      method: 'POST',
      data: data,
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

/**
 * 领取流量积分/礼物点数
 */
export const addPoints = function (data) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpaylist/addPoints',
      method: 'POST',
      data: {
        disId: data.disId,
        points: data.points,
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        });
      },
    });
  });
};

/**
 * 分销商待支付 / 支付记录列表
 */
export const disGetPayList = function (data) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpay/disGetPayList',
      method: 'POST',
      data: {
        disId: data.disId,
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        });
      },
    });
  });
};

/**
 * 待支付订单发起支付
 */
export const disPayUser = function (data) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpay/disPayUser',
      method: 'POST',
      data: {
        payId: data.payId,
        openId: data.openId,
        subtotal: data.subtotal,
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
        load.hideLoading();
      },
    });
  });
};
