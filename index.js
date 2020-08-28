/*var express = require('express');
const rrhhRouter = require('./routes/rrhhRouter');
const rrhhRouterPers = require('./routes/rrhhRouter');
const asistDiasTrabRouter = require('./routes/asistDiasTrabRouter');
const getDiferencias = require('./routes/rrhhRouter');

var app = express();

app.use('/rrhhRouter',rrhhRouter);
app.use('/rrhhRouterPers',rrhhRouterPers);
app.use('/asistDiasTrab',asistDiasTrabRouter);
app.use('/getDiferencias',getDiferencias);

var server = app.listen(5000, function () {
    console.log('Server is running..');
});

*/

'use strict'
//index js para hacer las conexiones y la creacion del servidor


var app=require('./app');
var port= 3800;
var ip='localhost';


    const socketIO = require('socket.io');
    
     
     const server=app.listen(port,ip,()=>{
        console.log("Servidor corriendo en ip "+ip+" puerto "+ port )
    });

    module.exports = socketIO(server);
    // ojo con la secuencia , liquidaciones de sueldo ocupa el socket, por lo que debe ir declarado antes de cargar el archivo dependiente
    //verificar luego la mejor forma de organizar los aarchivos, para carga secuencial
    //referencia https://stackoverflow.com/questions/38511976/how-can-i-export-socket-io-into-other-modules-in-nodejs

    var liquidacion_sueldo=require('./routes/liquidacion_sueldo')
    
     app.use('/liquidacion_sueldo',liquidacion_sueldo)
    
    
   



  
