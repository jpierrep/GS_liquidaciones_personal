'use strict'

var sql = require("mssql");

var config = {
  user: 'targit',
  password: 'targit2015*',
  server: '192.168.100.14', 
  database: 'Inteligencias' ,
 //parseJSON:true
};




sql.connect(config).then(()=>{
   // return pool.request().query(queryDB)
   console.log("conexion establecida")
  }).catch(err=>{
    console.log('error',err);
  })


/*

// connect to your database
  
  sql.connect(sqlConnection).then((pool)=>{
    return pool.request().query(queryDB)
  }).then(result=>{
   resolve(result);

   }).catch(err=>{
    console.log(err);
  })

  */

  module.exports = sql;

