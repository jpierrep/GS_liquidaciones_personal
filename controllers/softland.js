'use strict'


var async = require('async');

var readXlsxFile = require('read-excel-file/node');
var stringify = require('json-stringify');
//uso de ficheros
var fs = require('fs');
//rutas de ficheros
var path = require('path');

var sql = require("mssql");
var ExcelFilename;
var moment = require('moment');

var Sequelize = require('sequelize');

var sequelizeMssql = require('../config/connection_mssql')
const Op = Sequelize.Op
const Utils = require('../controllers/utils');
const constants = require('../config/systems_constants')


const PersonaProceso = sequelizeMssql.import('../models/persona_proceso');
const CentroCosto = sequelizeMssql.import('../models/soft_centro_costo');
const PersonaSoftland = sequelizeMssql.import('../models/soft_persona');
const VariablesFicha = sequelizeMssql.import('../models/soft_variables_ficha');




async function getFichasInfoPromise(fichas, empresa) {
  //no depende de fechas 

  let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa).BD_SOFTLAND
  //  let mesIndiceSoftland = await sequelizeMssql.query(` SELECT IndiceMes from ` + empresaDetalle.BD_SOFTLAND + `.softland.sw_vsnpRetornaFechaMesExistentes where FechaMes=:mes `,
  //  { replacements: { mes: proceso.Mes }, type: sequelize.QueryTypes.SELECT, raw: true })
  //mesIndiceSoftland = mesIndiceSoftland[0].IndiceMes
  //console.log("mes proceso", mesIndiceSoftland)

  return new Promise(async  resolve => {
    let fichasInfo = await sequelizeMssql.query(`SELECT     
per.ficha as FICHA,per.nombres as NOMBRES,per.rut as RUT,c.CarNom as CARGO_DESC,cc.CodiCC as CENCO2_CODI,cc1.DescCC as CENCO1_DESC,cc.DescCC  as CENCO2_DESC
,area.codArn as AREA_CODI,area_desc.DesArn as AREA_DESC,per.tipoPago as TIPO_PAGO,isapre.CodIsapre as ISAPRE_CODI,isapre.nombre as ISAPRE_NOMBRE,afp.CodAFP as AFP_CODI, afp.nombre as AFP_NOMBRE,cargas.cant_cargas as CANT_CARGAS

FROM 
					               `+ empresaDetalle + `.softland.sw_personal AS per INNER JOIN
                         `+ empresaDetalle + `.softland.sw_cargoper AS cp ON cp.ficha = per.Ficha AND cp.vigHasta = '9999-12-01' INNER JOIN
                         `+ empresaDetalle + `.softland.sw_areanegper AS area ON area.ficha = per.ficha AND area.vigHasta = '9999-12-01' INNER JOIN
                         `+ empresaDetalle + `.softland.cwtcarg AS c ON c.CarCod = cp.carCod INNER JOIN
                         `+ empresaDetalle + `.softland.sw_ccostoper AS ccp ON ccp.ficha = per.ficha AND ccp.vigHasta = '9999-12-01' INNER JOIN
                         `+ empresaDetalle + `.softland.cwtccos AS cc ON cc.CodiCC = ccp.codiCC LEFT OUTER JOIN
                         `+ empresaDetalle + `.softland.sw_glosafiniquito AS fini ON fini.Ficha = per.ficha LEFT OUTER JOIN
                         `+ empresaDetalle + `.softland.cwtccos AS cc1 ON cc1.CodiCC = substring(ccp.codiCC,1,3)+'-000'  LEFT OUTER JOIN
                         `+ empresaDetalle + `.softland.sw_afpper as afp_per on afp_per.ficha=per.ficha  LEFT OUTER JOIN
                         `+ empresaDetalle + `.softland.sw_afp as afp on afp.CodAFP=afp_per.codAFP LEFT OUTER JOIN
                         `+ empresaDetalle + `.softland.sw_isapreper as isapre_per on isapre_per.ficha=per.ficha  LEFT OUTER JOIN
                         `+ empresaDetalle + `.softland.sw_isapre as isapre on isapre.CodIsapre=isapre_per.codIsapre LEFT OUTER JOIN
                         `+ empresaDetalle + `.softland.cwtaren AS area_desc ON area.codArn = area_desc.CodArn  LEFT OUTER JOIN
                         (SELECT ficha,count(*) as cant_cargas  FROM `+ empresaDetalle + `.softland.sw_cargas where vigHasta>=convert(date,getdate())	group by ficha) cargas  on cargas.ficha=per.ficha

                         where per.ficha in (:fichas)
                         `,
      { replacements: { fichas: fichas }, type: sequelizeMssql.QueryTypes.SELECT, raw: true })


    resolve(fichasInfo)

  })


}





async function getFichasInfoPromiseMes(fichas, empresa, mes) {
  //no depende de fechas 

  let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa).BD_SOFTLAND
  //  let mesIndiceSoftland = await sequelizeMssql.query(` SELECT IndiceMes from ` + empresaDetalle.BD_SOFTLAND + `.softland.sw_vsnpRetornaFechaMesExistentes where FechaMes=:mes `,
  //  { replacements: { mes: proceso.Mes }, type: sequelize.QueryTypes.SELECT, raw: true })
  //mesIndiceSoftland = mesIndiceSoftland[0].IndiceMes
  //console.log("mes proceso", mesIndiceSoftland)

  return new Promise(async  resolve => {
    let fichasInfo = await sequelizeMssql.query(`SELECT     
  per.ficha as FICHA,per.nombres as NOMBRES,per.rut as RUT,c.CarNom as CARGO_DESC,cc.CodiCC as CENCO2_CODI,cc1.DescCC as CENCO1_DESC,cc.DescCC  as CENCO2_DESC
  ,area.codArn as AREA_CODI,area_desc.DesArn as AREA_DESC,per.tipoPago as TIPO_PAGO,isapre.CodIsapre as ISAPRE_CODI,isapre.nombre as ISAPRE_NOMBRE,afp.CodAFP as AFP_CODI, afp.nombre as AFP_NOMBRE,cargas.cant_cargas as CANT_CARGAS
  
  FROM 
                           `+ empresaDetalle + `.softland.sw_personal AS per INNER JOIN
                           `+ empresaDetalle + `.softland.sw_cargoper AS cp ON cp.ficha = per.Ficha AND '` + mes + `' between cp.vigDesde and cp.vigHasta  INNER JOIN
                           `+ empresaDetalle + `.softland.sw_areanegper AS area ON area.ficha = per.ficha AND '` + mes + `' between area.vigDesde and area.vigHasta  INNER JOIN
                           `+ empresaDetalle + `.softland.cwtcarg AS c ON c.CarCod = cp.carCod INNER JOIN
                           `+ empresaDetalle + `.softland.sw_ccostoper AS ccp ON ccp.ficha = per.ficha AND '` + mes + `' between ccp.vigDesde and ccp.vigHasta  INNER JOIN
                           `+ empresaDetalle + `.softland.cwtccos AS cc ON cc.CodiCC = ccp.codiCC LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_glosafiniquito AS fini ON fini.Ficha = per.ficha LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.cwtccos AS cc1 ON cc1.CodiCC = substring(ccp.codiCC,1,3)+'-000'  LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_afpper as afp_per on afp_per.ficha=per.ficha AND '` + mes + `' between afp_per.vigDesde and afp_per.vigHasta  LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_afp as afp on afp.CodAFP=afp_per.codAFP LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_isapreper as isapre_per on isapre_per.ficha=per.ficha  AND '` + mes + `' between isapre_per.vigDesde and isapre_per.vigHasta   LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_isapre as isapre on isapre.CodIsapre=isapre_per.codIsapre LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.cwtaren AS area_desc ON area.codArn = area_desc.CodArn  LEFT OUTER JOIN
                           (SELECT ficha,count(*) as cant_cargas  FROM `+ empresaDetalle + `.softland.sw_cargas where  '` + mes + `' between vigDesde and vigHasta	group by ficha) cargas  on cargas.ficha=per.ficha
  
                           where per.ficha in (:fichas)
                           order by CENCO2_CODI asc,NOMBRES asc
                           `,
      { replacements: { fichas: fichas }, type: sequelizeMssql.QueryTypes.SELECT, raw: true })


    resolve(fichasInfo)

  })


}





async function getFichasVigentes(mes,empresa) {
  //no depende de fechas 

  let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa).BD_SOFTLAND
  //  let mesIndiceSoftland = await sequelizeMssql.query(` SELECT IndiceMes from ` + empresaDetalle.BD_SOFTLAND + `.softland.sw_vsnpRetornaFechaMesExistentes where FechaMes=:mes `,
  //  { replacements: { mes: proceso.Mes }, type: sequelize.QueryTypes.SELECT, raw: true })
  //mesIndiceSoftland = mesIndiceSoftland[0].IndiceMes
  //console.log("mes proceso", mesIndiceSoftland)

  return new Promise(async  resolve => {
    let fichasInfo = await sequelizeMssql.query(      `
      
    select 
     
    LTRIM(RTRIM(per.ficha)) AS 'FICHA', per.codBancoSuc as 'BANCO_CODI', per.nombres as 'NOMBRES', per.rut as 'RUT', per.direccion as 'DIRECCION', per.codComuna as 'COMUNA_CODI', 
    
    per.codCiudad as 'CIUDAD_CODI', per.telefono1 as 'TELEFONO1', per.telefono2 as 'TELEFONO2', per.telefono3 as 'TELEFONO3', 
                    per.fechaNacimient   as 'FECHA_NACIMIENTO', DATEDIFF(YEAR,per.fechaNacimient,GETDATE())
    -(CASE
    WHEN DATEADD(YY,DATEDIFF(YEAR,per.fechaNacimient,GETDATE()),per.fechaNacimient)>GETDATE() THEN
      1
    ELSE
      0 
    END)as 'EDAD',per.sexo as 'SEXO', per.estadoCivil as 'ESTADO CIVIL', per.nacionalidad as 'NACIONALIDAD', per.situacionMilit as 'SITUACION MILITAR',per.fechaIngreso as 'FECHA_INGRESO',per.fechaPrimerCon as 'FECHA_PRIMER_CONTR',per.fechaContratoV as 'FECHA_CONTRATO_VIGENTE' ,per.fechaFiniquito as FECHA_FINIQUITO, 
                         per.tipoPago as 'TIPO_PAGO',per.FecCalVac as 'FECHA_CALCULO_VAC',per.FecTermContrato  as 'FECHA_TERM_CONTRATO', ccp.codiCC AS 'CENCO2_CODI', cp.carCod as 'CARGO_CODI',c.CarNom as 'CARGO_DESC', CAST(ep.FechaMes AS Date) as 'FECHA_SOFT'
                         , ep.IndiceMes as 'INDICE_MES_SOFT', ep.Estado as 'ESTADO', 0 AS EMP_CODI
                  
    ,case when ISNUMERIC (replace(substring(RUT,1,len(RUT)-2),'.',''))=1 then CONVERT(int,replace(substring(RUT,1,len(RUT)-2),'.','')) else 0 end as RUT_ID from 
    
    `+ empresaDetalle + `.softland.sw_vsnpEstadoPer as ep INNER JOIN
    `+ empresaDetalle + `.softland.sw_personal AS per 
    on ep.Ficha = per.ficha INNER JOIN
    `+ empresaDetalle + `.softland.sw_cargoper AS cp ON cp.ficha = ep.Ficha AND cp.vigHasta = '9999-12-01' inner join
    `+ empresaDetalle + `.softland.cwtcarg AS c ON c.CarCod = cp.carCod inner join
    `+ empresaDetalle + `.softland.sw_ccostoper AS ccp ON ccp.ficha = per.ficha AND ccp.vigHasta = '9999-12-01' 
    where estado='V'
    and ep.FechaMes=' `+mes+ `'
    
    
                             `,
      {  type: sequelizeMssql.QueryTypes.SELECT, raw: true })


    resolve(fichasInfo)

  })


}













module.exports = {
  getFichasInfoPromise, getFichasInfoPromiseMes,getFichasVigentes
}


