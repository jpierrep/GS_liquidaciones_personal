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
 

  function getDateFormat(separador){
  //si viene separador se toma en cuenta, si no viene el separador es -
  if (!separador){
   separador='-'
  }

    var m = new Date();
    let formatDate = (m.getFullYear() > 9 ? m.getFullYear() : '0' + m.getFullYear()) + separador + ((m.getMonth() + 1) > 9 ? (m.getMonth() + 1) : '0' + (m.getMonth() + 1)) + separador+ (m.getDate() > 9 ? m.getDate() : '0' + m.getDate())
  
    let formatHour = (m.getHours() > 9 ? m.getHours() : '0' + m.getHours()) + separador + (m.getMinutes() > 9 ? m.getMinutes() : '0' + m.getMinutes()) + separador+ (m.getSeconds() > 9 ? m.getSeconds() : '0' + m.getSeconds())
  //  console.log(formatDate + "-" + formatHour)
  return formatDate+separador+formatHour
  }
 




  module.exports={convierteRutID,getMesName,getDateFormat}