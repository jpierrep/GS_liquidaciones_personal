var express=require('express');
var api=express.Router();
var NominaBancariaController=require('../controllers/nomina_bancaria');


api.get('/test',NominaBancariaController.getMontosNomina);
api.get('/testPDF',NominaBancariaController.getMontosNominaPDF);
module.exports=api;