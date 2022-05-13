    /**
    * Métodos para la generación de archivos pdf Previred
    * @module /controllers/sofltand
    */

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



/** 
 * Funcion principal que ejecuta el proceso una vez se llama desde el front y ya se encuentra cargado el archivo previred
 * @async 
 * @function getFichasInfoPromise
 * @param {string} uploadFileName - El directorio local donde se subió el archivo pdf necesario para el proces.
 * @param {integer} empresa - el id de la empresa.
 * @param {string} mes - mes del proceso formato yyy-mm-dd ej. 2020-10-01.
 * @return {Promise} .
*/
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
    let fichasInfo = await sequelizeMssql.query(`SELECT  per.nombre+' '+per.appaterno+' '+per.apmaterno as NOMBRES_ORD  
  ,per.ficha as FICHA,per.nombres as NOMBRES,per.rut as RUT,c.CarNom as CARGO_DESC,cc.CodiCC as CENCO2_CODI,cc1.CodiCC as CENCO1_CODI,cc1.DescCC as CENCO1_DESC,cc.DescCC  as CENCO2_DESC
  ,area.codArn as AREA_CODI,area_desc.DesArn as AREA_DESC,per.tipoPago as TIPO_PAGO,isapre.CodIsapre as ISAPRE_CODI,isapre.nombre as ISAPRE_NOMBRE,afp.CodAFP as AFP_CODI, afp.nombre as AFP_NOMBRE,cargas.cant_cargas as CANT_CARGAS
  ,isnull(per.numCtaCte,'') as NUM_CUENTA
  ,per.CodTipEfe as COD_TIP_EFE
  ,per.codBancoSuc as COD_BANCO_SUC
  ,banco.descripcion as BANCO_DESC
  ,per.RolPrivado as ROL_PRIVADO
  FROM 
                           `+ empresaDetalle + `.softland.sw_personal AS per INNER JOIN
                           `+ empresaDetalle + `.softland.sw_cargoper AS cp ON cp.ficha = per.Ficha AND '` + mes + `'>= cp.vigDesde and '` + mes + `'< cp.vigHasta  INNER JOIN
                           `+ empresaDetalle + `.softland.sw_areanegper AS area ON area.ficha = per.ficha AND '` + mes + `'>= area.vigDesde and '` + mes + `'< area.vigHasta  INNER JOIN
                           `+ empresaDetalle + `.softland.cwtcarg AS c ON c.CarCod = cp.carCod INNER JOIN
                           `+ empresaDetalle + `.softland.sw_ccostoper AS ccp ON ccp.ficha = per.ficha AND '` + mes + `' >= ccp.vigDesde and '` + mes + `'< ccp.vigHasta  INNER JOIN
                           `+ empresaDetalle + `.softland.cwtccos AS cc ON cc.CodiCC = ccp.codiCC LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_glosafiniquito AS fini ON fini.Ficha = per.ficha LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.cwtccos AS cc1 ON cc1.CodiCC = substring(ccp.codiCC,1,3)+'-000'  LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_afpper as afp_per on afp_per.ficha=per.ficha AND '` + mes + `'>= afp_per.vigDesde and '` + mes + `'< afp_per.vigHasta  LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_afp as afp on afp.CodAFP=afp_per.codAFP LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_isapreper as isapre_per on isapre_per.ficha=per.ficha  AND '` + mes + `' >= isapre_per.vigDesde and '` + mes + `'< isapre_per.vigHasta   LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_isapre as isapre on isapre.CodIsapre=isapre_per.codIsapre LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.cwtaren AS area_desc ON area.codArn = area_desc.CodArn  LEFT OUTER JOIN
                           `+ empresaDetalle + `.softland.sw_banco_suc as banco on per.codBancoSuc=banco.codBancoSuc LEFT OUTER JOIN
                           (SELECT ficha,count(*) as cant_cargas  FROM `+ empresaDetalle + `.softland.sw_cargas where  '` + mes + `' >= vigDesde and '` + mes + `'< vigHasta	group by ficha) cargas  on cargas.ficha=per.ficha
  
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

  /* SI SE NECESITA FILTRAR FICHAS RELIQ GRATIFICACIONES EN CARGA ARCHIVOS PREVISIONALES
  let filtro_areas=''
  if (empresa='GUARD')
  {
   filtro_areas=`and codArn<>'001'`
  }if (empresa='OUTSOURCINGSA')
  {
   filtro_areas=`and codArn<>'005'`
  }

  */


  //  let mesIndiceSoftland = await sequelizeMssql.query(` SELECT IndiceMes from ` + empresaDetalle.BD_SOFTLAND + `.softland.sw_vsnpRetornaFechaMesExistentes where FechaMes=:mes `,
  //  { replacements: { mes: proceso.Mes }, type: sequelize.QueryTypes.SELECT, raw: true })
  //mesIndiceSoftland = mesIndiceSoftland[0].IndiceMes
  //console.log("mes proceso", mesIndiceSoftland)

  return new Promise(async  resolve => {
    let fichasInfo = await sequelizeMssql.query(      `
      
    select 
     
    LTRIM(RTRIM(per.ficha)) AS 'FICHA', per.codBancoSuc as 'BANCO_CODI', per.nombres as 'NOMBRES', per.nombre as 'NOMBRE_SINGLE', per.rut as 'RUT', per.direccion as 'DIRECCION', per.codComuna as 'COMUNA_CODI', 
    
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
    `+ empresaDetalle + `.softland.sw_ccostoper AS ccp ON ccp.ficha = per.ficha AND ccp.vigHasta = '9999-12-01' inner join
 `+ empresaDetalle + `.softland.sw_areanegper as area  ON area.ficha = per.ficha AND area.vigHasta = '9999-12-01'
    -- SOLO SI SE NECESITA FILTAR AREA where estado='V'  filtro_areas    --filtra fichas que se habilitaron para pago gratificaciones
    where estado='V' 
    and ep.FechaMes=' `+mes+ `'
    order by RUT asc, FECHA_INGRESO desc,FECHA_FINIQUITO desc
    
                             `,
      {  type: sequelizeMssql.QueryTypes.SELECT, raw: true })


    resolve(fichasInfo)

  })


}


async function UpdateLiquidacionesIntranetMes(mes,empresa) {

  console.log("testupdate",mes,empresa)
  //no depende de fechas 

  let empresaDetalle = constants.EMPRESAS.find(x => x.ID == empresa).BD_SOFTLAND
  //  let mesIndiceSoftland = await sequelizeMssql.query(` SELECT IndiceMes from ` + empresaDetalle.BD_SOFTLAND + `.softland.sw_vsnpRetornaFechaMesExistentes where FechaMes=:mes `,
  //  { replacements: { mes: proceso.Mes }, type: sequelize.QueryTypes.SELECT, raw: true })
  //mesIndiceSoftland = mesIndiceSoftland[0].IndiceMes
  //console.log("mes proceso", mesIndiceSoftland)

  return new Promise(async  (resolve,reject) => {
    try {
      await sequelizeMssql.query(      `
      delete from [SISTEMA_CENTRAL].[dbo].[bi_liquidaciones_variable_persona_archivo]
where FechaMes=' `+mes+ `' and emp_codi=`+mes,
{  type: sequelizeMssql.QueryTypes.DELETE })


await sequelizeMssql.query(      `
insert into 
  [SISTEMA_CENTRAL].[dbo].[bi_liquidaciones_variable_persona_archivo]
  
  SELECT  [ficha]
      ,[codVariable]
      ,[mes]
      ,[valor]
      ,[flag]
      ,[fecha]
      ,[emp_codi]
  FROM [SISTEMA_CENTRAL].[dbo].sw_variablepersona

  where fecha=' `+mes+ `' and emp_codi=`+mes
  ,
{  type: sequelizeMssql.QueryTypes.INSERT })



resolve()

    }catch(e){
reject(e)
    }
    



 
  })


}











module.exports = {
  getFichasInfoPromise, getFichasInfoPromiseMes,getFichasVigentes
}


