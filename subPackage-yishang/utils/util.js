

function getBillTradeNo(disId) {
  var areaCode = "1";

  var  random =  Number(Math.random());
  var checkCode = random*9000
				checkCode +=1000;

  return areaCode + disId + parseInt(checkCode);
}


let getQueryString = function (url, name) {
  console.log("url = " + url)
  console.log("name = " + name)
  var reg = new RegExp('(^|&|/?)' + name + '=([^&|/?]*)(&|/?|$)', 'i')
  var r = url.substr(1).match(reg)
  if (r != null) {
    console.log("r = " + r)
    console.log("r[2] = " + r[2])
    return r[2]
  }
  return null;
}
module.exports = {
  getBillTradeNo: getBillTradeNo,
  getQueryString: getQueryString,

}
