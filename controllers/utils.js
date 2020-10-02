'use strict'

function convierteRutID (rut){
     
    rut=rut.substr(0,rut.length-1);
    rut=replaceAll(rut,".","");
    rut=replaceAll(rut,"-","");
    // rut1=rut.replace(".","");
    if (isNaN(parseFloat(rut)) && !isFinite(rut))
      rut=0;
    
  
 //  console.log("el rut es:"+rut);
   return parseInt(rut);
  }

  
  function replaceAll (string, omit, place, prevstring) {
    if (prevstring && string === prevstring)
      return string;
    prevstring = string.replace(omit, place);
    return replaceAll(prevstring, omit, place, string)
  }

  function getMesName(mes){
   
    //formato mes '2020-09-01  yyyy-mm-dd ' 
   let meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
   let mesActual=parseInt(new Date(mes).toISOString().substr(5,2))-1
  
   //let mesActual=new Date().getMonth()
   return meses[mesActual]
  }
 
 




  module.exports={convierteRutID,getMesName}