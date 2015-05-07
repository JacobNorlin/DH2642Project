
/**
 * Module dependencies.
 */

var express = 
	routes = require('./routes'),
	socket = require('./routes/socket.js');

var app = module.exports = express.createServer();

// Hook Socket.io into Express
var io = require('socket.io').listen(app);

// Configuration

// app.configure(function(){
// 	app.use(express.static(__dirname + '/public'));
// 	app.get('/', function(req, res) {
// 		res.sendFile(__dirname + '/index.html');
// 	});
// });

// Routes

// app.get('/', routes.index);
// app.get('/rooms/:name', function(req, res){
// 	var roomName = req.params.name;
// 	if(!rooms.roomExists(roomName)){
// 		rooms.createNewRoom(roomName);
// 	})
// 	var roomSocket = io.of(roomName);
// 	roomSocket.on('connection', socket)
// });

// redirect all others to the index (HTML5 history)
// app.get('*', routes.index);

// Socket.io Communication

//io.sockets.on('connection', socket);

// Start server

app.listen(3000, function(){
	console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
