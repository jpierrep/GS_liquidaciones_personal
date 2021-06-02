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

//res.status(200).send(infoPersonas)

res.render("../views/nomina_bancaria", { nomina: infoPersonas });


  

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

//res.status(200).send(infoPersonas)

res.render("../views/nomina_bancaria", { nomina: infoPersonas });


  

}

module.exports = {
    getMontosNomina,getMontosNominaPDF
  }