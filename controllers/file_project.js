var axios = require('axios');
var qs = require('qs');

async function fileProjectPost(dataPersona,base64) {
   console.log("en servicio sube data")
    var axios = require('axios');
    var qs = require('qs');
    var data = qs.stringify({
     'uploadPersonDni': '1.111.111-1',
    'uploadPersonName': 'SISTEMA CARGA MASIVA',
    'name': 'LIQUIDACION-FISCA067-0-TEST',
    'type': '89',
    'mimeType': 'application/pdf',
    'dni': '9.259.110-7',
    'base64':base64
    });
    var config = {
      method: 'post',
      url: 'http://192.168.100.133:1338/api/1/file/create?',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'Cookie': 'sails.sid=s%3Aee6Dh3DiJW5znC1v0JdK6CZ2mhDAu9kU.ugFOC0Az%2BbYZdlcBFuaF3mxtzDCwvMuPt0timGMee5I'
      },
      data : data
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
     let response=  await axios(config)
     console.log(response.data)
     return response.data
      }catch(e){
       //console.log('execpcion error',e)
       console.log("execpcion data",e.response.data) 
       return e.response.data
  
      }

}


module.exports = {
    fileProjectPost
  }
  
  
  