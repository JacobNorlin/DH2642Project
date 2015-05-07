
/**
 * Module dependencies.
 */

var express = require('express'),
	app = express(),
	server = require('http').Server(app),
	io = require('socket.io')(server)


var expressServer = server.listen(3001, function(){

	var host = expressServer.address().address;
	var port = expressServer.address().port;

	console.log("App listening at http://%s_%s", host , port);

})

// Configuration

app.use(express.static(__dirname + '/public'));

app.get('/room/:roomId', function(req, res) {
		console.log(req.params.roomId)
		res.sendFile(__dirname + "/index.html")
	});
app.get('/', function(req, res) {
		res.sendFile(__dirname + "/index.html")
	});

var socket = require('./routes/socket.js')(io);

// Start server


