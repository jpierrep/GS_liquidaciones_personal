
'use strict'

var express = require('express');

var Sequelize = require('sequelize');

var sequelizeMssql = require('../config/connection_mssql')
const VariablesFicha = sequelizeMssql.import('../models/soft_variables_ficha');

var SoftlandController = require('../controllers/softland');
var api = express.Router();
const constants = require('../config/systems_constants')
var fs = require('fs');
var request = require('request');
const http = require('https');

var pdf = require('html-pdf');

var ficha = ''

//carga plantilla db
var templateDB = require('../config/template_liquidacion.json')



function fillTemplate(templatebase, variablesPersona) {

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

  return templatebase.filter(x => x.TIPO == "TITULO" || ((x.TIPO == "NORMAL" || x.TIPO == "TOTAL") && x.VAR_VALOR))

}


function formatTemplate(templateBase) {
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



  return arrayFormat

}

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




//xxxxx
api.get("/getLiquidaciones", async function (req, res, next) {


  let mes = '2019-08-01'
  let empresa = 0
  //Actualizar vacaciones GUARD
  let ccVigentes = (await sequelizeMssql
    .query(`
    SELECT CENCO2_CODI,count(*) as cant
    FROM [Inteligencias].[dbo].[TEST_APP_VIEW_SOFT_PERSONAL_VIGENTE]
    where FECHA_SOFT='`+ mes + `'
    and ESTADO='V'
    and emp_codi=`+ empresa + `
    
    group by CENCO2_CODI
`
      , {

        model: VariablesFicha,
        mapToModel: true, // pass true here if you have any mapped fields
        raw: true
      })).map(x => x.CENCO2_CODI)

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
      await getLiquidacionCentroCosto(res, centro_costo, mes, empresa, path + filename)

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
  return res.status(200).send({ status: "ok" })


})

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

module.exports = api;