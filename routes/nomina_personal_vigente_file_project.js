var express=require('express');
var api=express.Router();
var NominaPersonalVigenteController=require('../controllers/nomina_personal_vigente_file_project');


//api.get('/test',NominaBancariaController.getMontosNomina);
api.get('/testPDF',NominaPersonalVigenteController.getNominaPersonalVigentePDF);
//api.get('/testFiles',NominaBancariaController.getMontosNominaFiles);

module.exports=api;