/* //Este codigo contiene antigua api (de prueba ) para generacion liquidaciones de sueldo copiar y pegar en archivo en produccion para testear

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

*/