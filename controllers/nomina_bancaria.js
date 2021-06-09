'use strict'

    /**
    * Métodos para la generación de archivos pdf Previred
    * @module /controllers/read_pdf_certificado
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
var SoftlandController = require('../controllers/softland');
const VariablesFicha = sequelizeMssql.import('../models/soft_variables_ficha');


async function getMontosNomina (req,res) {

    let variableBase='D066'
    let mesProceso='2021-05-01'
    let empresa=0

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
     let datosNomina={MONTO_TOTAL:sumNomina,NUM_REGISTROS:cantRegistros}

               console.log("sum nomina",sumNomina)

//res.status(200).send(infoPersonas)

res.render("../views/nomina_bancaria", { nomina: infoPersonas,datosNomina:datosNomina });


  

}



async function getMontosNominaPDF (req,res) {

    let variableBase='D066'
    let mesProceso='2021-05-01'
    let empresa=0

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
    header:{height: "80mm"},
    footer: {
        height: "28mm",
        contents: {

       //   default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>'// fallback value
       default: '<span style="color: #444;">Página {{page}}</span>'// fallback value    
    }
        },
    orientation:'landscape',
    border: {
      top: "1cm",
      right: "1cm",
      bottom: "2cm",
      left: "1cm"
    },
    timeout: 30000,

  };
     
     let sumNomina= nominaPago.reduce((sum, b) => { return sum + parseInt(b.valor) }, 0);
     let cantRegistros=nominaPago.length
     let datosNomina={MONTO_TOTAL:sumNomina,NUM_REGISTROS:cantRegistros}

               console.log("sum nomina",sumNomina)


//res.status(200).send(infoPersonas)

res.render("../views/nomina_bancaria", { nomina: infoPersonas,datosNomina:datosNomina }, async function (err, data) {

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


async function getMontosNominaFiles (req,res) {

  let variableBase='D066'
  let mesProceso='2021-05-01'
  let empresa=0

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
   let datosNomina={MONTO_TOTAL:sumNomina,NUM_REGISTROS:cantRegistros}

             console.log("sum nomina",sumNomina)


//res.status(200).send(infoPersonas)


//config fileserver
let tipoProceso='nominabancaria'
let dirDestino=FileServer.getDirDestinoProceso(tipoProceso,mesProceso,empresa)



dirDestino='./testNominas/CLIENTE'

    // crea carpeta del mes en destino, si no existe 
    if (!fs.existsSync(dirDestino)){
  
      fs.mkdirSync(dirDestino,{recursive:true});
      console.log("no existe carpeta, creada la carpeta del mes")
  }else{
    console.log("existe la carpeta, se debe respaldar el contenido ")
    //////// activarla al final FileServer.backupFiles(dirDestino,empresa)


  }

  await generaFiles(infoPersonas,'CENCO1_CODI',dirDestino,empresa)



  dirDestino='./testNominas/INSTALACION'

    // crea carpeta del mes en destino, si no existe 
    if (!fs.existsSync(dirDestino)){
  
      fs.mkdirSync(dirDestino,{recursive:true});
      console.log("no existe carpeta, creada la carpeta del mes")
  }else{
    console.log("existe la carpeta, se debe respaldar el contenido ")
    //////// activarla al final FileServer.backupFiles(dirDestino,empresa)


  }

  await generaFiles(infoPersonas,'CENCO2_CODI',dirDestino,empresa)



  dirDestino='./testNominas/PERSONA'

  // crea carpeta del mes en destino, si no existe 
  if (!fs.existsSync(dirDestino)){

    fs.mkdirSync(dirDestino,{recursive:true});
    console.log("no existe carpeta, creada la carpeta del mes")
}else{
  console.log("existe la carpeta, se debe respaldar el contenido ")
  //////// activarla al final FileServer.backupFiles(dirDestino,empresa)


}

await generaFiles(infoPersonas,'NOMBRES',dirDestino,empresa)





}




async function generaFiles(data, filterField,dirDestino,empresa){




var options = {
  format: 'Letter',
  header:{height: "80mm"},
  footer: {
      height: "28mm",
      contents: {

     //   default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>'// fallback value
     default: '<span style="color: #444;">Página {{page}}</span>'// fallback value    
  }
      },
  orientation:'landscape',
  border: {
    top: "1cm",
    right: "1cm",
    bottom: "2cm",
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
       let datosNominaCC={MONTO_TOTAL:sumNominaCC,NUM_REGISTROS:cantRegistrosCC}


       ejs.renderFile("views/nomina_bancaria.ejs", { nomina: infoPersonasCC,datosNomina:datosNominaCC }, {}, function (err, data) {
        if (err)
        console.log(err)
      //console.log("data",data)

      let liquidacionID = "10.010-JEAN-TEST"
      var html = data;

      pdf.create(html, options).toStream(function (err, stream) {

        if (stream && !err) {
          //ejemplo de nombre de archivo 001-001[0]-RELIQUIDACION[2020-11-12]
    //      stream.pipe(fs.createWriteStream(FileServer.convertPath(dirDestino+"\\" + centro_costo+ "-["+empresa+"]"+nameFileSuffix+ ".pdf")));

    stream.pipe(fs.createWriteStream(FileServer.convertPath(dirDestino+"\\" + distinctFile+ "-["+empresa+"]"+ ".pdf")));

          resolves()



        } else {
          rejects()
          console.log("error en stream, " + distinctFile, err)

         
   

        }

      })  //termina pdf create



       })

    }))
    //termina iteracion

  
  }
  //termina for de nominas





}


var unique = (value, index, self) => {
    return self.indexOf(value) == index;
  }

module.exports = {
    getMontosNomina,getMontosNominaPDF,getMontosNominaFiles
  }