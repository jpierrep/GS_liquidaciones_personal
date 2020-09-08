
'use strict'

var express = require('express');

var Sequelize = require('sequelize');

var sequelizeMssql = require('../config/connection_mssql')
const VariablesFicha = sequelizeMssql.import('../models/soft_variables_ficha');

var SoftlandController = require('../controllers/softland');
var api = express.Router();
const constants = require('../config/systems_constants')
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
  msgs: []
}

//No puede ir dentro de una funcion pues lo utilizan los sockets
let pathLogs='data-logs/'


var StatusLiquidacion = JSON.parse(JSON.stringify(StatusLiquidacionTemplate))
var StatusReliquidacion = JSON.parse(JSON.stringify(StatusLiquidacionTemplate))


console.log("liquidacion")


api.get("/testView2", function (req, res) {
  console.log("he")
      res.render("../views/controla_proceso", { hola: "hola" });
    })
  

//carga plantilla db
var templateDB = require('../config/template_liquidacion.json')


//reference 
//https://stackoverflow.com/questions/32674391/io-emit-vs-socket-emit
//https://medium.com/@satheesh1997/simple-chat-server-using-nodejs-socket-io-ce31294926d1 para ejemplo base

io.on('connection', (socket) => {

  //socket.on('estadoActual')
  socket.emit('getStatusLiquidacion', StatusLiquidacion)
  socket.emit('getStatusReliquidacion', StatusReliquidacion)

  console.log("a user connected via socket!")
  socket.on('disconnect', () => {
    console.log("a user disconnected!")
  });



  socket.on('getLiquidaciones', async (msg) => {

    console.log("se empieza a ejecutar proceso liquidaciones: " + msg)

    StatusLiquidacion = JSON.parse(JSON.stringify(StatusLiquidacionTemplate))
    StatusLiquidacion.isExecuting = true

    io.emit('getStatusLiquidacion', StatusLiquidacion)
    await getLiquidaciones("Liquidacion")
    StatusLiquidacion.isExecuting = 0
    io.emit('getStatusLiquidacion', StatusLiquidacion)
 
  });



  socket.on("getFile",function(fileName){
    //lee un archivo segun parametro de nombre
//let filedata=fs.readFileSync(pathLogs+'/liquida-01-01-01-019191.txt')
let filedata=fs.readFileSync(pathLogs+'/'+fileName)

 socket.emit("sendfile", filedata.toString(),fileName); 

 
});


socket.on("getFileName",async (proceso) => {
 let controlProceso=""

 //añadiendo el guion en el nombre del proceso se puede identificar sin problemas
  if (proceso=="reliquidacion") 
  controlProceso="-reliquida"
  if (proceso=="liquidacion") 
  controlProceso="-liquida"

  console.log("aaaa"+controlProceso)

  //obtiene el listado de archivos del log
  //theString.match(/^.*abc$/) //filter proceso

 // let archivos=fs.readdirSync(pathLogs).filter(x=>x.match(`/^.*`+controlProceso+`$/`))
 
 
 let archivos=fs.readdirSync(pathLogs).filter(x=>x.indexOf(controlProceso)>-1).slice(0,9).sort().reverse()
  socket.emit("sendFileNames", archivos); 
  console.log(archivos)
  
   
  });



  socket.on('getReliquidaciones', async (msg) => {


    console.log("se empieza a ejecutar proceso Reliquidaciones: " + msg)
    StatusReliquidacion = JSON.parse(JSON.stringify(StatusLiquidacionTemplate))
    StatusReliquidacion.isExecuting = true
    io.emit('getStatusReliquidacion', StatusReliquidacion)
    await getLiquidaciones("Reliquidacion")
    StatusReliquidacion.isExecuting = 0
    io.emit('getStatusReliquidacion', StatusReliquidacion)

  });



  api.get("/testView", function (req, res) {
console.log("he")



 res.render("../views/controla_proceso", { hola: "hola" });
  })



  api.get("/:ficha/:mes/:empresa", async function (req, res) {
    //http://192.168.0.130:3800/liquidacion_sueldo/JUZCFLPM70/2019-05-01/0
    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"
    //let empresa=0


    let ficha = req.params.ficha
    let mes = req.params.mes
    let empresa = 0

    console.log(ficha, mes, empresa)

    //obtenemos la variable persona
    let variablesPersona = await VariablesFicha.findAll({
      where: {
        emp_codi: empresa,
        ficha: ficha,
        fecha: mes
      }
    })


    var templateBase = JSON.parse(JSON.stringify(templateDB))

    var filledTemplate = fillTemplate(templateBase, variablesPersona)

    var template = formatTemplate(filledTemplate)

    res.render("../views/liquidacion_sueldo", { template: template });

  });


  api.get("/liquidacion_sueldo_cc/:centro_costo/:mes/:empresa", async function (req, res) {
    //http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_sueldo_cc/008-047/2019-08-01/0
    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"
    //let empresa=0

    //añadir empresa

    let centro_costo = req.params.centro_costo
    let mes = req.params.mes
    let empresa = 0


    let fichasVigentes = await sequelizeMssql
      .query(`select FICHA from [Inteligencias].[dbo].[VIEW_SOFT_PERSONAL_VIGENTE] where FECHA_SOFT='` + mes + `'  and EMP_CODI=` + empresa + ` and CENCO2_CODI='` + centro_costo + `'`
        , {

          model: VariablesFicha,
          mapToModel: true // pass true here if you have any mapped fields
        })
    console.log(JSON.parse(JSON.stringify(fichasVigentes)))

    fichasVigentes = JSON.parse(JSON.stringify(fichasVigentes)).filter(x => x.FICHA == 'ASMAR028' || x.FICHA == 'ASMAR001' || x.FICHA == 'ASMAR006')
    let templates_persona = []
    let fichasVigentesPromises = fichasVigentes.map(async ficha => {

      console.log(ficha.FICHA, mes, empresa)

      //obtenemos la variable persona
      let variablesPersona = await VariablesFicha.findAll({
        where: {
          emp_codi: empresa,
          ficha: ficha.FICHA,
          fecha: mes
        }
      })

      var templateBase = JSON.parse(JSON.stringify(templateDB))
      var filledTemplate = []
      var template = []
      filledTemplate = fillTemplate(templateBase, variablesPersona)

      template = formatTemplate(filledTemplate)
      templates_persona.push({ persona: {}, template: template })

    })

    await Promise.all(fichasVigentesPromises)



    res.render("../views/liquidacion_sueldo_multiple", { templates_persona: templates_persona });

  });



  api.get("/liquidacion_sueldo_cc_pdf/:centro_costo/:mes/:empresa", async function (req, res) {
    // http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_sueldo_cc/008-047/2019-08-01/0
    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"
    //let empresa=0

    //añadir empresa

    let centro_costo = req.params.centro_costo
    let mes = req.params.mes
    let empresa = 0

    var options = {
      format: 'Letter',
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "2cm",
        left: "1cm"
      },
      timeout: 30000,

    };


    let fichasVigentes = await sequelizeMssql
      .query(`select FICHA from [Inteligencias].[dbo].[VIEW_SOFT_PERSONAL_VIGENTE] where FECHA_SOFT='` + mes + `'  and EMP_CODI=` + empresa + ` and CENCO2_CODI='` + centro_costo + `'`
        , {

          model: VariablesFicha,
          mapToModel: true // pass true here if you have any mapped fields
        })
    console.log(JSON.parse(JSON.stringify(fichasVigentes)))

    fichasVigentes = JSON.parse(JSON.stringify(fichasVigentes)).filter(x => x.FICHA == 'ASMAR028' || x.FICHA == 'ASMAR001' || x.FICHA == 'ASMAR006')
    let templates_persona = []
    let fichasVigentesPromises = fichasVigentes.map(async ficha => {

      console.log(ficha.FICHA, mes, empresa)

      //obtenemos la variable persona
      let variablesPersona = await VariablesFicha.findAll({
        where: {
          emp_codi: empresa,
          ficha: ficha.FICHA,
          fecha: mes
        }
      })

      var templateBase = JSON.parse(JSON.stringify(templateDB))
      var filledTemplate = []
      var template = []
      filledTemplate = fillTemplate(templateBase, variablesPersona)

      template = formatTemplate(filledTemplate)
      templates_persona.push({ persona: {}, template: template })

    })

    await Promise.all(fichasVigentesPromises)



    res.render("../views/liquidacion_sueldo_multiple", { templates_persona: templates_persona }, async function (err, data) {

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




  });




  //yyyyyyyy
  //api.get("/getLiquidaciones", async function (req, res, next) {
  async function getLiquidaciones(tipoProceso) {
  
    
    let dataValidar=[] //[{ficha:ficha1,valor:valorLiquidoficha1}]
    let empresa = 0

     //tipo:"Liquidacion","Reliquidacion"
     let variableValidar=''
     let mesProceso=''
     let pathArchivos=''
     let nameLogFile=''

     //para calcular la demora del proceso
     var startTime= new Date();
  

   if(tipoProceso=="Liquidacion"){
     //extraer mes actual
     //extraer variable liquidacion

     variableValidar='H303'
     mesProceso='2020-08-01'
     pathArchivos="dataTest/testLiquidaciones/"
     nameLogFile='liquida'

   }if(tipoProceso=="Reliquidacion"){

    variableValidar='H068'
    mesProceso='2020-07-01'
    pathArchivos="dataTest/testReliquidaciones/"
    nameLogFile='reliquida'

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
   emp_codi=0 and fecha='`+mesProceso+`'
   and codVariable='`+variableValidar+`' and valor>0

`
          , {

            model: VariablesFicha,
            mapToModel: true, // pass true here if you have any mapped fields
            raw: true
          })).map(x => x.ficha)//.slice(0,10)  //para control de cantidad de la cantidad de fichas que se generaran ***********




      let dataVariablesPersona = (await sequelizeMssql
        .query(`
    SELECT *
    FROM [SISTEMA_CENTRAL].[dbo].[sw_variablepersona]
   -- where emp_codi=0 and codVariable='H303' 
  
   where 
   emp_codi=`+ empresa + `
   and fecha='`+ mesProceso + `'
   and codVariable in (
   'P010','P053','P052','P050','P041','H001','H007','H008','H002','H003'
   ,'H016','H030','H031','H029','H024','H013','H074','H020','H043','H050'
   ,'H044','P044','H350','H100','H060','H062','H064','H061','H063','H065'
   ,'H025','H027','H026','H085','H080','H072','H073','H071','H351','H200'
   ,'H300','D003','D020','D004','D021','D100','D005','D007','D006','D022'
   ,'D030','D031','D040','D050','D061','D064','D065','D070','D080','D090'
   ,'D091','D009','D101','D104','H303'
   
   )
`
          , {

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
    //distinctCC = ["165-001"]
  //   distinctCC = ["129-001"]
  //distinctCC = ["162-009"]

      console.log(distinctCC.length)



      let path = ""
     // let batch = 1
     // let cantIteraciones = parseInt(distinctCC.length / batch) + 1 //si tiene decimales 
     let cantIteraciones = distinctCC.length//si tiene decimales 
     console.log("total registros:", distinctCC.length, "cantidad iteraciones", cantIteraciones)

      for (let i = 0; i < cantIteraciones; i++) {

        let centro_costo = distinctCC[i]

    await(  new Promise(async (resolves, rejects) => {
    
       
          //  let getFilesPromises = distinctCC.slice(i * batch, (i * batch) + batch).map(async centro_costo => {


          let filename = centro_costo + ".pdf"

          //await getLiquidacionCentroCosto(null, centro_costo, mes, empresa, path + filename)
          //desde aca es centro de costo
          var empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)
          var options = {
            format: 'Letter',
            border: {
              top: "1cm",
              right: "1cm",
              bottom: "2cm",
              left: "1cm"
            },
            
            timeout: 100000,
          };

          let infoPersonasCC = infoPersonas.filter(x => x.CENCO2_CODI == centro_costo)
          var templates_persona = []

          let fichasCC = infoPersonasCC.map(x => x.FICHA).filter(unique)
          console.log('fichasCC',fichasCC)

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
            templates_persona.push({ ficha: ficha, persona: persona, template: template,data:filledTemplate })

          })
            console.log("antes_data")

            ejs.renderFile("views/liquidacion_sueldo_multiple - copia.ejs", { templates_persona: templates_persona, empresaDetalle: empresaDetalle,mes: mesProceso }, {}, function (err, data) {
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

                  stream.pipe(fs.createWriteStream(pathArchivos + centro_costo + ".pdf"));
                  // stream.pipe(res);
                  

                  //recorre todas las personas (ficha) y busca la variable a validar (H303 ) liquido a pago , para luego validar con la data de base, con ello
                  //sabemos si se ejecutó completamente el proceso
                
                  
                
                  templates_persona.forEach(persona=>{
                    let ficha=persona.ficha
                   console.log(persona["data"])
                    let monto= persona["data"].find(x=>x["VAR_CODI"]=="H303")["VAR_VALOR"]
                    
                    dataValidar.push({ficha:ficha,monto:monto})
                  })
               
                  resolves()
                 
                
                  // resolve({status:"oka"})
                  //con esto evitamos que se acumule la memoria, tambien el return lo hace  
                  //return next()
                } else {
                  rejects()
                  console.log("error en stream, " + centro_costo,err)
          
                   if(tipoProceso=="Liquidacion"){ 
                    StatusLiquidacion.msgs[0] = "falloo el centro "+  centro_costo +" "+err
                    // StatusLiquidacion.percent = parseInt((i + 1) / distinctCC.length * 100)
                     io.emit('getStatusLiquidacion', StatusLiquidacion)
                    } if(tipoProceso=="Reliquidacion"){ 
                      StatusReliquidacion.msgs[0] = "falloo el centro "+  centro_costo +" "+err
                      // StatusLiquidacion.percent = parseInt((i + 1) / distinctCC.length * 100)
                       io.emit('getStatusReliquidacion', StatusReliquidacion)
                      }
              
              
                }




              })


            })



          



            }))




          //   await Promise.all(getFilesPromises)
          console.log("todos los trabajos terminados iteracion ", i)
          //aca esta ok, asi que emitimos evento    
          if(tipoProceso=="Liquidacion"){ 
          StatusLiquidacion.msgs[0] = centro_costo
          StatusLiquidacion.percent = parseInt((i + 1) / distinctCC.length * 100)
          io.emit('getStatusLiquidacion', StatusLiquidacion)
          } if(tipoProceso=="Reliquidacion"){ 
            StatusReliquidacion.msgs[0] = centro_costo
            StatusReliquidacion.percent = parseInt((i + 1) / distinctCC.length * 100)
            io.emit('getStatusReliquidacion', StatusReliquidacion)
            }
          
          //termina
       
      }


      //await Promise.all(allLiquidaciones)
      console.log("todos los trabajos terminados aa")
  
   // para calular la demora se contrasta con startTime
   var endTime   = new Date();
   var demoraSeconds = parseInt((endTime.getTime() - startTime.getTime()) / 1000);

      //efectua validacion
      let statusValidacion="OK"

     // console.log("eeee",dataVariablesPersona.filter(x=>x["codVariable"]=='H303'))
      dataVariablesPersona.filter(x=>x["codVariable"]=='H303').forEach(persona=>{
      let existe=   dataValidar.find(x=>x.ficha==persona.ficha)
      if(!existe||persona["valor"]!=existe["monto"]){
      console.log("error en la ficha",persona.ficha)
      statusValidacion="ERR"
    }
      else   existe["montoimpreso"]=persona["valor"]
      

        return
      })
  //guarda logs de las validaciones

  ///var dateString=new Date().toISOString().substr(0,10)
//replace(/T/, ' ').  
//replace(/\..+/, '').
 // replace(/:/g, '-')

var m = new Date();
let formatDate=(m.getFullYear()>9?m.getFullYear():'0'+m.getFullYear())+"-"+((m.getMonth()+1)>9?(m.getMonth()+1):'0'+(m.getMonth()+1))+"-"+(m.getDate()>9?m.getDate():'0'+m.getDate())

 let formatHour= (m.getHours()>9?m.getHours():'0'+m.getHours()) + "-" + (m.getMinutes()>9?m.getMinutes():'0'+m.getMinutes()) + "-" + (m.getSeconds()>9?m.getSeconds():'0'+m.getSeconds())
 console.log(formatDate+"-"+formatHour)
 
      fs.appendFileSync(pathLogs+statusValidacion+"-"+nameLogFile+"-"+formatDate+"-"+formatHour+"-"+demoraSeconds+".txt", JSON.stringify(dataValidar));
      console.log("todos las validaciones hechas")



      //return res.status(200).send({ status: "ok" })
      resolve()
    })
  }


  //xxxxx
  //api.get("/getLiquidaciones", async function (req, res, next) {
  async function getLiquidaciones2() {

    return new Promise(async (resolve, reject) => {
      //http://localhost:3800/liquidacion_sueldo/getLiquidaciones

      let mes = '2020-07-01'
      let empresa = 0
      //Actualizar vacaciones GUARD
      let ccVigentes = (await sequelizeMssql
        .query(`
      SELECT CENCO2_CODI,count(*) as cant
      FROM [Inteligencias].[dbo].[VIEW_SOFT_PERSONAL_VIGENTE]
      where FECHA_SOFT='`+ mes + `'
      and ESTADO='V'
      and emp_codi=`+ empresa + `
      
      group by CENCO2_CODI
  `
          , {

            model: VariablesFicha,
            mapToModel: true, // pass true here if you have any mapped fields
            raw: true
          })).map(x => x.CENCO2_CODI)//.slice(0,50)  //para control de cantidad de cc para testear

      /*
    
      async function printFiles () {
       const files = await getFilePaths();
     
       for (const file of files) {
         const contents = await fs.readFile(file, 'utf8');
         console.log(contents);
       }
     }
    
     */

      console.log(JSON.parse(JSON.stringify(ccVigentes)))
      //truncado los 4 primeros para testing

      //let allLiquidaciones=
      // for(const centro_costo of ccVigentes.slice(0,20)){

      /*
      
      for (var i=0;i<ccVigentes.length;i=i+10){
     // for (var i = 0; i < 20; i = i + 20) {
    
        for (const centro_costo of ccVigentes.slice(i, i + 10)) {
          console.log("el centro costo es " + centro_costo)
          try {
            console.log("testeando")
            let response = await request.get('http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_sueldo_cc_pdf_test/' + centro_costo + '/2019-08-01/0');
    
            //console.log("holaaaaa",hola)
            console.log("terminó cc", centro_costo)
            if (response.err) { console.log('error');}
            else { console.log('fetched response');
        }
    
          } catch (e) {
         return   res.status(500).send({ error: 'error en  request pdf cc', cc: centro_costo, e: e.message, ee: e.stack })
    
    
          }
        }
      }
    
      */

      let path = ""
      let batch = 1
      let cantIteraciones = parseInt(ccVigentes.length / batch) + 1 //si tiene decimales 
      console.log("total registros:", ccVigentes.length, "cantidad iteraciones", cantIteraciones)

      for (let i = 0; i < cantIteraciones; i++) {
        let getFilesPromises = ccVigentes.slice(i * batch, (i * batch) + batch).map(async centro_costo => {
          let filename = centro_costo + ".pdf"
          await getLiquidacionCentroCosto(null, centro_costo, mes, empresa, path + filename)
          StatusLiquidacion.msgs[0] = centro_costo
          StatusLiquidacion.percent = parseInt((i + 1) / ccVigentes.length * 100)
          io.emit('getStatus', StatusLiquidacion)

        })

        /*
        for (let i=0; i<cantIteraciones; i++){
        let getFilesPromises= ccVigentes.slice(i*batch,(i*batch)+batch).map(async centro_costo=>{
         //let filename=ficha+".pdf"
         // await getLiquidacionFichaMes(res,ficha,mes,empresa,path+filename)
         await request.get('http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_sueldo_cc_pdf_test/' + centro_costo + '/2019-08-01/0');
          
        })
      
      */

        await Promise.all(getFilesPromises)
        console.log("todos los trabajos terminados iteracion ", i - 10)

      }

      //await Promise.all(allLiquidaciones)
      console.log("todos los trabajos terminados")
      //return res.status(200).send({ status: "ok" })
      resolve()
    })
  }




  api.get("/liquidacion_fichas_reliquidadas", async function (req, res, next) {
    let empresa = 0
    let mes = '2019-05-01'
    let path = "dataTest/testReliquidacionesPersona/"
    let varReliquidacion = constants.VARIABLES_PARAMETERS.find(x => x["nombre"] == "RELIQUIDACION")["variable"]
    //obtenemos la variable persona
    let personalFicha = (await VariablesFicha.findAll({
      where: {
        emp_codi: empresa,
        fecha: mes,
        codVariable: varReliquidacion
      }
    })).map(x => x["ficha"]) //.slice(0,20)
    console.log("las fichas son", personalFicha)



    let batch = 20
    let cantIteraciones = parseInt(personalFicha.length / batch) + 1 //si tiene decimales
    console.log("total registros:", personalFicha.length, "cantidad iteraciones", cantIteraciones)


    for (let i = 0; i < cantIteraciones; i++) {
      let getFilesPromises = personalFicha.slice(i * batch, (i * batch) + batch).map(async ficha => {
        let filename = ficha + ".pdf"
        await getLiquidacionFichaMes(res, ficha, mes, empresa, path + filename)

      })

      await Promise.all(getFilesPromises)
      console.log("todos los trabajos terminados iteracion ", i)

    }


    return res.status(200).send({ status: "ok" })


  })










  api.get("/liquidacion_sueldo_cc_pdf_test/:centro_costo/:mes/:empresa", async function (req, res, next) {
    // http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_sueldo_cc/008-047/2019-08-01/0
    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"
    //let empresa=0

    //añadir empresa

    var centro_costo = req.params.centro_costo
    var mes = req.params.mes
    var empresa = 0
    var empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)
    var options = {
      format: 'Letter',
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "2cm",
        left: "1cm"
      },

    };


    let fichasVigentes = (await sequelizeMssql
      .query(`select FICHA from [Inteligencias].[dbo].[TEST_APP_VIEW_SOFT_PERSONAL_VIGENTE] where FECHA_SOFT='` + mes + `'  and EMP_CODI=` + empresa + ` and CENCO2_CODI='` + centro_costo + `'`
        , {

          model: VariablesFicha,
          mapToModel: true, // pass true here if you have any mapped fields
          raw: true
        })).map(x => x.FICHA)
    console.log(JSON.parse(JSON.stringify(fichasVigentes)))

    //  fichasVigentes=JSON.parse(JSON.stringify(fichasVigentes)).filter(x=>x=='ASMAR028'||x=='ASMAR001'||x=='ASMAR006')
    //no esta  
    // fichasVigentes=JSON.parse(JSON.stringify(fichasVigentes)).filter(x=>x!="ASMAR002")
    // fichasVigentes=JSON.parse(JSON.stringify(fichasVigentes)).filter(x=>x=="ASMAR015")

    let infoPersonas = (await SoftlandController.getFichasInfoPromiseMes(fichasVigentes, empresa, mes))
    // console.log("la info personas",infoPersonas)


    var templates_persona = []
    let fichasVigentesPromises = fichasVigentes.map(async ficha => {

      console.log(ficha, mes, empresa)

      //obtenemos la variable persona
      let variablesPersona = await VariablesFicha.findAll({
        where: {
          emp_codi: empresa,
          ficha: ficha,
          fecha: mes
        }
      })
      //se ejecuta solo si la fichatiene liquido a pago
      if (variablesPersona.find(x => x["codVariable"] == constants.VARIABLES_PARAMETERS.find(x => x["nombre"] == "LIQUIDO PAGO")["variable"])) {



        var templateBase = JSON.parse(JSON.stringify(templateDB))
        var filledTemplate = []
        var template = []
        filledTemplate = fillTemplate(templateBase, variablesPersona)

        template = formatTemplate(filledTemplate)
        let persona = infoPersonas.find(x => x["FICHA"] == ficha)
        // console.log(persona)
        //se añade la infor de una persona //CAMBIAR A LA PERSONA CORRESPONDIENTE (BUSCAR EN INFOPERSONA)
        templates_persona.push({ ficha: ficha, persona: persona, template: template })
      } else {
        console.log("la ficha no encontrada es" + ficha)
        //si la ficha no tiene liquido a pago se escribe en archivo
        //fs.appendFile("dataTest/sinFicha/" + centro_costo + "-" + mes + ".csv", ficha + '\n', function (err) {
        //   if (err) console.log( err);
        //   console.log('Saved!');
        // });
      }

    })

    await Promise.all(fichasVigentesPromises)



    res.render("../views/liquidacion_sueldo_multiple - copia", { templates_persona: templates_persona, empresaDetalle: empresaDetalle, mes }, async function (err, data) {

      let liquidacionID = "10.010-JEAN-TEST"
      var html = data;


      pdf.create(html, options).toStream(function (err, stream) {

        //    res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
        //    res.setHeader('Content-Type', 'application/pdf');
        //    stream.pipe(res);
        if (stream && !err) {

          stream.pipe(fs.createWriteStream("dataTest/testLiquidaciones/" + centro_costo + ".pdf"));
          // stream.pipe(res);



          return res.status(200).send({ status: "ok" })
          //con esto evitamos que se acumule la memoria, tambien el return lo hace  
          //return next()
        } else {
          console.log("error en stream, " + centro_costo)
          // stream.pipe(res);
          return res.status(500).send({ status: "error" })

        }




      })
      // } catch (e) {
      //   console.log("error en la plantilla", centro_costo)
      //res.status(500).send({ error: 'error en  crear plantilla', exit: e })

      //}

    })
  });











  api.get("/liquidacion_persona_pdf/:ficha/:mes/:empresa", async function (req, res) {

    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"
    //let empresa=0
    //http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_persona_pdf/JUZCFLPM70/2019-05-01/0

    let ficha = req.params.ficha
    let mes = req.params.mes
    //let empresa = 0
    let empresa = req.params.empresa
    let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)

    console.log(ficha, mes, empresa)

    //obtenemos la variable persona
    let variablesPersona = await VariablesFicha.findAll({
      where: {
        emp_codi: empresa,
        ficha: ficha,
        fecha: mes
      }
    })
    let infoPersona = (await SoftlandController.getFichasInfoPromise([ficha], 0))[0]
    console.log("la info persona", infoPersona)

    var templateBase = JSON.parse(JSON.stringify(templateDB))

    var filledTemplate = fillTemplate(templateBase, variablesPersona)

    var template = formatTemplate(filledTemplate)

    var options = {
      format: 'Letter',
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "2cm",
        left: "1cm"
      },

    };


    res.render("../views/liquidacion_sueldo", { template: template, persona: infoPersona, empresaDetalle: empresaDetalle, mes }, function (err, data) {
      let liquidacionID = "10.010-JEAN-TEST"
      let html = data;
      //  console.log("HTML",html)
      try {

        //  setTimeout(function(){
        pdf.create(html, options).toStream(function (err, stream) {

          res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
          res.setHeader('Content-Type', 'application/pdf');
          stream.pipe(res);

        })
        // }, 5000);

      } catch (e) {
        console.log(e)
      }



    });

  });



  api.get("/liquidacion_persona_pdf_test/:ficha/:mes/:empresa", async function (req, res) {

    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"
    //let empresa=0
    //http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_persona_pdf/JUZCFLPM70/2019-05-01/0

    let ficha = req.params.ficha
    let mes = req.params.mes
    let empresa = 0
    let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)

    console.log(ficha, mes, empresa)

    //obtenemos la variable persona
    let variablesPersona = await VariablesFicha.findAll({
      where: {
        emp_codi: empresa,
        ficha: ficha,
        fecha: mes
      }
    })
    let infoPersona = (await SoftlandController.getFichasInfoPromise([ficha], 0))[0]
    console.log("la info persona", infoPersona)

    var templateBase = JSON.parse(JSON.stringify(templateDB))

    var filledTemplate = fillTemplate(templateBase, variablesPersona)

    var template = formatTemplate(filledTemplate)

    var options = {
      format: 'Letter',
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "2cm",
        left: "1cm"
      },



    };


    res.render("../views/liquidacion_sueldo", { template: template, persona: infoPersona, empresaDetalle: empresaDetalle, mes }, function (err, data) {
      let liquidacionID = "10.010-JEAN-TEST"
      let html = data;
      //  console.log("HTML",html)
      try {

        //  setTimeout(function(){
        pdf.create(html, options).toStream(function (err, stream) {

          // res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
          //  res.setHeader('Content-Type', 'application/pdf');
          console.log("hola")
          stream.pipe(fs.createWriteStream("dataTest/testLiquidaciones/liquidacion-prueba.pdf"));
          console.log("hola2")
          console.log("hola3")
          // stream.pipe(res);
          res.status(200).send({ status: "ok" })
        })
        // }, 5000);

      } catch (e) {
        console.log(e)
      }


    });

  });


  api.post("/liquidacion_sueldo_personas_pdf", async function (req, res) {

    //Dado un arreglo de fichas y un mes se obtienen la liquidacion de sueldo
    //http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_sueldo_personas_pdf
    //Content-Type:application/json
    //{"personas":["JUZCFLPM70","JUZGIMP09","JUZGIMP11"],"mes":"2019-08-01","proceso:":{"tipo":"reliquidaciones","id":2}}


    //proceso:si es undefined (no lo trae), saca la información de variables de sueldo directo de softland (al dia), si el proceso.tipo="reliquidaciones"
    //saca la informacion de sueldos desde la tabla mysql asist_rrhh.rrhhreliquidacionesprocesovariablesfichas, que es un archivo de variables de sueldo
    //antes de efectuar las reliquidaciones
    let proceso = req.body.proceso

    let personas = req.body.personas
    console.log("personas", personas)

    let mes = req.body.mes
    console.log("mes", mes)
    let empresa = req.body.empresa

    var options = {
      format: 'Letter',
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "2cm",
        left: "1cm"
      },

    };


    let templates_persona = []

    let fichasVigentesPromises = personas.map(async ficha => {
      let variablesPersona
      console.log(ficha, mes, empresa)

      //obtenemos las variable persona 
      if (proceso) {
        if (proceso.tipo == "reliquidaciones") {
          console.log("proceso.tipo:reliquidaciones")
          variablesPersona = await RrhhReliquidacionesProcesoVariablesFicha.findAll({
            where: {
              emp_codi: empresa,
              ficha: ficha,
              fecha: mes,
              procesoId: proceso.id

            }, raw: true
          })

        }

      } else {
        //por defecto se obtiene la info actualizada (al dia) de softland
        variablesPersona = await VariablesFicha.findAll({
          where: {
            emp_codi: empresa,
            ficha: ficha,
            fecha: mes
          }, raw: true
        })
      }


      //deepCopy
      var templateBase = JSON.parse(JSON.stringify(templateDB))

      var filledTemplate = []
      var template = []
      filledTemplate = fillTemplate(templateBase, variablesPersona)

      template = formatTemplate(filledTemplate)
      //persona, trae la info de la persona
      templates_persona.push({ persona: {}, template: template })

    })

    await Promise.all(fichasVigentesPromises)



    res.render("../views/liquidacion_sueldo_multiple", { templates_persona: templates_persona }, function (err, data) {
      let liquidacionID = "10.010-JEAN-TEST"
      let html = data;
      console.log("HTML", html)
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


  });




}) //cierra socket



//realiza cruce de datos según ficha

async function getLiquidacionFichaMes(res, ficha, mes, empresa, path) {

  return new Promise(async resolve => {

    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"

    //let empresa=0
    //http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_persona_pdf/JUZCFLPM70/2019-05-01/0

    //let ficha = req.params.ficha
    //let mes = req.params.mes
    let empresa = 0
    let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)

    console.log(ficha, mes, empresa)

    //obtenemos la variable persona
    let variablesPersona = await VariablesFicha.findAll({
      where: {
        emp_codi: empresa,
        ficha: ficha,
        fecha: mes
      }
    })
    let infoPersona = (await SoftlandController.getFichasInfoPromise([ficha], 0))[0]
    console.log("la info persona", infoPersona)

    var templateBase = JSON.parse(JSON.stringify(templateDB))

    var filledTemplate = fillTemplate(templateBase, variablesPersona)

    var template = formatTemplate(filledTemplate)

    var options = {
      format: 'Letter',
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "2cm",
        left: "1cm"
      },

    };


    res.render("../views/liquidacion_sueldo", { template: template, persona: infoPersona, empresaDetalle: empresaDetalle, mes }, function (err, data) {
      let liquidacionID = "10.010-JEAN-TEST"
      let html = data;
      //  console.log("HTML",html)
      try {

        //  setTimeout(function(){
        pdf.create(html, options).toStream(function (err, stream) {

          // res.setHeader('Content-disposition', 'inline; filename="Cotizacion-' + liquidacionID + '.pdf"');
          //  res.setHeader('Content-Type', 'application/pdf');
          console.log("hola")
          stream.pipe(fs.createWriteStream(path));

          console.log("hola2")
          console.log("hola3")
          // stream.pipe(res);
          ///   res.status(200).send({ status: "ok" })

          resolve({ status: "oka" })
        })
        // }, 5000);

      } catch (e) {
        console.log(e)
      }



    });

    // resolve(resultTestAsist);
  });


}



async function getLiquidacionCentroCosto(res, centro_costo, mes, empresa, path) {



  return new Promise(async (resolve, reject) => {
    // http://192.168.0.130:3800/liquidacion_sueldo/liquidacion_sueldo_cc/008-047/2019-08-01/0
    //let ficha="JUZCFLPM70"
    //let mes="2019-05-01"
    //let empresa=0

    //añadir empresa

    //var centro_costo = req.params.centro_costo
    //var mes = req.params.mes
    //var empresa = 0
    var empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa)
    var options = {
      format: 'Letter',
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "2cm",
        left: "1cm"
      },

    };


    let fichasVigentes = (await sequelizeMssql
      .query(`select FICHA from [Inteligencias].[dbo].[VIEW_SOFT_PERSONAL_VIGENTE] where FECHA_SOFT='` + mes + `'  and EMP_CODI=` + empresa + ` and CENCO2_CODI='` + centro_costo + `'`
        , {

          model: VariablesFicha,
          mapToModel: true, // pass true here if you have any mapped fields
          raw: true
        })).map(x => x.FICHA)
    console.log(JSON.parse(JSON.stringify(fichasVigentes)))

    //  fichasVigentes=JSON.parse(JSON.stringify(fichasVigentes)).filter(x=>x=='ASMAR028'||x=='ASMAR001'||x=='ASMAR006')
    //no esta  
    // fichasVigentes=JSON.parse(JSON.stringify(fichasVigentes)).filter(x=>x!="ASMAR002")
    // fichasVigentes=JSON.parse(JSON.stringify(fichasVigentes)).filter(x=>x=="ASMAR015")

    let infoPersonas = (await SoftlandController.getFichasInfoPromiseMes(fichasVigentes, empresa, mes))
    // console.log("la info personas",infoPersonas)


    var templates_persona = []
    let fichasVigentesPromises = fichasVigentes.map(async ficha => {

      console.log(ficha, mes, empresa)

      //obtenemos la variable persona
      let variablesPersona = await VariablesFicha.findAll({
        where: {
          emp_codi: empresa,
          ficha: ficha,
          fecha: mes
        }
      })
      //se ejecuta solo si la fichatiene liquido a pago
      if (variablesPersona.find(x => x["codVariable"] == constants.VARIABLES_PARAMETERS.find(x => x["nombre"] == "LIQUIDO PAGO")["variable"])) {



        var templateBase = JSON.parse(JSON.stringify(templateDB))
        var filledTemplate = []
        var template = []
        filledTemplate = fillTemplate(templateBase, variablesPersona)

        template = formatTemplate(filledTemplate)
        let persona = infoPersonas.find(x => x["FICHA"] == ficha)
        // console.log(persona)
        //se añade la infor de una persona //CAMBIAR A LA PERSONA CORRESPONDIENTE (BUSCAR EN INFOPERSONA)
        templates_persona.push({ ficha: ficha, persona: persona, template: template })
      } else {
        console.log("la ficha no encontrada es" + ficha)
        //si la ficha no tiene liquido a pago se escribe en archivo
        //fs.appendFile("dataTest/sinFicha/" + centro_costo + "-" + mes + ".csv", ficha + '\n', function (err) {
        //   if (err) console.log( err);
        //   console.log('Saved!');
        // });
      }

    })

    await Promise.all(fichasVigentesPromises)


    console.log("antes_data")
    ejs.renderFile("views/liquidacion_sueldo_multiple - copia.ejs", { templates_persona: templates_persona, empresaDetalle: empresaDetalle, mes }, {}, async function (err, data) {
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

          stream.pipe(fs.createWriteStream("dataTest/testLiquidaciones/" + centro_costo + ".pdf"));
          // stream.pipe(res);



          resolve({ status: "oka" })
          //con esto evitamos que se acumule la memoria, tambien el return lo hace  
          //return next()
        } else {
          console.log("error en stream, " + centro_costo)
          // stream.pipe(res);
          reject(e)

        }




      })
      // } catch (e) {
      //   console.log("error en la plantilla", centro_costo)
      //res.status(500).send({ error: 'error en  crear plantilla', exit: e })

      //}



    })
  })

}




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