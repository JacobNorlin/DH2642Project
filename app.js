
/**
 * Module dependencies.
 */

var express = require('express'),
	app = express(),
	server = require('http').Server(app),
	io = require('socket.io')(server),
	routes = require('./routes');

var socket = require('./routes/socket.js')(io);
var expressServer = server.listen(3001, function(){

	var host = expressServer.address().address;
	var port = expressServer.address().port;

	console.log("App listening at http://%s_%s", host , port);

})

// Configuration

app.use(express.static(__dirname + '/public'));

app.get('/rooms/:roomId', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


app.get('/*', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


// Start server


