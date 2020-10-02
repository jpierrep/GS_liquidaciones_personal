
'use strict'
const constants = require('../config/systems_constants')
var FOLDER_PATH_FILES=constants.FOLDER_PATH_FILES
const fs = require('fs');


function getPathServerSobreLaboral(){
    //  FOLDER_PATH_FILES:{linux:'/mnt/win_share',windows:'\\\\192.168.100.69\\sobrelaboral\\Sistema_de_documentacion_laboral'}
     
    
        if(fs.existsSync(FOLDER_PATH_FILES.linux)){
        
        console.log("probando ruta linux, existe ruta linux")
       
      
       return FOLDER_PATH_FILES.linux
        }
      else if( fs.existsSync(FOLDER_PATH_FILES.windows)){
        console.log("probando ruta windows, existe ruta windows")
        return FOLDER_PATH_FILES.windows
     }else{
      console.log("no existen paths disponibles",FOLDER_PATH_FILES)
          return false
        
      }
    
     }

     module.exports={getPathServerSobreLaboral}