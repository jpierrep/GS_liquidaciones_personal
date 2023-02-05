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



async function getNominaPersonalVigentePDF (req,res) {
  console.log("test")

    let variableBase='H303'
    let mesProceso='2022-11-01'
    let empresa=0
    let fechaPago='2022-11-30'
    let filtro='CENCO1_CODI'
    let filtroDesc='CENCO1_DESC'
    let filtroValor=['028-000']



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

/** 
 * Funcion del socket
 * @constructor
 * @param {socket} socket - El directorio local donde se subió el archivo pdf necesario para el proces.

*/


io.on('connection', (socket) => {

  socket.emit('getStatusNominasBancarias', StatusNominasBancarias)

  socket.on('getTest', async (uploadFileName) => {
  })

  socket.on('getVariablesNominasBancarias', async () => {

    socket.emit('resVariablesNominasBancarias', VariablesNominasBancarias)

  });
  
    socket.on('getNominasBancarias', async (data) => {

      let empresa=data.empresa
      let mes=data.mes
      let fechaPago=data.fechaPago
      let variableBase=data.codigoNomina
  
      //data trae la info del mes y la empresa del proceso
      console.log("se empieza a ejecutar proceso Nominas: "+empresa+" "+mes+" "+fechaPago+" "+variableBase)
  
    
      StatusNominasBancarias = JSON.parse(JSON.stringify(StatusNominasBancariasTemplate))
      StatusNominasBancarias.isExecuting = true
      StatusNominasBancarias.userParams={mes:mes,empresa:empresa}
     // StatusNominasBancarias.userParams={mes:dataUser["mes"],empresa:dataUser["empresa"]}
  
      io.emit('getStatusNominasBancarias', StatusNominasBancarias)
      await getNominasBancarias(empresa,mes,variableBase,fechaPago)
      StatusNominasBancarias.isExecuting = 0
      io.emit('getStatusNominasBancarias', StatusNominasBancarias)
  
    });
  


async function getNominasBancarias (empresa,mesProceso,variableBase,fechaPago) {

  
//se añade control desde bd para no tener que modificar código cuando se necesite añadir otros clientes de apertura por persona
var ConfigAperturaPersona = await sequelizeMssql  .query(` SELECT [EMP_CODI]
,[TIPO]
,[CENCO1_CODI]
FROM `+constants.TABLE_NOMINAS_BANCARIAS_POR_PERSONA.database+`.dbo.`+constants.TABLE_NOMINAS_BANCARIAS_POR_PERSONA.table  
      , { model: NominasPorPersonaModel,
        mapToModel: true, // pass true here if you have any mapped fields
        raw: true
      })


	var startTime = new Date();

	let pathLogs = 'data-logs/'
  let nameLogFile='previred'

  //let variableBase='D066'
  //let mesProceso='2021-05-01'
  //let empresa=0

  console.log("comienza el proceso nominas bancarias",empresa,mesProceso)

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
  let datosNominaHeader={FECHA_ACTUAL:fechaActual,HORA_ACTUAL:horaActual,FECHA_PAGO:fechaPagoFormat,RUT_EMPRESA:rutEmpresa,NOMBRE_NOMINA:nombreNomina,VARIABLE_BASE:variableBase}




  let dirDestino=FileServer.getDirDestinoProceso('nominabancaria',mesProceso,empresa)



  
  
   dirDestino= FileServer.convertPath(dirDestino+"\\"+variableBase+"-["+variableNominaDetalle["NOMBRE_NOMINA"].replace(/\s/g, '-')+"]")
    console.log(dirDestino,' carpeta subproceso nomina')
  
   
  if (!dirDestino){
    socket.emit('getGlobalAlert', {messaje:"Error, no hay acceso a carpeta de sobre laboral",type:'error'})
    return
  }

        // crea carpeta del mes en destino, si no existe 
        if (!fs.existsSync(dirDestino)){
    
          fs.mkdirSync(dirDestino,{recursive:true});

          console.log("no existe carpeta, creada la carpeta del mes")
      }else{
        console.log("existe la carpeta, se debe respaldar el contenido ", dirDestino)
      
     ////BACKUP FILES  de cada directorio 
     FileServer.backupFiles(FileServer.convertPath(dirDestino+'\\CLIENTE'),empresa)
     FileServer.backupFiles(FileServer.convertPath(dirDestino+'\\INSTALACION'),empresa)
     FileServer.backupFiles(FileServer.convertPath(dirDestino+'\\PERSONA'),empresa)
   
    
      }



  let nominaPago = await sequelizeMssql
      .query(`
select per.ficha,valor
FROM [SISTEMA_CENTRAL].[dbo].[sw_variablepersona] as per
left join [SISTEMA_CENTRAL].[dbo].sw_areanegper AS area ON area.ficha = per.ficha AND '` + mesProceso + `'>= area.vigDesde and '` + mesProceso + `'< area.vigHasta and per.emp_codi=area.empresa
where 
not (area.codArn='001' and emp_codi=0) and not (area.codArn='005' and emp_codi=2)  and
emp_codi='`+ empresa + `' and fecha='` + mesProceso + `'
and codVariable='`+ variableBase + `' and valor>0

`
        , {

          model: VariablesFicha,
          mapToModel: true, // pass true here if you have any mapped fields
          raw: true
        })

           //añadiremos campo para normalizar ñ
    nominaPago=nominaPago.map(x=>{
      x["ficha"]=x["ficha"].replace(/Ñ/g, 'N')
      return x
    })

  console.log(nominaPago.length)

            //si no existen fichas, se termina el proceso
            if (nominaPago.length==0){
              console.log("no hay fichas,termina el proceso")
              socket.emit('getGlobalAlert', {messaje:"Error, no hay data para el proceso",type:'error'})
          
  
             //emitir mensaje de error
              //termina el promise
              //sale de la funcion, si no hay return, continua ejecutando lo siguiente
             return
            }




let fichasNominaPago = nominaPago.map(x => { return x.ficha }).filter(unique)//.slice(0, 3)

let infoPersonas = (await SoftlandController.getFichasInfoPromiseMes(fichasNominaPago, empresa, mesProceso))

//añadiremos campo para realizar agrupacion en archivos este es nombres + cenco2_codi
infoPersonas=infoPersonas.map(x=>{
  x["NOMBRES_CENCO2_CODI"]=x["NOMBRES"]+"-["+x["CENCO2_CODI"]+"]"
  x["FICHA"]=x["FICHA"].replace(/Ñ/g, 'N')
  return x
})

//quita personas con rol privado y ordena por nombre
 infoPersonas=infoPersonas.filter(x=>x["ROL_PRIVADO"]=='N').sort((a, b) => (a["NOMBRES_ORD"] > b["NOMBRES_ORD"]) ? 1 : -1)

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
//console.log("persona",persona)
persona["MONTO"]=nominaPago.find(x=>x["ficha"]==persona["FICHA"])["valor"]

return persona

})
   
   let sumNomina= nominaPago.reduce((sum, b) => { return sum + parseInt(b.valor) }, 0);
   let cantRegistros=nominaPago.length
   let datosNomina={MONTO_TOTAL:sumNomina,NUM_REGISTROS:cantRegistros}

             console.log("sum nomina",sumNomina)


//let dirDestinoCliente=dirDestino+"/"+variableBase+"-["+variableNominaDetalle["NOMBRE_NOMINA"].replace(/\s/g, '-')+"]"+ "/CLIENTE"
//let dirDestinoInstalacion=dirDestino+"/"+variableBase+"-["+variableNominaDetalle["NOMBRE_NOMINA"].replace(/\s/g, '-')+"]"+ "/INSTALACION"
//let dirDestinoPersona=dirDestino+"/"+variableBase+"-["+variableNominaDetalle["NOMBRE_NOMINA"].replace(/\s/g, '-')+"]"+ "/PERSONA"

let dirDestinoCliente=FileServer.convertPath( dirDestino+"\\CLIENTE")
let dirDestinoInstalacion=FileServer.convertPath(dirDestino+"\\INSTALACION")
let dirDestinoPersona=FileServer.convertPath(dirDestino+"\\PERSONA")
    fs.mkdirSync(dirDestinoCliente,{recursive:true});

  await generaFiles(infoPersonas,'CENCO1_CODI',dirDestinoCliente,empresa,datosNominaHeader)


  fs.mkdirSync(dirDestinoInstalacion,{recursive:true});
  await generaFiles(infoPersonas,'CENCO2_CODI',dirDestinoInstalacion,empresa,datosNominaHeader)


 fs.mkdirSync(dirDestinoPersona,{recursive:true});
 
 //se añade filtro de cliente  empresas o iinstalaciones que tineen que tener apertura de persona segun json ConfigAperturaPersona
 let infoPersonasFilter=infoPersonas.filter(y=>
(ConfigAperturaPersona.filter(z=>z["TIPO"]=="CLIENTE").map(x=> x["EMP_CODI"]+x["CENCO1_CODI"]).includes(empresa+y["CENCO1_CODI"]))
||(ConfigAperturaPersona.filter(z=>z["TIPO"]=="EMPRESA").map(x=>x["EMP_CODI"]).includes(parseInt(empresa)))


 )



await generaFiles(infoPersonasFilter,'NOMBRES_CENCO2_CODI',dirDestinoPersona,empresa,datosNominaHeader)





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
    getMontosNomina,getNominaPersonalVigentePDF
  }