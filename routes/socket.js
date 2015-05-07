var rooms = (function () {
	var rooms = {}

	var createNewRoom = function(roomId) {
		rooms[roomId] = new room(roomId)
	}

	var roomExists = function(roomId) {
		for(var room in rooms){
			if(room.roomId == roomId){
				return true;
			}
		}
		return false;
	}

	var getRoom = function(roomId){
		return rooms[roomId]
	}

	return {
		createNewRoom: createNewRoom,
		roomExists: roomExists,
		getRoom: getRoom
	}

	
}());

var room = function (roomId) {
	var roomId = roomId;
	var names = {}



	var claim = function (name) {
		if (!name || names[name]) {
			return false;
		} else {
			names[name] = true;
			return true;
		}
	};

	// find the lowest unused "guest" name and claim it
	var getGuestName = function () {
		var name,
			nextUserId = 1;

		do {
			name = 'Guest ' + nextUserId;
			//name = 'Guest' + (Math.floor((Math.random() * 900) + 100));
			nextUserId += 1;
		} while (!claim(name));

		return name;
	};

	// serialize claimed names as an array
	var get = function () {
		var res = [];
		for (var user in names) {
			res.push(user);
		}

		return res;
	};

	var free = function (name) {
		if (names[name]) {
			delete names[name];
		}
	};

	return {
		claim: claim,
		free: free,
		get: get,
		getGuestName: getGuestName,
		roomId: roomId
	};
}


// export function for listening to the socket
module.exports = function (socket) {
	var name = "lol"

	// send the new user their name and a list of users
	// socket.emit('init', {
	// 	name: name,
	// 	users: userNames.get()
	// });

	// notify other clients that a new user has joined
	socket.broadcast.emit('user:join', {
		name: name
	});

	// broadcast a user's message to other users
	socket.on('send:message', function (data) {
		console.log(data);
		socket.broadcast.emit('send:message', {
			user: name,
			text: data.message,
			roomId: data.roomId
		});
	});

	// validate a user's name change, and broadcast it on success
	// socket.on('change:name', function (data, fn) {
	// 	if (userNames.claim(data.name)) {
	// 		var oldName = name;
	// 		userNames.free(oldName);

	// 		name = data.name;
			
	// 		socket.broadcast.emit('change:name', {
	// 			oldName: oldName,
	// 			newName: name
	// 		});

	// 		fn(true);
	// 	} else {
	// 		fn(false);
	// 	}
	// });

	socket.on('new:room', function(data) {
		
		if(!rooms.roomExists(data.roomId)){
			rooms.createNewRoom(data.roomId);
		}else{
			//If room exists we claim a username in that room
			var room = rooms.getRoom(data.roomId)
			room.claim(room.getGuestName());
		}
		
	});

	// clean up when a user leaves, and broadcast it to other users
	// socket.on('disconnect', function () {
	// 	socket.broadcast.emit('user:left', {
	// 		name: name
	// 	});
	// 	userNames.free(name);
	// });
};
