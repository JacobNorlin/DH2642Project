'use strict';

/* Services */

// Demonstrate how to register services
// In this case it is a simple value service.
app.factory('socket', function ($rootScope) {
	var socket = io.connect();
	var roomId;

	var setRoomId = function(roomId){
		roomId = roomId;
	}
	var getRoomId = function(){
		return roomId;
	}

	
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {	
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		},	
		setRoomId: setRoomId,
		getRoomId: getRoomId
	};
});
