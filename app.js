
/**
 * Module dependencies.
 */

var express = require('express'),
	app = express(),
	server = require('http').Server(app),
	io = require('socket.io')(server),
	rooms = require('./routes/rooms.js')

var socket = require('./routes/socket.js')(io, rooms);




// Configuration

app.use(express.static(__dirname + '/public'));

app.get('/:roomId/*', function(req, res) {
	console.log("roomId: "+req.params.roomId)
	if(rooms.roomExists(req.params.roomId)){
		res.sendFile('index.html', {root: __dirname+"/public"});
	}else{
		res.send("no room lol")
	}
});


app.use('*', function (req, res) {
	res.sendFile('index.html', {root: __dirname+"/public"});
});
var expressServer = server.listen(3001, function(){

	var host = expressServer.address().address;
	var port = expressServer.address().port;

	console.log("App listening at http://%s_%s", host , port);

})

// Start server


