'use strict';
const Sequelize = require('sequelize');
const Constants= require('../config/systems_constants')

module.exports = (sequelize, DataTypes) => {
    class TemplateLiquidacion extends Sequelize.Model { }
    TemplateLiquidacion.init({

        VAR_NOMBRE:  DataTypes.STRING,
        COLUMNA:DataTypes.INTEGER,
        OFFSET: DataTypes.INTEGER,
        TIPO:DataTypes.STRING,
        VAR_CODI:DataTypes.STRING,
        SECTION:DataTypes.STRING,
        VAR_VALOR:DataTypes.INTEGER,
        EMPRESA:DataTypes.INTEGER,


     
    },{ sequelize,tableName: Constants.TABLE_TEMPLATE_LIQUIDACION.table,timestamps: false});
    TemplateLiquidacion.removeAttribute('id');
    return TemplateLiquidacion
  
  }