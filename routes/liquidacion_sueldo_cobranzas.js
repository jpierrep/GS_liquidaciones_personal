
'use strict'

    /**
    * Métodos para la generacion de liquidaciones de sueldos
    * @module /controllers/liquidacion_sueldo
    */



var express = require('express');

var Sequelize = require('sequelize');

var sequelizeMssql = require('../config/connection_mssql')
const VariablesFicha = sequelizeMssql.import('../models/soft_variables_ficha');
const TemplateLiquidacion = sequelizeMssql.import('../models/liquidacion_template');
var SoftlandController = require('../controllers/softland');
var api = express.Router();
const constants = require('../config/systems_constants')
const FileServer = require('../controllers/file_server');
const Utils = require('../controllers/utils');
const fs = require('fs');
var request = require('request');
const http = require('https');
var ejs = require('ejs');
var pdf = require('html-pdf');

const io = require('../index');
var ficha = ''

var StatusLiquidacionTemplate = {

  isExecuting: false,
  percent: 0,
  msgs: [],
  userParams:{}

}

//No puede ir dentro de una funcion pues lo utilizan los sockets
let pathLogs = 'data-logs/'


var StatusLiquidacion = JSON.parse(JSON.stringify(StatusLiquidacionTemplate))



console.log("liquidacion")



//carga plantilla db
var templateDB = require('../config/template_liquidacion_guard.json')


//reference 
//https://stackoverflow.com/questions/32674391/io-emit-vs-socket-emit
//https://medium.com/@satheesh1997/simple-chat-server-using-nodejs-socket-io-ce31294926d1 para ejemplo base

io.on('connection', (socket) => {

  //socket.on('estadoActual')
  socket.emit('getStatusLiquidacionCobranzas', StatusLiquidacion)

  console.log("a user connected via socket!")
  socket.on('disconnect', () => {
    console.log("a user disconnected!")
  });



  socket.on('getLiquidacionesCobranzas', async (dataUser) => {

    //data trae la info del mes y la empresa del proceso
    console.log("se empieza a ejecutar proceso liquidaciones: " + dataUser["mes"] + dataUser["empresa"])


    StatusLiquidacion = JSON.parse(JSON.stringify(StatusLiquidacionTemplate))
    StatusLiquidacion.isExecuting = true
    StatusLiquidacion.userParams={mes:dataUser["mes"],empresa:dataUser["empresa"]}
    io.emit('getStatusLiquidacionCobranzas', StatusLiquidacion)
    await getLiquidaciones("liquidacionCobranzas", dataUser)
    StatusLiquidacion.isExecuting = 0
    io.emit('getStatusLiquidacionCobranzas', StatusLiquidacion)     

  });




  
  api.get("/vistaProcesosCobranzas", function (req, res) {
  //http://localhost:3800/liquidacion_sueldo_cobranzas/vistaProcesosCobranzas
    res.render("../views/controla_proceso_cobranzas", { hola: "hola" });
  })




  //yyyyyyyy
  //api.get("/getLiquidaciones", async function (req, res, next) {

  /** 
 * Función principal que genera archivos de liquidaciones de sueldo
 * @async 
 * @function getLiquidaciones
 * @param {string} tipoProceso - tipo de proceso (liquidacion, reliquidacion)
 * @param {Object} dataUser - datos de los parametros de consulta del usuario, mes, empresa.
 
 * @return {Promise} 
*/
  async function getLiquidaciones(tipoProceso, dataUser) {
    console.log("proceso liquidacionesCobranzas")

    
    let dataValidar = [] //[{ficha:ficha1,valor:valorLiquidoficha1}]

    //let empresa = 2
    let empresa = dataUser["empresa"]

    let mesProceso = dataUser["mes"]  //ej 2020-01-01

    let variableBase = ''
    let variableValidacion=''
   
    
    let nameLogFile = ''
    let nameFileSuffix=''

    //para calcular la demora del proceso
    var startTime = new Date();
    var empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)

    //let templateDB = require('../config/' + empresaDetalle["TEMPLATE_LIQUIDACION"]) //archivo json con la plantilla para generar liquidaciones
    let templateDB = (await sequelizeMssql  .query(` SELECT  [VAR_NOMBRE]      ,[COLUMNA]      ,[POSICION]      ,[OFFSET]      ,[TIPO]      ,[VAR_CODI]      ,[SECTION]      ,[VAR_VALOR]      ,[EMPRESA]
  FROM `+constants.TABLE_TEMPLATE_LIQUIDACION.database+`.dbo.`+constants.TABLE_TEMPLATE_LIQUIDACION.table  
        , { model: TemplateLiquidacion,
          mapToModel: true, // pass true here if you have any mapped fields
          raw: true
        })).filter(x=>x.EMPRESA==empresa)

    let dirDestino=FileServer.getDirDestinoProceso(tipoProceso,mesProceso,empresa)
    //let pathBase=FileServer.getPathServerSobreLaboral() //revisa acceso a carpeta destino (carpeta compartida)
    
    if (!dirDestino){
      socket.emit('getGlobalAlert', {messaje:"Error, no hay acceso a carpeta de sobre laboral",type:'error'})
      return
    }


   // let dirDestino=pathBase+"/"+(new Date().getFullYear())+"/"+Utils.getMesName(mesProceso).toUpperCase()+"/LIQUIDACIONES/"+nameEmpresa  //path completo EJ \\192.168.100.69\sobrelaboral\Sistema_de_documentacion_laboral\2020\AGOSTO\LIQUIDACIONES\OUTSOURCING
      console.log("dir",dirDestino)
    
      // crea carpeta del mes en destino, si no existe 
    if (!fs.existsSync(dirDestino)){
    
      fs.mkdirSync(dirDestino,{recursive:true});
      console.log("no existe carpeta, creada la carpeta del mes")
  }else{
    console.log("existe la carpeta, se debe respaldar el contenido ")
    FileServer.backupFiles(dirDestino,empresa)

  }



  

    //tipo:"liquidacion","reliquidacion"
    if (tipoProceso == "liquidacionCobranzas") {


      //para liquidaciones, se extraen todas las peronas que tengan valor>0 en variableBase (h303 liquido pago)
      variableBase = 'H303'
      //variable para hacer realizar validacion del proceso (comparar al extraer data y luego despues de  generar pdfs)
      variableValidacion='H303'
      console.log("el mes seleccionado es")
        //dirDestino = "dataTest/testLiquidaciones"
      nameLogFile = 'liquidaCobranzas' // nombre del log proceso
      nameFileSuffix='-LIQUIDACION['+Utils.getDateFormat().substr(0,10)+']'//sufijo del nombre archivos

  
    } 
   

    return new Promise(async (resolve, reject) => {
      //http://localhost:3800/liquidacion_sueldo/getLiquidaciones


      //get data todas las fichas con data , traerse las variables y los cc
      //get info fichas

      //por cada cc
      //--> find info
      //-->find template
      //return template_personas
      //create Pdf



      let fichasVigentes = (await sequelizeMssql
        .query(`
  select distinct ficha
  FROM [SISTEMA_CENTRAL].[dbo].[sw_variablepersona]
  where 
  emp_codi='`+ empresa + `' and fecha='` + mesProceso + `'
  ---SOLO FILTRO PARA COBRANZAS
  --and codVariable='`+ variableBase + `' and valor>0

`
          , {

            model: VariablesFicha,
            mapToModel: true, // pass true here if you have any mapped fields
            raw: true
          })).map(x => x.ficha)
       // .filter(x=>x=="JUZTEPT124")
          //.slice(0,10)  //para control de cantidad de la cantidad de fichas que se generaran ***********


          //si no existen fichas, se termina el proceso
          if (fichasVigentes.length==0){
            console.log("no hay fichas,termina el proceso")
            socket.emit('getGlobalAlert', {messaje:"Error, no hay data para el proceso",type:'error'})
        

           //emitir mensaje de error
            //termina el promise
          resolve()
            //sale de la funcion, si no hay return, continua ejecutando lo siguiente
           return
          }

      //se deben listar todas las variables de la plantilla para añadirlos a la query  ej: 'h001','h220', para ello se transforma el array a ese formato
      //Existe una opcion que lo hace automatico (replacements), pero al testearla relentiza la query ya que añade el formato nvarchar ej: N'h001',N'h220' (demoró 10 seg. mas en ejecutarse) 
      let variablesTemplate = templateDB.filter(x => x["VAR_CODI"]).map(x => x["VAR_CODI"])
      variablesTemplate = JSON.stringify(variablesTemplate).replace('[', '').replace(']', '').replace(/"/g, "'")


      let dataVariablesPersona = (await sequelizeMssql
        .query(`
    SELECT *
    FROM [SISTEMA_CENTRAL].[dbo].[sw_variablepersona]
   -- where emp_codi=0 and codVariable='H303' 
  
   where 
   emp_codi=`+ empresa + `
   and fecha='`+ mesProceso + `'
   ---SOLO FILTRO PARA COBRANZAS
  -- and codVariable in (`+ variablesTemplate + `)
   
   `
          , {
            // replacements: { variablesTemplate: variablesTemplate },
            model: VariablesFicha,
            mapToModel: true, // pass true here if you have any mapped fields
            raw: true
          })).filter(x => fichasVigentes.includes(x.ficha))
      
      //.map(x => x.CENCO2_CODI)//.slice(0,50)  //para control de cantidad de cc para testear


      let infoPersonas = (await SoftlandController.getFichasInfoPromiseMes(fichasVigentes, empresa, mesProceso))


      //distinct cc
      let unique = (value, index, self) => {
        return self.indexOf(value) == index;
      }


      let distinctCC = infoPersonas.map(x => { return x.CENCO2_CODI }).filter(unique)//.slice(0, 3)
      // distinctCC = ["958-007"]
      //   distinctCC = ["129-001"]
      //distinctCC = ["162-009"]

      console.log(distinctCC.length)


      let path = ""
      // let batch = 1
      // let cantIteraciones = parseInt(distinctCC.length / batch) + 1 //si tiene decimales 
      let cantIteraciones = distinctCC.length
      console.log("total registros:", distinctCC.length, "cantidad iteraciones", cantIteraciones)

      for (let i = 0; i < cantIteraciones; i++) {

        let centro_costo = distinctCC[i]

        await (new Promise(async (resolves, rejects) => {


          //  let getFilesPromises = distinctCC.slice(i * batch, (i * batch) + batch).map(async centro_costo => {


          let filename = centro_costo + ".pdf"

          //await getLiquidacionCentroCosto(null, centro_costo, mes, empresa, path + filename)
          //desde aca es centro de costo

          var options = {
            format: 'Letter',
            border: {
              top: "0.5cm",
              right: "0.5cm",
              bottom: "1cm",
              left: "0.5cm"
            },

            timeout: 100000,
          };

          let infoPersonasCC = infoPersonas.filter(x => x.CENCO2_CODI == centro_costo)
          var templates_persona = []

          let fichasCC = infoPersonasCC.map(x => x.FICHA).filter(unique)
          console.log('fichasCC', fichasCC)

          fichasCC.map(ficha => {

            let dataVariablesPersonaCC = dataVariablesPersona.filter(x => x.ficha == ficha)

            //console.log("data persona",ficha,dataVariablesPersonaCC)
            //se tiene la data: dataVariablesPersonaCC e info personas:infoPersonasCC ahora toca llenar la template

            var templateBase = JSON.parse(JSON.stringify(templateDB))
            var filledTemplate = []
            var template = []
            filledTemplate = fillTemplate(templateBase, dataVariablesPersonaCC)

            template = formatTemplate(filledTemplate)
            let persona = infoPersonasCC.find(x => x.FICHA == ficha)

            // console.log(persona)
            //se añade la infor de una persona //CAMBIAR A LA PERSONA CORRESPONDIENTE (BUSCAR EN INFOPERSONA)
            //se pasa filled template pues ahí se pueden recorrer la data para validar, template viene formateada con columnasy es mas dificil recorrer
            templates_persona.push({ ficha: ficha, persona: persona, template: template, data: filledTemplate })

          })
          console.log("antes_data")

          ejs.renderFile("views/liquidacion_sueldo_multiple - copia.ejs", { templates_persona: templates_persona, empresaDetalle: empresaDetalle, mes: mesProceso }, {}, function (err, data) {
            if (err)
              console.log(err)
            //console.log("data",data)

            let liquidacionID = "10.010-JEAN-TEST"
            var html = data;


            pdf.create(html, options).toStream(function (err, stream) {

              //    res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
              //    res.setHeader('Content-Type', 'application/pdf');
              //    stream.pipe(res);
              if (stream && !err) {
                //ejemplo de nombre de archivo 001-001[0]-RELIQUIDACION[2020-11-12]
                stream.pipe(fs.createWriteStream(FileServer.convertPath(dirDestino+"\\" + centro_costo+ "-["+empresa+"]"+nameFileSuffix+ ".pdf")));
                // stream.pipe(res);


                //recorre todas las personas (ficha) y busca la variable a validar (H303 ) liquido a pago , para luego validar con la data de base, con ello
                //sabemos si se ejecutó completamente el proceso


                templates_persona.forEach(persona => {
                  let ficha = persona.ficha
                 // console.log(persona["data"])
                 let monto = persona["data"].find(x => x["VAR_CODI"] == variableValidacion)
                 if (monto) monto=monto["VAR_VALOR"] 
                 else monto=null
                  dataValidar.push({ ficha: ficha, monto: monto })
                })

                resolves()


                // resolve({status:"oka"})
                //con esto evitamos que se acumule la memoria, tambien el return lo hace  
                //return next()
              } else {
                rejects()
                console.log("error en stream, " + centro_costo, err)

                if (tipoProceso == "liquidacionCobranzas") {
                  StatusLiquidacion.msgs[0] = "falloo el centro " + centro_costo + " " + err
                  // StatusLiquidacion.percent = parseInt((i + 1) / distinctCC.length * 100)
                  io.emit('getStatusLiquidacionCobranzas', StatusLiquidacion)
                } 


              }


            })


          })


        }))



        //   await Promise.all(getFilesPromises)
        console.log("todos los trabajos terminados iteracion ", i)
        //aca esta ok, asi que emitimos evento    
        if (tipoProceso == "liquidacionCobranzas") {
          StatusLiquidacion.msgs[0] = centro_costo
          StatusLiquidacion.percent = parseInt((i + 1) / distinctCC.length * 100)
          io.emit('getStatusLiquidacionCobranzas', StatusLiquidacion)
        } 

        //termina

      }


      //await Promise.all(allLiquidaciones)
      console.log("todos los trabajos terminados aa")

      // para calular la demora se contrasta con startTime
      var endTime = new Date();
      var demoraSeconds = parseInt((endTime.getTime() - startTime.getTime()) / 1000);

      //efectua validacion
      let statusValidacion = "OK"

      // console.log("eeee",dataVariablesPersona.filter(x=>x["codVariable"]=='H303'))
      dataVariablesPersona.filter(x => x["codVariable"] == variableValidacion).forEach(persona => {
        //aca, si la persona existe y no tiene monto pasará la prueba porque quedará null
        let existe = dataValidar.find(x => x.ficha == persona.ficha)
        if (!existe || persona["valor"] != existe["monto"]) {
          console.log("error en la ficha", persona.ficha)
          statusValidacion = "ERR"
        }
        else existe["montoimpreso"] = persona["valor"]


        return
      })
      //guarda logs de las validaciones

 
      let formatDate = Utils.getDateFormat()

      //path +validacion (OK,ERR)+proceso(Liq,reliq)+empresa(0,1,2), fecha (yyy-mm-dd-hh-mm-ss), tiempo demora (s)
      fs.appendFileSync(pathLogs + statusValidacion + "-" + nameLogFile + "-" + empresa + "-" + formatDate + "-" + demoraSeconds + ".txt", JSON.stringify(dataValidar));
      console.log("todos las validaciones hechas")
      io.emit('getGlobalAlert', {messaje:"Proceso concluido exitosamente",type:'success'})
      //return res.status(200).send({ status: "ok" })
      resolve()
      return
    })
  }


}) //cierra socket









/** 
 * Funcion que dada una plantilla de sueldo de una empresa dada y todas las varialbes de una ficha dada, devuelve la plantilla rellena con los datos entregados
 * @function fillTemplate
 * @param {Object[]} templatebase - Template de planilla de sueldo de la empresa correspondiente 
 * @param {VariablesFicha[]} variablesPersona - Variables del mes correspondiente a la ficha
 * @return {Object[]} 
*/
function fillTemplate(templatebase, variablesPersona) {

  /* RESULTADO EJEMPLO   templatebase 
[ { VAR_NOMBRE: 'DIAS TRABAJADOS',
    COLUMNA: 1,
    POSICION: 1,
    OFFSET: 1,
    TIPO: 'NORMAL',
    VAR_CODI: 'P010',
    SECTION: 'BODY',
    VAR_VALOR: '30' },
  { VAR_NOMBRE: 'CANT.HHEE ENAP',
    COLUMNA: 1,
    POSICION: 3,
    OFFSET: null,
    TIPO: 'NORMAL',
    VAR_CODI: 'P052',
    SECTION: 'BODY',
    VAR_VALOR: '55' },
  { VAR_NOMBRE: 'HH COMP. FESTIVOS ENAP',
    COLUMNA: 1,
    POSICION: 5,
    OFFSET: null,
    TIPO: 'NORMAL',
    VAR_CODI: 'P041',
    SECTION: 'BODY',
    VAR_VALOR: '11' }]
  */

  //llenamos la templatebase
  templatebase.forEach(variable => {
    if (variable.TIPO == "NORMAL" || variable.TIPO == "TOTAL") {
      let varBuscar = variablesPersona.find(x => x.codVariable == variable.VAR_CODI)
      if (varBuscar) variable.VAR_VALOR = varBuscar.valor
      else variable.VAR_VALOR = null
    }

  })

  //si existe un atributo con offset sin valor en la variable, este espacio no se verá reflejado, por lo que deberá pasarse al atributo anterior con valor en la variable
  templatebase.forEach((variable, index) => {
    if (variable.OFFSET > 0 && !variable.VAR_VALOR) {
      // console.log("hay una",variable)
      //buscar la anterior en la misma columna con variable.VAR_VALOR>0
      for (var i = index; i >= 0; i--) {
        //if (templatebase[i-1].COLUMNA==variable.COLUMNA&&templatebase[i-1].VAR_VALOR&&!templatebase[i-1].OFFSET){
        if (templatebase[i - 1] && templatebase[i - 1]["COLUMNA"] && templatebase[i - 1].COLUMNA == variable.COLUMNA && templatebase[i - 1].VAR_VALOR && !templatebase[i - 1].OFFSET) {

          templatebase[i - 1].OFFSET = variable.OFFSET
          //   console.log("encontrado")
          break;
        }
      }

    }

  })
  //filtramos las variables que tienen dato o son t itulos
  //si se deben dejar fijas algunas variables, se debe permitir marcador que tome la posicion y la deje fija
  //luego la pinte como tds de tabla vacios, asi los espacios son fijos
  //console.log("templatebase",templatebase.filter(x => x.TIPO == "TITULO" || ((x.TIPO == "NORMAL" || x.TIPO == "TOTAL") && x.VAR_VALOR)))
  return templatebase.filter(x => x.TIPO == "TITULO" || ((x.TIPO == "NORMAL" || x.TIPO == "TOTAL") && x.VAR_VALOR))


}

/** 
 * Funcion dada la planitlla  de sueldos rellena con los datos, le añade el formato (columnas, saltos, etc) para que luego sea pasada a la vista
 * @function formatTemplate
 * @param {Object[]} templatebase - Plantilla rellena con datos de una ficha
 * @return {Object[]} 
*/
function formatTemplate(templateBase) {

  /*
  EJEMPLO template llena
     [ [ { VAR_NOMBRE: 'DIAS TRABAJADOS',
        COLUMNA: 1,
        POSICION: 1,
        OFFSET: 1,
        TIPO: 'NORMAL',
        VAR_CODI: 'P010',
        SECTION: 'BODY',
        VAR_VALOR: '30' },
      { VAR_NOMBRE: 'DESCUENTOS',
        COLUMNA: 2,
        POSICION: 1,
        OFFSET: 1,
        TIPO: 'TITULO',
        VAR_CODI: 'P',
        SECTION: 'BODY',
        VAR_VALOR: 10000 } ],
    [ {}, {} ]
    ]
    */
  //pedir el mes y ficha para obtener data

  //get max posicion para saber cuantas filas tendra
  //hacer un for incremental con posicion paraa iterar por posicion (seran los datos del vector)
  //ordernar por columna luego para que quede en orden final
  //buscar el valor de la variable y llenar otros


  //formaremos por cada fila de la template un array con el largo de las columnas
  // por cada columna, ordenaremos las filas de menor a mayor, luego añadiremos los espacios (offset)
  //teniendo esto haremos merge por posicion ordenada

  //finalmente rellenar con las variables y quitar aquellas que estan vacias

  let maxColumns = Math.max.apply(Math, templateBase.map(x => { return x.COLUMNA }))
  //let maxColumns=templatebase.map(x=>{return x.COLUMNA})
  console.log(maxColumns)
  let arrayOffsets = []

  for (var i = 1; i <= maxColumns; i++) {

    let variablesColumns = templateBase.filter(x => x.COLUMNA == i)
    let nuevoArregloColumns = []

    //añade los offset a las filas ordenadas de la columna
    variablesColumns.sort((a, b) => (a.POSICION > b.POSICION) ? 1 : -1).forEach(variable => {
      //si el arreglo ordenado no tiene saltos de linea se agrega al nuevo arreglo, si no , se añase el salto de lienea ({})

      nuevoArregloColumns.push(variable)
      if (variable.OFFSET != null) {
        for (var x = 1; x <= variable.OFFSET; x++) {
          nuevoArregloColumns.push({})
        }
      }
    })
    arrayOffsets.push(nuevoArregloColumns)
  }

  //console.log("arrayOffsets",arrayOffsets)
  //juntar por index los arreglos offset, para formato final 

  let maxPosicion = Math.max(...arrayOffsets.map(x => { return x.length }))
  console.log("maxPosicion", maxPosicion)
  let arrayFormat = []
  //hacemos merge por posicion
  for (i = 1; i <= maxPosicion; i++) {
    let arrayPosicion = []
    for (var x = 1; x <= maxColumns; x++) {

      if (arrayOffsets[x - 1][i - 1] == undefined) arrayPosicion.push({})
      else arrayPosicion.push(arrayOffsets[x - 1][i - 1])
    }
    arrayFormat.push(arrayPosicion)
  }




  //console.log("template",templatebase)
  //console.log("arrayFormat",arrayFormat)


  //console.log('template format',arrayFormat)
  return arrayFormat

}





module.exports = api;