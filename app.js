
/**
 * Module dependencies.
 */

var express = require('express'),
	app = express(),
	server = require('http').Server(app),
	io = require('socket.io')(server)


var socket = require('./routes/socket.js')(io);



// Configuration

app.use(express.static(__dirname + '/public'));

app.use('/room/:roomId', function (req, res) {
 	res.sendFile('index.html', {root: __dirname+"/public"});
});


app.use('*', function (req, res) {
	console.log("catch all")
  res.sendFile('index.html', {root: __dirname+"/public"});
});
var expressServer = server.listen(3001, function(){

	var host = expressServer.address().address;
	var port = expressServer.address().port;

	console.log("App listening at http://%s_%s", host , port);

})

// Start server


