'use strict'
//app js lleva toda la configuracion de express
var express=require('express');
var bodyParser=require('body-parser');

var app=express();


  
  //cargar rutas
  
 
  

  //var follow_routes=require('./routes/follow');

  app.set('view engine','ejs')

  //middelware metodo que se ejecuta antes de llegar a un controlador
  app.use(bodyParser.urlencoded({extended:false,limit: '50mb'}));
  app.use(bodyParser.json({limit: '50mb'})); // transforma los datos de la peticion a json

  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
   next();
  });
  
  
  //cors
  //rutas
  //use es un middelware se ejecuta antes de llegar a la accion del controlador en cada peticion que realice 




//ruta para archivos estaticos js,css, etc
app.use(express.static('public'))







  module.exports=app;