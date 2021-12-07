'use strict';
const Sequelize = require('sequelize');
const Constants= require('../config/systems_constants')

module.exports = (sequelize, DataTypes) => {
    class NominasPorPersona extends Sequelize.Model { }
    NominasPorPersona.init({

        EMP_CODI:  DataTypes.INTEGER,
        TIPO:DataTypes.STRING,
        CENCO1_CODI: DataTypes.STRING,



     
    },{ sequelize,tableName: Constants.TABLE_NOMINAS_BANCARIAS_POR_PERSONA.table,timestamps: false});
    NominasPorPersona.removeAttribute('id');
    return NominasPorPersona
  
  }