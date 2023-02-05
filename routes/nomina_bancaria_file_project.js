var express=require('express');
var api=express.Router();
var NominaBancariaController=require('../controllers/nomina_bancaria_file_project');


api.get('/test',NominaBancariaController.getMontosNomina);
api.get('/testPDF',NominaBancariaController.getMontosNominaPDF);
//api.get('/testFiles',NominaBancariaController.getMontosNominaFiles);

module.exports=api;