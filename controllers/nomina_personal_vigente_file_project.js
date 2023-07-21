'use strict'

    /**
    * Métodos para la generación de archivos pdf NominasBancarias
    * @module /controllers/nomina_personal_vigente_file_project
    */
var express = require('express');
var router = express.Router();
var sql = require("mssql");
var pdfUtil = require('pdf-to-text');
var exec = require('child_process').exec
const constants = require('../config/systems_constants')
const FileServer = require('../controllers/file_server');
const Utils = require('../controllers/utils');
var sql = require('../config/connections')
var fs = require('fs');
var formidable = require('formidable');
var pdf = require('html-pdf');
var ejs = require('ejs');
var utils = require('./utils')
let data=require('../data.json')
const io = require('../index');
var inProgress = 0
var ProcessTotal = 0
var ProcessActual = 0
var sequelizeMssql = require('../config/connection_mssql')
const NominasPorPersonaModel = sequelizeMssql.import('../models/nominas_por_persona');
var SoftlandController = require('../controllers/softland');
const VariablesFicha = sequelizeMssql.import('../models/soft_variables_ficha');
var  VariablesNominasBancarias = require('../config/' + constants.NOMINAS_BANCARIAS_VARIABLES["FILENAME"]) 

/*var ConfigAperturaPersona=[{EMP_CODI:2,TIPO:"EMPRESA"},{EMP_CODI:0,CENCO1_CODI:"031-000",TIPO:"CLIENTE"},{EMP_CODI:0,CENCO1_CODI:"005-000",TIPO:"CLIENTE"},{EMP_CODI:0,CENCO1_CODI:"090-000",TIPO:"CLIENTE"}
,{EMP_CODI:0,CENCO1_CODI:"962-000",TIPO:"CLIENTE"}
,{EMP_CODI:0,CENCO1_CODI:"163-000",TIPO:"CLIENTE"}] */




async function getMontosNomina (req,res) {

    let variableBase='D066'
    let mesProceso='2021-05-01'
    let empresa=0
    let fechaPago='2021-06-01'

      //datos variables nominas (fecha, nombre, etc)
      var empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)
      let variableNominaDetalle=VariablesNominasBancarias.find(x=>x["COD_VARIABLE"]==variableBase)
      console.log(variableNominaDetalle)
    
    let nombreNomina=variableNominaDetalle["NOMBRE_NOMINA"]
    let rutEmpresa=empresaDetalle["RUT"]
     let fechaHora=Utils.getDateFormat('-')
    console.log(fechaHora)
    //2021/06/14/23/27/38 retorna 
  
    let fechaActual=fechaHora.substr(8,2)+"/"+fechaHora.substr(5,2)+"/"+fechaHora.substr(0,4)
    let horaActual=fechaHora.substr(11,10).replace(/-/g, ':');
    let fechaPagoFormat=fechaPago.substr(8,2)+"/"+fechaPago.substr(5,2)+"/"+fechaPago.substr(0,4)
    console.log(horaActual,fechaActual,fechaPagoFormat,empresaDetalle.RUT,nombreNomina)
    let datosNominaHeader={FECHA_ACTUAL:fechaActual,HORA_ACTUAL:horaActual,FECHA_PAGO:fechaPagoFormat,RUT_EMPRESA:rutEmpresa,NOMBRE_NOMINA:nombreNomina}
  
  

    let nominaPago = await sequelizeMssql
        .query(`
  select ficha,valor
  FROM [SISTEMA_CENTRAL].[dbo].[sw_variablepersona]
  where 
  emp_codi='`+ empresa + `' and fecha='` + mesProceso + `'
  and codVariable='`+ variableBase + `' and valor>0

`
          , {

            model: VariablesFicha,
            mapToModel: true, // pass true here if you have any mapped fields
            raw: true
          })

    console.log(nominaPago.length)



    //añadiremos campo para normalizar ñ
    nominaPago=nominaPago.map(x=>{
  x["ficha"]=x["ficha"].replace(/Ñ/g, 'N')
  return x
})


  //distinct cc
  let unique = (value, index, self) => {
    return self.indexOf(value) == index;
  }


  let fichasNominaPago = nominaPago.map(x => { return x.ficha }).filter(unique)//.slice(0, 3)

let infoPersonas = (await SoftlandController.getFichasInfoPromiseMes(fichasNominaPago, empresa, mesProceso))

infoPersonas=infoPersonas.map(persona=>{
    persona["MEDIO_PAGO"]=''
    persona["OF_DESTINO"]='Central'
    persona["BANCO_GLOSA"]=''

if (persona["COD_BANCO_SUC"]=='01'|| persona["COD_BANCO_SUC"]=='02'){
    persona["MEDIO_PAGO"]='Abono en Bancuenta Credichile' 
    persona["BANCO_GLOSA"]='BANCO DE CHILE'
}
else if(persona["COD_BANCO_SUC"]=='04'){
    persona["BANCO_GLOSA"]='BANCO DEL ESTADO DE CHILE'
    persona["MEDIO_PAGO"]='Abono en Cta. Cte. de otros' 
}
else if(persona["COD_TIP_EFE"]=='002'){
    persona["MEDIO_PAGO"]='Pago Efectivo Servipag'

}else{
    persona["MEDIO_PAGO"]='Abono en Cta. Cte. de otros' 
    persona["BANCO_GLOSA"]= persona["BANCO_DESC"]
}
persona["MONTO"]=nominaPago.find(x=>x["ficha"]==persona["FICHA"])["valor"]

return persona

})

let sumNomina= nominaPago.reduce((sum, b) => { return sum + parseInt(b.valor) }, 0);
     let cantRegistros=nominaPago.length
     let datosNomina={MONTO_TOTAL:sumNomina,NUM_REGISTROS:cantRegistros,NOMBRE_NOMINA:"TEST NOMINA"}

               console.log("sum nomina",sumNomina)

//res.status(200).send(infoPersonas)

res.render("../views/nomina_bancaria", { nomina: infoPersonas,datosNomina:datosNomina,datosNominaHeader:datosNominaHeader });


  

}


async function getCalendarioAsistenciasPromise () {

return new Promise(async (resolve, reject) => {
  let empresa=0
  let mes='2023-01-01'
  let cenco2_codi='923-001'

  var options = {
    format: 'Letter',
    header:{height: "83mm"},
    footer: {
        height: "18mm",
        contents: {

       //   default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>'// fallback value
       default: '<span style="color: #444;  font-size: 11px; font-weight: bold; font-family: Courier New, Courier, monospace;">Página {{page}}</span>'// fallback value    
    }
        },
    orientation:'landscape',
    border: {
      top: "0cm",
      right: "1cm",
      bottom: "0cm",
      left: "1cm"
    },
    timeout: 30000,

  };


  let calendario = (await SoftlandController.getCalendariosAsistenciasPromise(empresa,mes))//.slice(0,2);
  let distinctCC= calendario.map(x => { return x["CENCO2_CODI"] }).filter(unique)//.slice(0,5)
  console.log("DISTINCCC",distinctCC)

  let centrosCosto = await SoftlandController.getCentrosCostosPromise(empresa)
  let cantIteraciones = distinctCC.length

  for (let i = 0; i < cantIteraciones; i++) {

   let cenco2_codi = distinctCC[i]
 

     await (new Promise(async (resolves, rejects) => {
  // res.status(200).send(calendario)

  let calendarioCC=calendario.filter(x=>x["CENCO2_CODI"]==cenco2_codi)
  let cantRegistros=calendarioCC.length
  let infoCC=centrosCosto.find(x=>x["CENCO2_CODI"]==cenco2_codi)
  console.log('infoCC',cenco2_codi,infoCC)
 let columnas=Object.keys(calendario[0])

 let fechaHora=Utils.getDateFormat('-')
let fechaActual=fechaHora.substr(8,2)+"/"+fechaHora.substr(5,2)+"/"+fechaHora.substr(0,4)
let mesFormat=mes.substr(5,2)+"/"+mes.substr(0,4)
//ejs.renderFile("views/liquidacion_sueldo_multiple - copia.ejs", { templates_persona: templates_persona, empresaDetalle: empresaDetalle, mes: mesProceso }, {},  function (err, data) {
  ejs.renderFile("views/nomina_calendario_asistencias.ejs", { calendario:calendarioCC,columnas:columnas,infoCC:infoCC,fechaActual:fechaActual,mesFormat:mesFormat,cantRegistros:cantRegistros},{},  function (err, data) {

  let liquidacionID = "10.010-JEAN-TEST"
  let html = data;
 
  try {


    pdf.create(html, options).toStream(function (err, stream) {

     // res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
     // res.setHeader('Content-Type', 'application/pdf');
      //stream.pipe(res);
stream.pipe(fs.createWriteStream("testCalendario/"+cenco2_codi+".pdf"))
//console.log("TEST")
resolves()
    })



  } catch (e) {
    console.log(e)
    rejects()
  }



});
  



     }))

  }

console.log("todos los trabajos terminados")
   resolve()
      return

})

}


async function getCalendarioAsistencias (req,res) {
  let empresa=0
  let mes='2023-01-01'
  let cenco2_codi='923-001'

  var options = {
    format: 'Letter',
    header:{height: "83mm"},
    footer: {
        height: "18mm",
        contents: {

       //   default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>'// fallback value
       default: '<span style="color: #444;  font-size: 11px; font-weight: bold; font-family: Courier New, Courier, monospace;">Página {{page}}</span>'// fallback value    
    }
        },
    orientation:'landscape',
    border: {
      top: "0cm",
      right: "1cm",
      bottom: "0cm",
      left: "1cm"
    },
    timeout: 30000,

  };


  let calendario = (await SoftlandController.getCalendariosAsistenciasPromise(empresa,mes))//.slice(0,2);
  let centrosCosto = await SoftlandController.getCentrosCostosPromise(empresa)
  // res.status(200).send(calendario)

 let calendarioCC=calendario.filter(x=>x["CENCO2_CODI"]==cenco2_codi)
 let cantRegistros=calendarioCC.length
 let infoCC=centrosCosto.find(x=>x["CENCO2_CODI"]==cenco2_codi)
 console.log('infoCC',infoCC)
let columnas=Object.keys(calendario[0])
 
 console.log('columnas',columnas)
//res.render("../views/nomina_calendario_asistencias", { calendario:calendario,columnas:columnas });
let fechaHora=Utils.getDateFormat('-')
let fechaActual=fechaHora.substr(8,2)+"/"+fechaHora.substr(5,2)+"/"+fechaHora.substr(0,4)
let mesFormat=mes.substr(5,2)+"/"+mes.substr(0,4)

 res.render("../views/nomina_calendario_asistencias", { calendario:calendarioCC,columnas:columnas,infoCC:infoCC,fechaActual:fechaActual,mesFormat:mesFormat,cantRegistros:cantRegistros}, async function (err, data) {

  let liquidacionID = "10.010-JEAN-TEST"
  let html = data;
  //   console.log("HTML",html)
  try {


    pdf.create(html, options).toStream(function (err, stream) {

      res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
      res.setHeader('Content-Type', 'application/pdf');
      stream.pipe(res);

    })







  } catch (e) {
    console.log(e)
  }



});


}

async function getCalendarioData (req,res) {
  let empresa=0
  let mes='2022-12-01'
  let calendario = (await SoftlandController.getCalendariosAsistenciasPromise(empresa,mes))//.slice(0,2);
  //let columnas=Object.keys(calendario[0])

  calendario[0]["NOMBRES"]="hola"
  console.log('cal',calendario[0])
 // let columnas=ordenarClavesJSON(calendario[0]);
 //console.log('columnas',columnas)
 const ordenClaves = ['NOMBRE', 'RUT', 'FICHA','1','2'];

const jsonConOrden = reordenarClavesJSON(calendario[0], ordenClaves);
console.log(jsonConOrden);
  res.status(200).send(calendario)
 

}
const reordenarClavesJSON = (jsonObj, ordenClaves) => {
  const nuevoJSON = {};

  // Recorrer el array de claves en el orden deseado
  ordenClaves.forEach(key => {
    if (jsonObj.hasOwnProperty(key)) {
      nuevoJSON[key] = jsonObj[key];
    }
  });

  return nuevoJSON;
};

const ordenarClavesJSON = (jsonObj) => {
  const keys = Object.keys(jsonObj);

  // Ordenar las claves
  keys.sort((a, b) => {
    const esNumericoA = !isNaN(parseFloat(a));
    const esNumericoB = !isNaN(parseFloat(b));

    if (esNumericoA && esNumericoB) {
      // Ambas claves son numéricas
      return parseFloat(a) - parseFloat(b);
    } else if (esNumericoA) {
      // La clave A es numérica y la clave B es de texto
      return -1;
    } else if (esNumericoB) {
      // La clave B es numérica y la clave A es de texto
      return 1;
    } else {
      // Ambas claves son de texto
      return a.localeCompare(b);
    }
  });

  const nuevoJSON = {};

  // Asignar los valores al nuevo objeto en el orden de las claves ordenadas
  keys.forEach(key => {
    nuevoJSON[key] = jsonObj[key];
  });

  return nuevoJSON;
};
function getOrderedKeys(obj) {
  const orderedKeys = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      orderedKeys.push(key);
    }
  }
  return orderedKeys;
}

async function getNominaPersonalVigentePDF (req,res) {
  console.log("test")

    let variableBase='H303'
    let mesProceso='2023-01-01'
    let empresa=0
    let fechaPago='2022-11-30'
    let filtro='CENCO1_CODI'
    let filtroDesc='CENCO1_DESC'
    let filtroValor=['918-000']



    let nominaPago = await sequelizeMssql
        .query(`
  select ficha,valor
  FROM [SISTEMA_CENTRAL].[dbo].[sw_variablepersona]
  where 
  emp_codi='`+ empresa + `' and fecha='` + mesProceso + `'
  and codVariable='`+ variableBase + `' and valor>0

`
          , {

            model: VariablesFicha,
            mapToModel: true, // pass true here if you have any mapped fields
            raw: true
          })

    console.log(nominaPago.length)


  //distinct cc
  let unique = (value, index, self) => {
    return self.indexOf(value) == index;
  }


  let fichasNominaPago = nominaPago.map(x => { return x.ficha }).filter(unique)//.slice(0, 3)

let infoPersonas = (await SoftlandController.getFichasInfoPromiseMes(fichasNominaPago, empresa, mesProceso))
//quita personas con rol privado y ordena por nombre
infoPersonas=infoPersonas.filter(x=>x["ROL_PRIVADO"]=='N').sort((a, b) => (a["NOMBRES_ORD"] > b["NOMBRES_ORD"]) ? 1 : -1)
//carga filtro personalizado definido al comienzo
infoPersonas=infoPersonas.filter(x=>x[filtro]==filtroValor)

infoPersonas=infoPersonas.map(persona=>{
    persona["MEDIO_PAGO"]=''
    persona["OF_DESTINO"]='Central'
    persona["BANCO_GLOSA"]=''

if (persona["COD_BANCO_SUC"]=='01'|| persona["COD_BANCO_SUC"]=='02'){
    persona["MEDIO_PAGO"]='Abono en Bancuenta Credichile' 
    persona["BANCO_GLOSA"]='BANCO DE CHILE'
}
else if(persona["COD_BANCO_SUC"]=='04'){
    persona["BANCO_GLOSA"]='BANCO DEL ESTADO DE CHILE'
    persona["MEDIO_PAGO"]='Abono en Cta. Cte. de otros' 
}
else if(persona["COD_TIP_EFE"]=='002'){
    persona["MEDIO_PAGO"]='Pago Efectivo Servipag'

}else{
    persona["MEDIO_PAGO"]='Abono en Cta. Cte. de otros' 
    persona["BANCO_GLOSA"]= persona["BANCO_DESC"]
}
persona["MONTO"]=nominaPago.find(x=>x["ficha"]==persona["FICHA"])["valor"]

return persona

})


var options = {
    format: 'Letter',
    header:{height: "83mm"},
    footer: {
        height: "18mm",
        contents: {

       //   default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>'// fallback value
       default: '<span style="color: #444;  font-size: 11px; font-weight: bold; font-family: Courier New, Courier, monospace;">Página {{page}}</span>'// fallback value    
    }
        },
    orientation:'landscape',
    border: {
      top: "0cm",
      right: "1cm",
      bottom: "0cm",
      left: "1cm"
    },
    timeout: 30000,

  };



      //datos variables nominas (fecha, nombre, etc)
      var empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)
      let variableNominaDetalle=VariablesNominasBancarias.find(x=>x["COD_VARIABLE"]==variableBase)
      console.log(variableNominaDetalle)
    

    let rutEmpresa=empresaDetalle["RUT"]
     let fechaHora=Utils.getDateFormat('-')
      console.log(fechaHora)
      //2021/06/14/23/27/38 retorna 
    
      let fechaActual=fechaHora.substr(8,2)+"/"+fechaHora.substr(5,2)+"/"+fechaHora.substr(0,4)
      let horaActual=fechaHora.substr(11,10).replace(/-/g, ':');
      let fechaPagoFormat=fechaPago.substr(8,2)+"/"+fechaPago.substr(5,2)+"/"+fechaPago.substr(0,4)

      let datosNominaHeader={FECHA_ACTUAL:fechaActual,HORA_ACTUAL:horaActual,FECHA_PAGO:fechaPagoFormat,RUT_EMPRESA:rutEmpresa,NOMBRE_NOMINA:""}
    
     let nombreNomina= variableBase+"-"+ infoPersonas.find(x=>x[filtro]==filtroValor)[filtroDesc]
     
     let sumNomina= infoPersonas.reduce((sum, b) => { return sum + parseInt(b.MONTO) }, 0);
     let cantRegistros=infoPersonas.length
     let datosNomina={MONTO_TOTAL:sumNomina,NUM_REGISTROS:cantRegistros,NOMBRE_NOMINA:nombreNomina}

               console.log("sum nomina",sumNomina)


//res.status(200).send(infoPersonas)

res.render("../views/nomina_personal_vigente", { nomina: infoPersonas,datosNomina:datosNomina,datosNominaHeader:datosNominaHeader }, async function (err, data) {

    let liquidacionID = "10.010-JEAN-TEST"
    let html = data;
    //   console.log("HTML",html)
    try {


      pdf.create(html, options).toStream(function (err, stream) {

        res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        stream.pipe(res);

      })







    } catch (e) {
      console.log(e)
    }



  });





  

}


var StatusNominasBancariasTemplate = {

  isExecuting: false,
  percent: 0,
  msgs: []
}

var StatusNominasBancarias = JSON.parse(JSON.stringify(StatusNominasBancariasTemplate))





//Calendario Asistencia

var StatusCalendarioAsistenciaTemplate = {

  isExecuting: false,
  percent: 0,
  msgs: []
}

var StatusCalendarioAsistencia = JSON.parse(JSON.stringify(StatusCalendarioAsistenciaTemplate))




/** 
 * Funcion del socket
 * @constructor
 * @param {socket} socket - El directorio local donde se subió el archivo pdf necesario para el proces.

*/


io.on('connection', (socket) => {
  socket.emit('getStatusCalendarioAsistencia', StatusCalendarioAsistencia)


  socket.on('getTest', async (uploadFileName) => {
  })

  socket.on('getVariablesNominasBancarias', async () => {

    socket.emit('resVariablesNominasBancarias', VariablesNominasBancarias)

  });
  
    




    socket.on('getCalendarioAsistencia', async (data) => {
      let empresa=data.empresa
      let mes=data.mes
      //////////////////////////////////NUEVO PROCESO
  
      //data trae la info del mes y la empresa del proceso
      console.log("se empieza a ejecutar proceso Calendario Asistencia: " +empresa+" "+mes)
  
    
      StatusCalendarioAsistencia = JSON.parse(JSON.stringify(StatusCalendarioAsistenciaTemplate))
      StatusCalendarioAsistencia.isExecuting = true
      //StatusCalendarioAsistencia.userParams={mes:mes,empresa:empresa}
     // StatusPrevired.userParams={mes:dataUser["mes"],empresa:dataUser["empresa"]}
  
      io.emit('getStatusCalendarioAsistencia', StatusCalendarioAsistencia)
      await getCalendarioAsistenciaFileProject(empresa,mes)
      StatusCalendarioAsistencia.isExecuting = 0
      io.emit('getStatusCalendarioAsistencia', StatusCalendarioAsistencia)
  
    });

    async function getCalendarioAsistenciaFileProject(empresa,mes){
      
      await getCalendarioAsistenciasPromise()
     // console.log("todos los trabajos terminados")
    }



    async function getCalendarioAsistenciaFileProjectXXXXXXX(empresa,mes){
  
      let carpetaBurst='pdfBurstPrevired'
  
      if(fs.existsSync(carpetaBurst))
      {
      //recrea carpeta Burst
      try {
        
        fs.rmdirSync(carpetaBurst, { recursive: true });
        fs.mkdirSync(carpetaBurst);
       
        console.log('Carpeta recreada exitosamente!');
      } catch (err) {
        console.error(err);
      }
  
    }else{
      fs.mkdirSync(carpetaBurst);
    }
  
      let rutsEncontrados
  
      try {
        console.log("EEEEE")
      //	let uploadFileName='C:/Users/jpierre/Documents/NodeProjects/liquidaciones-sueldo/api-server/CotizacionesPersonal.pdf'
        rutsEncontrados = await getRutsOfFile(uploadFileName,empresa)
        
    var tablaMapPersonas = (await generaMapPersonas(rutsEncontrados, empresa,mes))//.slice(0,5)  //para control de cantidad de la cantidad de archivos que se generaran ***********
     // console.log(tablaMapPersonas)
    } catch (e) {
      console.log("no tiene formato", e)
    
    
    }
  
    let child = await  new Promise ( (resolve,reject)=>{
      // exec('pdftk ' + uploadFileName + ' cat ' + pagesCC + ' output ' + path_output_base + centro_costo + '.pdf',
     // exec('pdftk ' + uploadFileName + ' cat ' + pagesCC + ' output ' + FileServer.convertPath(dirDestino+'\\' + centro_costo) + "-["+empresa+"]"+'-PREVIRED['+Utils.getDateFormat().substr(0,10)+']'+'.pdf',
      
     //page_%01d tien 1,page_%02d tiene 01,page_%03d tien 001 y asi sucesivamente
    //exec('pdftk ' + uploadFileName + ' cat ' + pagesCC + ' output ' + FileServer.convertPath(dirDestino+'\\' + centro_costo) + "-["+empresa+"]"+'-PREVIRED['+Utils.getDateFormat().substr(0,10)+']'+'.pdf',
  
     exec('pdftk  ' + uploadFileName + ' burst output  pdfBurstPrevired/page_%01d.pdf',
    
       function (error, stdout, stderr) {
         console.log('stdout: ' + stdout);
         console.log('stderr: ' + stderr);
       
         
      
         if (error !== null) {
           console.log('exec error: ' + error);
    
         }
        
         //
          //entrega data para validacion
         resolve()
    
       });
      });
  /*
    {
      RUT: '016.877.086-3',
      RUT_ID: 16877086,
      PAGINA: 1541,
      FICHA: 'CARONOS389',
      CENCO2_CODI: '165-012',
      NOMBRES: 'CLAUDIA ANDREA'
    },
    
  */
  let processInfo={
    name:"PREVIRED",
    type:77,
    referencialDate:mes.substr(0,7)+'-30',
    monthInsacom: mes.substr(5,2),
    yearInsacom:mes.substr(0,4)
  
  }
  console.log(processInfo)
       console.log("termino burst (separa todo en paginas")
       
       let cantIteraciones = tablaMapPersonas.length
      // let cantIteraciones =2
       for (let i = 0; i < cantIteraciones; i++) {
       let personaFile= tablaMapPersonas[i]
       //filename=testPdfBurst/page_%01d.pdf
       let filename=carpetaBurst+'/page_'+personaFile["PAGINA"]+'.pdf'
       console.log("pagina buscada"+filename)
        var buffer = fs.readFileSync(filename);
        let base64=Buffer.from(buffer).toString('base64')
        if(base64){
        
        console.log("se recibio archvio")
  
  
        let response=await FileProjectController.fileProjectPost(processInfo,personaFile,base64)
        console.log('response',JSON.stringify(response))
  
            //envia evento de completitud del archivo
          StatusPrevired.msgs[0] = personaFile.FICHA
          StatusPrevired.percent =(( i + 1) / cantIteraciones* 100)
          io.emit('getStatusPrevired', StatusPrevired)
        
      }else{ 
        console.log("error no se recibio archivo")
      }
  
       // let response=await FileProjectController.fileProjectPost(null,base64)
        
       }
      // var buffer = fs.readFileSync(filename);
    
     console.log("todos los trabajos terminados")
  
  
  }
  



async function generaFiles(data, filterField,dirDestino,empresa,datosNominaHeader){

  var options = {
    format: 'Letter',
    header:{height: "83mm"},
    footer: {
        height: "18mm",
        contents: {

       //   default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>'// fallback value
       default: '<span style="color: #444;  font-size: 11px; font-weight: bold; font-family: Courier New, Courier, monospace;">Página {{page}}</span>'// fallback value    
    }
        },
    orientation:'landscape',
    border: {
      top: "0cm",
      right: "1cm",
      bottom: "0cm",
      left: "1cm"
    },
    timeout: 30000,

  };

  let distinctFiles= data.map(x => { return x[filterField] }).filter(unique)
 
  
  let cantIteraciones = distinctFiles.length

  for (let i = 0; i < cantIteraciones; i++) {

    let distinctFile = distinctFiles[i]

    await (new Promise(async (resolves, rejects) => {
      
      let filename = distinctFile + ".pdf"

      let infoPersonasCC = data.filter(x => x[filterField] == distinctFile)
       let sumNominaCC= infoPersonasCC.reduce((sum, b) => { return sum + parseInt(b["MONTO"]) }, 0);
       let cantRegistrosCC=infoPersonasCC.length
       let nombreNomina= datosNominaHeader["VARIABLE_BASE"]+"-"+ infoPersonasCC.find(x=>x[filterField]==distinctFile)["CENCO1_DESC"]
       let datosNominaCC={MONTO_TOTAL:sumNominaCC,NUM_REGISTROS:cantRegistrosCC,NOMBRE_NOMINA:nombreNomina}

      
       
       
       
       



       ejs.renderFile("views/nomina_bancaria.ejs", { nomina: infoPersonasCC,datosNomina:datosNominaCC,datosNominaHeader:datosNominaHeader }, {}, function (err, data) {
        if (err)
        console.log(err)
      //console.log("data",data)

      let liquidacionID = "10.010-JEAN-TEST"
      var html = data;

      pdf.create(html, options).toStream(function (err, stream) {

        if (stream && !err) {
          //ejemplo de nombre de archivo 001-001[0]-RELIQUIDACION[2020-11-12]
    //      stream.pipe(fs.createWriteStream(FileServer.convertPath(dirDestino+"\\" + centro_costo+ "-["+empresa+"]"+nameFileSuffix+ ".pdf")));

    stream.pipe(fs.createWriteStream(FileServer.convertPath(dirDestino+"\\" + distinctFile+ "-["+empresa+"]"+"-NOMINA.pdf")));

          resolves()



        } else {
          rejects()
          console.log("error en stream, " + distinctFile, err)

         
   

        }

      })  //termina pdf create



       })

    }))
    //termina iteracion


    StatusNominasBancarias.msgs[0] = distinctFile
    StatusNominasBancarias.percent = parseInt((i + 1) / distinctFiles.length * 100)
    io.emit('getStatusNominasBancarias', StatusNominasBancarias)
  }
  //termina for de nominas





}

})
//cierra socket



var unique = (value, index, self) => {
    return self.indexOf(value) == index;
  }


module.exports = {
    getMontosNomina,getNominaPersonalVigentePDF,getCalendarioAsistencias,getCalendarioData
  }