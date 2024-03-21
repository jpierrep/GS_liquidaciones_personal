var axios = require('axios');
var qs = require('qs');

async function fileProjectPost(processInfo,dataPersona, base64) {
  console.log("en servicio sube data",dataPersona.RUT,dataPersona.FICHA)
  //  console.log("persona", dataPersona)
  var axios = require('axios');
  var qs = require('qs');
  var data = qs.stringify({
    'uploadPersonDni': '11.111.111-1',
    'uploadPersonName': 'SISTEMA CARGA MASIVA',
    'name': processInfo.name+'-' + dataPersona.FICHA+'.pdf',
    'type': processInfo.type,
    'mimeType': 'application/pdf',
    'dni': parseInt(dataPersona.RUT.split('.')[0]).toString() + '.' + dataPersona.RUT.split('.')[1] + '.' + dataPersona.RUT.split('.')[2],
    'code': dataPersona.FICHA,
    'base64': base64,
    'month':processInfo.monthInsacom,
    'year':processInfo.yearInsacom,
    //'referencialDate':processInfo.referencialDate,

  });
  //console.log(data)
 // url: 'http://192.168.100.130:1338/api/1/file/create?', prod
 // url: 'http://192.168.100.133:1338/api/1/file/create?', test
  var config = {
    method: 'post',
   
     url: 'http://192.168.100.130:1338/api/1/file/create?',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'sails.sid=s%3Aee6Dh3DiJW5znC1v0JdK6CZ2mhDAu9kU.ugFOC0Az%2BbYZdlcBFuaF3mxtzDCwvMuPt0timGMee5I'
    },
    data: data
  };




  /*
  axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
  
   */
  try {
    let response = await axios(config)
    console.log(response.data)
    return response.data
  } catch (e) {
    //console.log('execpcion error',e)
    console.log("execpcion data", e.response.data)
    return e.response.data

  }

}


async function fileProjectPlantPost(processInfo,dataPersona, base64) {
  console.log("en servicio sube data")
  //  console.log("persona", dataPersona)
  var axios = require('axios');
  var qs = require('qs');
  var data = qs.stringify({
    'uploadPersonDni': '11.111.111-1',
    'uploadPersonName': 'SISTEMA CARGA MASIVA',
    'name': processInfo.name+'-' + dataPersona.FICHA+'.pdf',
    'type': processInfo.type,
    'mimeType': 'application/pdf',
    'dni': parseInt(dataPersona.RUT.split('.')[0]).toString() + '.' + dataPersona.RUT.split('.')[1] + '.' + dataPersona.RUT.split('.')[2],
    'code': dataPersona.FICHA,
    'base64': base64,
    'month':processInfo.monthInsacom,
    'year':processInfo.yearInsacom,
    //'referencialDate':processInfo.referencialDate,

  });
  //console.log(data)
 // url: 'http://192.168.100.130:1338/api/1/file/create?', prod
 // url: 'http://192.168.100.133:1338/api/1/file/create?', test
  var config = {
    method: 'post',
   
     url: 'http://192.168.100.130:1338/api/1/file/create?',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'sails.sid=s%3Aee6Dh3DiJW5znC1v0JdK6CZ2mhDAu9kU.ugFOC0Az%2BbYZdlcBFuaF3mxtzDCwvMuPt0timGMee5I'
    },
    data: data
  };




  /*
  axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
  
   */
  try {
    let response = await axios(config)
    console.log(response.data)
    return response.data
  } catch (e) {
    //console.log('execpcion error',e)
    console.log("execpcion data", e.response.data)
    return e.response.data

  }

}

module.exports = {
  fileProjectPost,fileProjectPlantPost
}


