
'use strict'

/**
* @api {post} /readPDF/fileupload/ fileUpload
* @apiName FileUpload
* @apiGroup ReadPDF
* @apiDescription Carga archivo PDF al servidor, devolviendo la ruta donde se cargó o el error si es que hubo.
*
* @apiParam {String} empresa Id de la empresa ingresada por el usuario.
* @apiParam {String} mes El mes ingresado por el usuario formato yyyy-mm-dd.
* @apiParam {String} files archivo cargado por el usuario.
* @apiSuccess {json} resp mensaje de respuesta con status ok.
* @apiSuccessExample {json} Success-Response:
* HTTP/1.1 200 OK
* {
* status: "OK"
* err: messaje
* }
*/


var express=require('express');
var api=express.Router();
var ReadPdfController=require('../controllers/read_pdf_certificado');

//http://localhost:3800/readPdf/testPdfBurst
api.post('/fileupload',ReadPdfController.fileupload);
api.get('/testPdfBurst',ReadPdfController.testPdfBurst)

module.exports=api;