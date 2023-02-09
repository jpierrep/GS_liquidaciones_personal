var Sequelize = require('sequelize');


//var sequelize = new Sequelize('Inteligencias', 'appcontroloperacional', 'appcontroloperacional', {
  var sequelize = new Sequelize('Inteligencias', 'targit', 'targit2015*', {
  host: '192.168.100.14',
  dialect: 'mssql',

  pool: {
    max: 5,
    min: 0,
    idle: 10000,
    acquire:60000,
  },
  // SQLite only
  //storage: 'path/to/database.sqlite'
});

sequelize.authenticate()
.then(function(err) {
  console.log('Connection has been established successfully.');
})
.catch(function (err) {
  console.log('Unable to connect to the database:', err);
});

module.exports = sequelize;

