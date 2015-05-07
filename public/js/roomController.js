'use strict';

/* Controllers */

app.controller('RoomCtrl', function ($scope, $routeParams, socket, room) {

	var roomId = $routeParams.roomId;
	

	//Try to create new room or join existing room
	socket.emit('new:room',{
		roomId:roomId
	});

	socket.setRoomId(roomId);
	

});
