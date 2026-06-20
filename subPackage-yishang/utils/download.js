/**
 * 下载管理器
 * Created by 全科 on 2018/1/27.
 */
/**
 * 下载保存一个文件
 */

 import apiUrl from '../config'

function downloadSaveFile(obj) {
  let that = this;
  let success = obj.success;
  let fail = obj.fail;
  let id = "";
  let url = obj.url;
  if (obj.id){
    id = obj.id;
  }else{
    id = url;
  }
  // console.info("%s 开始下载。。。", obj.url);
  wx.downloadFile({
    url: obj.url,
    success: function (res) {
      wx.saveFile({
        tempFilePath: res.tempFilePath,
        success: function (result) {
          result.id = id;
          if (success) {
            success(result);
          }
        },
        fail: function (e) {
          if (fail) {
            fail(e);
          }
        }
      })
    },
    fail: function (e) {
      if (fail) {
        fail(e);

      }
    }
    
  })
}
/**
 * 多文件下载并且保存，强制规定，必须所有文件下载成功才算返回成功
 */
function downloadSaveFiles(obj) {

  // var downUrl  = apiUrl.server + "/wx/downLoadNumber/"
  var downUrl = apiUrl.apiUrl + "gbDistributeruser/downLoadNumber/"
  
    let url0 = downUrl + 0;
    let url1 = downUrl + 1;
    let url2 = downUrl + 2;
    let url3 = downUrl + 3;
    let url4 = downUrl + 4;
    let url5 = downUrl + 5;
    let url6 = downUrl + 6;
    let url7 = downUrl + 7;
    let url8 = downUrl + 8;
    let url9 = downUrl + 9;

    let url10 = downUrl + "close";
    let url11 = downUrl + "delete";
    let url12 = downUrl + "finish";
    let url13 = downUrl + "dian";

    let url14 = downUrl + "lingdian";
    let url15 = downUrl + "next";
    let url16 = downUrl + "tishi";

  obj.urls = [
    url0, url1, url2, url3, url4, url5, url6, url7, url8, url9, url10,
    url11, url12, url13, url14, url15, url16];
  let success = obj.success; //下载成功
  let fail = obj.fail; //下载失败
  let urls = obj.urls; //下载地址 数组，支持多个 url下载 [url1,url2]
  // let savedFilePaths = new Map();
  var savedFilePaths = [];
  let urlsLength = urls.length; // 有几个url需要下载
  for (let i = 0; i < urlsLength; i++) {
    downloadSaveFile({
      url: urls[i],
      success: function (res) {
        console.dir(res);
        //一个文件下载保存成功
        let savedFilePath = res.savedFilePath; 

        // var id = res.id.substring(58, res.id.length)  
         
        var id = res.id.substring(downUrl.length, res.id.length)  
        var item = {
          id: id,
          filePath: savedFilePath
        }
        savedFilePaths.push(item);
        // console.info("savedFilePath:%s", savedFilePath);
        if (savedFilePaths.length == urlsLength) { //如果所有的url 才算成功
          if (success){
            success(savedFilePaths)
          }          
        }
      },
      fail: function (e) {
        console.info("下载语音失败");
        console.log(e);
        console.log("eeee")
        if (fail) {
          fail(e);
        }
      }
    })
  }
}
module.exports = {
  downloadSaveFiles: downloadSaveFiles
}

