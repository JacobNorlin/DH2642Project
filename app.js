
/**
 * Module dependencies.
 */

var express = require('express');
var app = module.exports = express.createServer();
var request = require('request');

// Hook Socket.io into Express
var io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
	app.use(express.static(__dirname + '/public'));
	app.get('/', function(req, res) {
		res.sendFile(__dirname + '/index.html');
	});
});

var socket = require('./routes/socket.js')(io);

// Start server

app.listen(3000, function(){
	console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
