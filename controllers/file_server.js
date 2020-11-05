
'use strict'
const constants = require('../config/systems_constants')
var FOLDER_PATH_FILES=constants.FOLDER_PATH_FILES
const fs = require('fs');
const Utils = require('../controllers/utils');
var mv = require('mv');


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


     function getDirDestinoProceso(proceso,mesProceso,empresa){
        
        proceso=proceso.toLowerCase()
         let nameProceso=''
        if (proceso=='liquidacion'){
            nameProceso='liquidaciones'
        }if (proceso=='reliquidacion'){
            nameProceso='reliquidaciones'
        }if (proceso=='previred'){
            nameProceso='certificados'
        } if (proceso=='liquidacioncobranzas'){
            nameProceso='liquidaciones-cobranzas'
        }

        //empresa no se utilizará de momento pero podrìa separse eventualmente carpetas por empresa

        let pathBase=getPathServerSobreLaboral() //revisa acceso a carpeta destino (carpeta compartida)
        if (!pathBase) return false //si no hay acceso a la carpeta se deberà entender como eerror
        
        let dirDestino=convertPath(pathBase+"\\"+(new Date().getFullYear())+"\\"+Utils.getMesName(mesProceso).toUpperCase()+"\\"+nameProceso) //path completo EJ \\192.168.100.69\sobrelaboral\Sistema_de_documentacion_laboral\2020\AGOSTO\LIQUIDACIONES\
        console.log("dirDestino",dirDestino)
        return dirDestino
     }

     function backupFiles(oldPath,empresa){

        //metodo de respaldo
        //si ya existe la carpeta del mes y proceso esta se manda a carpeta respaldo del mes correspondiente
        //la carpeta fuente quedara vacia y se volveran a generar los archivos
        //empresa se utiliza ya que viene todo en una sola carpeta, hay que separarlo por la expresion regular 
      
        //oldPath=FileServer.getDirDestinoProceso('liquidaciones','2020-11-01',null)
        //entrada es la carpeta donde esta actualmente
        //considerar todos los paths sin slash al final
      //FOLDER_PATH_FILES:{linux:'/mnt/win_share',windows:'\\\\192.168.100.69\\sobrelaboral\\Sistema_de_documentacion_laboral'}
      
      //  oldPath='\\\\192.168.100.69\\sobrelaboral\\Sistema_de_documentacion_laboral\\2020\\OCTUBRE\\liquidaciones\\OUTSOURCING'
        //newPath='\\\\192.168.100.69\\sobrelaboral\\Sistema_de_documentacion_laboral\\2020\\OCTUBRE\\liquidaciones\\test'
        
        let pathBase=getPathServerSobreLaboral()
        //se extrae el pathbase y se le añade el nombre de la carpeta destino "RESPALDO" junto a la misma ruta de cargpetas
       let newPath=oldPath.split(pathBase)
      
        newPath=pathBase+'\\RESPALDO'+newPath[1]
       
      
        //let oldPath = 'old/path/file.txt'
        //let newPath = 'new/path/file.txt'
      
         let fechaHoraString=Utils.getDateFormat() 
         newPath=newPath+"\\"+"["+empresa+"]"+fechaHoraString
        //normalizar paths antes de consultar directorios
         oldPath=convertPath(oldPath)
        newPath=convertPath(newPath)

         let files=[]
         try{
           console.log("oldPath",oldPath)
           console.log("new path",newPath)
      
      
              //filtro de empresa
         files=fs.readdirSync(oldPath).filter(file=>file.includes("["+empresa+"]"))
          //filtro de tipo de archivo  
         files=files.filter(file=>/\.pdf$/.test(file))
       
         console.log("holaa")
       }catch(e){
         console.log(e)
       }
         
        //si no existe la carpeta respaldo y hay la carpeta fuente contiene archivos
        if (!fs.existsSync(newPath)&&files.length>0){
    
          fs.mkdirSync(newPath,{recursive:true});
          console.log("no existe carpeta, creada la carpeta de respaldo mes")
      
          console.log(" se respaldaran los archivos en la carpeta",newPath)
        
       //files rename no permite hacerlo entre particiones o distintos sistemas de archivos, es por ello que se reemplazó por mv Error: EXDEV: cross-device link not permitted, rename
          //   files.forEach(file=>{
        //    fs.renameSync(oldPath+"\\"+file,newPath+'\\'+file)
      
        //  })
     
        for (var i = files.length - 1; i >= 0; i--) {
          console.log("empezando mover archivos")
          var file = files[i];
    //      mv((oldPath+"\\"+file).replace(/\\/g, "/"), (newPath+'\\'+file).replace(/\\/g, "/"), function(err) {
      mv(convertPath(oldPath+"\\"+file), convertPath(newPath+'\\'+file), function(err) {       
    console.log("empezando mover archivos2")
              if (err) throw err;
             
          });
      }
     
  
          console.log("termino")
        
        }
      
      }


    function convertPath(path){
     // console.log("viendo path",path)
      if (path.includes("\\\\")){
      path=  path.replace(/\//g, '\\');
        
      //  console.log("el path es windows")
      }else{
        //path linux
        path=  path.replace(/\\/g, "/");
      //  console.log("el path es linux")
      }
     // console.log("nuevo path",path)
     return path

    }

     module.exports={getPathServerSobreLaboral,getDirDestinoProceso,backupFiles,convertPath}