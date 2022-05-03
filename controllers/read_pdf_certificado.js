'use strict'

    /**
    * Métodos para la generación de archivos pdf Previred
    * @module /controllers/read_pdf_certificado
    */
var express = require('express');
var router = express.Router();
var sql = require("mssql");
//https://www.xpdfreader.com/about.html driver
//https://www.npmjs.com/package/pdf-to-text
//https://www.npmjs.com/package/pdf-extract
//https://stackoverflow.com/questions/33039152/split-pdf-in-separate-file-in-javascript
var pdfUtil = require('pdf-to-text');
var exec = require('child_process').exec
const constants = require('../config/systems_constants')
const FileServer = require('../controllers/file_server');
const Utils = require('../controllers/utils');
var sql = require('../config/connections')
var fs = require('fs');
var formidable = require('formidable');
var utils = require('./utils')
let data=require('../data.json')
const io = require('../index');
var inProgress = 0
var ProcessTotal = 0
var ProcessActual = 0
var sequelizeMssql = require('../config/connection_mssql')
var SoftlandController = require('../controllers/softland');


let empresa = 0
let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa).BD_SOFTLAND





//var pdf_path = "C:\\Users\\jean\\Documents\\NodeProjects\\PDFTest.pdf";
//var pdf_path = "holaPDF.pdf";

//rut a no considerarse pues son de la empresa
var rutsFiltrar = ['79.960.660-7','76.924.640-1']

var pdf_path = "CotizacionesPersonal.pdf";
var pdf_name = "CotizacionesPersonal.pdf"
var path_output_base = "pdfFiles/"
//var regex="\d{1,2}\.\d{3}\.\d{3}[\-][0-9kK]{1}"
//identificador g devuelve array con todos los emparejamientos
//identificador i devuelve array con informacion de los emparejamientos
var regex = /\d{1,2}\.\d{3}\.\d{3}[\-][0-9kK]{1}/g

/*GET home page.*/


var StatusPreviredTemplate = {

  isExecuting: false,
  percent: 0,
  msgs: []
}

var StatusPrevired = JSON.parse(JSON.stringify(StatusPreviredTemplate))

/** 
 * Funcion del socket
 * @constructor
 * @param {socket} socket - El directorio local donde se subió el archivo pdf necesario para el proces.

*/

io.on('connection', (socket) => {


socket.emit('getStatusPrevired', StatusPrevired)

socket.on('getTest', async (uploadFileName) => {
})

  socket.on('getPrevired', async (uploadFileName,empresa,mes) => {

    //data trae la info del mes y la empresa del proceso
    console.log("se empieza a ejecutar proceso Previred: " + uploadFileName+" "+empresa+" "+mes)

  
    StatusPrevired = JSON.parse(JSON.stringify(StatusPreviredTemplate))
    StatusPrevired.isExecuting = true
    StatusPrevired.userParams={mes:mes,empresa:empresa}
   // StatusPrevired.userParams={mes:dataUser["mes"],empresa:dataUser["empresa"]}

    io.emit('getStatusPrevired', StatusPrevired)
    await getPrevired(uploadFileName,empresa,mes)
    StatusPrevired.isExecuting = 0
    io.emit('getStatusPrevired', StatusPrevired)

  });






/** 
 * Funcion principal que ejecuta el proceso una vez se llama desde el front y ya se encuentra cargado el archivo previred
 * @async 
 * @function getPrevired
 * @param {string} uploadFileName - El directorio local donde se subió el archivo pdf necesario para el proces.
 * @param {integer} empresa - el id de la empresa.
 * @param {string} mes - mes del proceso formato yyy-mm-dd ej. 2020-10-01.
 * @return {Promise} .
*/
   async function getPrevired(uploadFileName,empresa,mes){
	console.log("comienza el proceso previred",empresa,mes)

	var startTime = new Date();

	let pathLogs = 'data-logs/'
  let nameLogFile='previred'
//////
  let dirDestino=FileServer.getDirDestinoProceso('previred',mes,empresa)
  if (!dirDestino){
    socket.emit('getGlobalAlert', {messaje:"Error, no hay acceso a carpeta de sobre laboral",type:'error'})
    return
  }

        // crea carpeta del mes en destino, si no existe 
        if (!fs.existsSync(dirDestino)){
    
          fs.mkdirSync(dirDestino,{recursive:true});
          console.log("no existe carpeta, creada la carpeta del mes")
      }else{
        console.log("existe la carpeta, se debe respaldar el contenido ")
    
       FileServer.backupFiles(dirDestino,empresa)
   
    
      }





  fs.copyFileSync(uploadFileName, 'respaldo_file_uploads/' + getCompleteFormatDate()+".pdf")
   console.log("archivo copiado para respaldo") 

//	let empresa = dataUser["empresa"]

	
  //get ubicaciones del archivo, etc.

  let rutsEncontrados

    try {
			console.log("EEEEE")
		//	let uploadFileName='C:/Users/jpierre/Documents/NodeProjects/liquidaciones-sueldo/api-server/CotizacionesPersonal.pdf'
			rutsEncontrados = await getRutsOfFile(uploadFileName,empresa)
			
	let tablaMapPersonas = (await generaMapPersonas(rutsEncontrados, empresa,mes))//.slice(0,5)  //para control de cantidad de la cantidad de archivos que se generaran ***********

	if (tablaMapPersonas.length > 0) {

	  
		let dataValidar= await generaFiles(tablaMapPersonas, empresa,uploadFileName,dirDestino)
		console.log("termina genera Files")
		
  //efectua validacion
 let statusValidacion = "OK"
 // para calular la demora se contrasta con startTime
 var endTime = new Date();
 var demoraSeconds = parseInt((endTime.getTime() - startTime.getTime()) / 1000);

 tablaMapPersonas.forEach(persona => {
	let existe = dataValidar.find(x => x.ficha == persona.ficha)
	if (!existe) {
		console.log("error en la persona", persona)
		statusValidacion = "ERR"
	}
	else existe["status"] = 'OK'


	return
})



  //guarda logs de las validaciones


   let completeFormatDate=getCompleteFormatDate()
	//path +validacion (OK,ERR)+proceso(Liq,reliq)+empresa(0,1,2), fecha (yyy-mm-dd-hh-mm-ss), tiempo demora (s)
	fs.appendFileSync(pathLogs + statusValidacion + "-" + nameLogFile + "-" + empresa + "-" +completeFormatDate+ "-" + demoraSeconds + ".txt", JSON.stringify(dataValidar));
  
  console.log("todos las validaciones hechas")
   //una vez terminado eliminamos el archivo 
   fs.unlinkSync(uploadFileName)
   console.log("archivo eliminado")

   console.log("Proceso concluido")
	
   io.emit('getGlobalAlert', {messaje:"Proceso concluido exitosamente",type:'success'})
 
	} else {
		console.log("no tiene ruts")

	}

} catch (e) {
	console.log("no tiene formato", e)

}

}

function getCompleteFormatDate(){
  var m = new Date();
	let formatDate = (m.getFullYear() > 9 ? m.getFullYear() : '0' + m.getFullYear()) + "-" + ((m.getMonth() + 1) > 9 ? (m.getMonth() + 1) : '0' + (m.getMonth() + 1)) + "-" + (m.getDate() > 9 ? m.getDate() : '0' + m.getDate())
 
	let formatHour = (m.getHours() > 9 ? m.getHours() : '0' + m.getHours()) + "-" + (m.getMinutes() > 9 ? m.getMinutes() : '0' + m.getMinutes()) + "-" + (m.getSeconds() > 9 ? m.getSeconds() : '0' + m.getSeconds())
return  formatDate + "-" + formatHour 
}




/*
router.get('/cargarArchivoPrevired/', async function (req, res, next) {
  if (req.query.valid){
      let mensaje=req.query.valid
      if (mensaje='OK') 
    res.render('index', { title: 'Compilación Archivos Previred', errormessage:"Proceso concluido correctamente"});
  }else{
  console.log("acaaaaa")
  //res.render('index', { title: 'Compilación Archivos Previred',inProgress:inProgress,progressActual:ProcessActual,processTotal:ProcessTotal});
  res.render('index', { title: 'Compilación Archivos Previred', errormessage: '' });
  }
})

*/





/** 
 * Funcion que devuelve map de ruts encontrados y el núm de página, junto a  su correspondiente información en erp (ficha, centro costo), con ello luego se hará la separación página, persona, centro costo.
 * @async
 * @function generaMapPersonas
 * @param {string[]} rutsEncontrados - Listado de ruts encontrados
 * @param {integer} empresa - el id de la empresa.
  * @param {string} mes - mes del proceso formato yyy-mm-dd ej. 2020-10-01.
 * @return {Promise.<Object[]>} - datos del mapeo persona, centro costo del archivo, num. de página.
*/
async function generaMapPersonas(rutsEncontrados, empresa,mes) {

  return new Promise(async (resolve, reject) => {
    let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa).BD_SOFTLAND

    //añadir marcador de inprogress
    inProgress = 1
    ProcessTotal = rutsEncontrados.length
   // var personalVigente =require('../data.json')

  

   var personalVigente =(await SoftlandController.getFichasVigentes(mes,empresa))
   // let jsonDataString=JSON.stringify(personalVigente);
  //  fs.writeFileSync('./data.json',jsonDataString) 


    //option to extract text from page 0 to 10
    var option = null
    //var option = {from: 0, to: 19};



    var filePath = '';
    var fileName = 'personalNoExiste.log';
    var filePathName = filePath + fileName
    if (fs.existsSync(filePathName)) {
      fs.unlinkSync(filePathName);
      console.log("se elimino el archivo log")
    }


    //segun los ruts incluidos en el archivo (ruts encontrados armar json) encontrar todas las fichas activas asociada al rut 
    //y con ellas los centros costo correspondientes
    let tablaMapPersonas = [
      { RUT: '8.849.245-5', PAGINA: 1, FICHA: 'ASDAS12', CENCO2_CODI: '027-001' },
      { RUT: '8.849.245-6', PAGINA: 4, FICHA: 'ASDAS12', CENCO2_CODI: '027-001' },
      { RUT: '8.849.245-5', PAGINA: 15, FICHA: 'ASDAS12', CENCO2_CODI: '027-001' },
      { RUT: '8.849.245-5', PAGINA: 7, FICHA: 'ASDAS12', CENCO2_CODI: '028-001' },
    ]


    tablaMapPersonas = []


    rutsEncontrados.forEach((rutEncontrado, index) => {
      let pagina = index + 1
      let rutId = convierteRutID(rutEncontrado)
      //puede tener mas de una ficha vigente
      let registrosPersona = personalVigente.filter(x => x["RUT_ID"] == rutId)
      if (registrosPersona) {

        registrosPersona.forEach(registroPersona => {
          if (!(tablaMapPersonas.find(x => x["RUT_ID"] == registroPersona["RUT_ID"] && x["CENCO2_CODI"] == registroPersona["CENCO2_CODI"]))) {

            tablaMapPersonas.push({ RUT: registroPersona["RUT"], RUT_ID: registroPersona["RUT_ID"], PAGINA: pagina, FICHA: registroPersona["FICHA"], CENCO2_CODI: registroPersona["CENCO2_CODI"], NOMBRES: registroPersona["NOMBRE_SINGLE"] })

          } else {
            console.log("el registro ya tiene la persona ", rutId, "el el centro costo", registroPersona["CENCO2_CODI"])
          }
        })

      } else {
        console.log("no se encuentra vigente la persona de rut: " + rutEncontrado)
        //no se encuentra la persona en softland entregar error

        fs.appendFile(filePathName, rutEncontrado + '\n', function (err) {
          if (err) throw err;
          console.log('Saved!');
        });

      }

    })

    if(tablaMapPersonas.length>0){
      //ordena tabla por nombre

      tablaMapPersonas= tablaMapPersonas.sort((a, b) => (a["NOMBRE_SINGLE"] > b["NOMBRE_SINGLE"]) ? 1 : -1)
    }

    resolve(tablaMapPersonas)




  })

}

/** 
 * Funcion genera los archivos por centro de costo en el directorio indicado
 * @async
 * @function generaFiles
 * @param {string[]} tablaMapPersonas - datos del mapeo persona, centro costo del archivo, num. de página.
 * @param {integer} empresa - el id de la empresa.
 * @param {string} uploadFileName - El directorio local donde se subió el archivo pdf necesario para el proces.
 *  @param {string} dirDestino - El directorio donde se generarán los archivos.
 * @return {Promise}  
*/
async function generaFiles(tablaMapPersonas,empresa,uploadFileName,dirDestino) {
	console.log("Se comenzaran a generar los archivos en directorio destino...",dirDestino)
	let dataValidar = [] 

  let unique = (value, index, self) => {

    return self.indexOf(value) == index;
  }

  let distinctCC = ['027-001', '028-001']
  distinctCC = tablaMapPersonas.map(x => x["CENCO2_CODI"]).filter(unique);

  //limitar cantidad de archivos
  //for (const cc of distinctCC.slice(0,5)) {


    
     for (const centro_costo of distinctCC) {
    console.log("Empezando el ..." + centro_costo)
 
    let pagesCC = tablaMapPersonas.filter(x => x["CENCO2_CODI"] == centro_costo)
  
    pagesCC=(tablaMapPersonas.sort((a, b) => (a["NOMBRES"] > b["NOMBRES"]) ? 1 : -1)).map(x => x["PAGINA"]).join(" ")
    console.log("pagesCC", pagesCC)
    console.log("nombres",tablaMapPersonas.map(x => x["NOMBRES"]).join(" "))
    
    let child = await  new Promise ( (resolve,reject)=>{
     // exec('pdftk ' + uploadFileName + ' cat ' + pagesCC + ' output ' + path_output_base + centro_costo + '.pdf',
     exec('pdftk ' + uploadFileName + ' cat ' + pagesCC + ' output ' + FileServer.convertPath(dirDestino+'\\' + centro_costo) + "-["+empresa+"]"+'-PREVIRED['+Utils.getDateFormat().substr(0,10)+']'+'.pdf',
  
      function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
				console.log("terminado el cc " + centro_costo)
				
			 tablaMapPersonas.filter(x => x["CENCO2_CODI"] == centro_costo).forEach(x=>{
				 dataValidar.push(x)
			 })
        
        if (error !== null) {
          console.log('exec error: ' + error);

				}
				//envia evento de completitud del archivo
				StatusPrevired.msgs[0] = centro_costo
				StatusPrevired.percent = parseInt((distinctCC.indexOf(centro_costo) + 1) / distinctCC.length * 100)
				io.emit('getStatusPrevired', StatusPrevired)
				//
	       //entrega data para validacion
				resolve()

      });

    })

  }
	console.log("termino todo")
	




return dataValidar

}







}) //cierra socket



async function fileupload(req, res, next) {
  var empresa=0
  var mes='2020-01-01'
  
//	req.setTimeout(0);
  console.log("en fileup")
  var form = formidable({ multiples: true });
  form.parse(req, async function (err, fields, files) {
    if (err){
      res.status(500).send({status:"error",messaje:"error en subida de archivo"})
      return

    }
  
    console.log("fields",fields)
   // fields { empresa: '0', mes: '2020-09' }
   empresa=parseInt(fields.empresa)
   mes=fields.mes
    //añadir como parametro campo hidden con la empresa valor global y obtenerla acá para luego hacer las validaciones
    
  //archivo (con path) donde se subió en servidor, si no es valido entregar error y eliminar del servidor
  //C:\Users\jpierre\AppData\Local\Temp\upload_5d2d5021b6c503746eaf1987d4abf555 	
  var oldpath = files.filetoupload.path;
    
    //nombre del archivo que se subió (nombre del cliente)
    //001-001.pdf
    var  uploadFileName = files.filetoupload.name;

  //	let rutsEncontrados

    console.log("oldpath",oldpath," newpath",uploadFileName)

   //archivo subido, ahora validamos que haya data
  
   let rutsEncontrados
   let personalVigente

  try {
    console.log("EEEEE")
  //	let uploadFileName='C:/Users/jpierre/Documents/NodeProjects/liquidaciones-sueldo/api-server/CotizacionesPersonal.pdf'
    rutsEncontrados = (await getRutsOfFile(oldpath,empresa)).map(x=>parseInt(convierteRutID(x)))
   console.log("ruts",rutsEncontrados.slice(0,10))
    // si se encuentran ruts  validar que sean de la empresa y que todos esten vigentes
   personalVigente =(await SoftlandController.getFichasVigentes(mes,empresa)).map(x=>(parseInt(x.RUT_ID)))
 //  console.log("vigentes",personalVigente.slice(0,10))
  let rutsNoVigentes= rutsEncontrados.filter(x=>!personalVigente.includes(x))
 console.log("no vigentes",rutsNoVigentes)
  // personalVigente.filter(x => x["RUT_ID"] == rutId)

    if(rutsNoVigentes.length==0){
      res.status(200).send({status:"ok",messaje:"Archivo subido correctamente",path:oldpath})
    }else{
     let rutsString=""
     if(rutsNoVigentes.length>5){
     rutsString= rutsNoVigentes.slice(0,5).toString()+"... y otros "+(rutsNoVigentes.length-10)+" más."
     }else{
      rutsString= rutsNoVigentes.slice(0,5).toString()
     }
      res.status(200).send({status:"error",messaje:"Error, hay ruts no vigentes. "+rutsString})
    }

  

    return


  }catch(e){
    console.log(e)
    res.status(200).send({status:"error",messaje:e})
    return

  }

 //no se puede aca iniciar socket, hay tencnicas, pero no es optimo ya que son enfoques distintos y no se recomienda mezclarlos
    //var socketio = req.app.get('socketIO');
    //socketio.emit('getPrevired',uploadFileName)
    
  //	console.log("socket emitidos")
  
  /*	try {
      console.log("EEEEE")
      console.log(oldpath)
      rutsEncontrados = await getRutsOfFile(oldpath)
     // console.log("ruts", rutsEncontrados)
      //solo si encuentra ruts, si no, mostrar error

      //si pasa la prueba se emite el evento de iniciar
      // si no entregar error
      console.log("rutsEncontrados",rutsEncontrados)
      res.status(200).send({status:"ok"})

  } catch (e) {
    console.log("no tiene formato", e)
  
 
  
  }
  
  */


  })

}

/** 
 * Funcion que extrae los ruts encontrados en el archivo subido en la ruta del input
 * @function getRutsOfFile
 * @param {string} pdf_path - El directorio local donde se subió el archivo pdf necesario para el procesamiento.
 * @param {integer} empresa - El id de la empresa.
 * @return {Promise.<string[]>} - Arreglo de ruts encontrados
*/
function getRutsOfFile(pdf_path,empresa) {

  return new Promise((resolve, reject) => {

    let option = null
    let rutEmpresa =constants.EMPRESAS.find(x => x.ID == empresa).RUT
    console.log("rut empresa",rutEmpresa)

    pdfUtil.pdfToText(pdf_path, option, function (err, data) {
    
   

      console.log("errr", err)
			if (err||!data) { reject("Error al leer el archivo")
			return
			};
			//rut filtrados sin el de empresa
			
     // let rutsEncontrados = data.match(regex) ? data.match(regex).filter(x => !rutsFiltrar.includes(x)) : null;
      //console.log("rutsss", rutsEncontrados)
      let rutsEncontrados = data.match(regex) ? data.match(regex) : null;

      if (!rutsEncontrados) { reject("Error, no se encontraron ruts");return};

      //verificamos la empresa
      if (!rutsEncontrados.includes(rutEmpresa)){ reject("Error, Empresa no valida"); return };

      rutsEncontrados = data.match(regex) ? data.match(regex).filter(x => x!=rutEmpresa) : null;
      //console.log("rutsencontrados", rutsEncontrados)
      //rutsencontrados [ '8.849.245-5', '13.510.579-1', '10.420.224-1', '8.223.485-3' ]
      //console.log(data)
      //console.log(data); //print text    
      let cadena = "Para más información, vea Capítulo 3.4.5.1";
      let expresion = /(capítulo \d+(\.\d)*)/i;
      let hallado = cadena.match(expresion);

      console.log('hallado: ', hallado);

      resolve(rutsEncontrados)

    })

  })

}

function convierteRutID(rut) {

  rut = rut.substr(0, rut.length - 1);
  rut = replaceAll(rut, ".", "");
  rut = replaceAll(rut, "-", "");
  // rut1=rut.replace(".","");
  if (isNaN(parseFloat(rut)) && !isFinite(rut))
    rut = 0;


  //   console.log("el rut es:" + rut);
  return rut;
}

function replaceAll(string, omit, place, prevstring) {
  if (prevstring && string === prevstring)
    return string;
  prevstring = string.replace(omit, place);
  return replaceAll(prevstring, omit, place, string)
}


module.exports = {fileupload}
