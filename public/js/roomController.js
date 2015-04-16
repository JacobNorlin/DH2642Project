'use strict';

/* Controllers */

app.controller('RoomCtrl', function ($scope, $routeParams, socket, room) {

	var roomId = $routeParams.roomId;

	socket.emit('new:room',{
		roomId:roomId
	});
	

});
