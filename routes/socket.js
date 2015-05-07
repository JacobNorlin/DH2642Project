/**
 * Handle serverside communication
 * @Authors Magnus Olsson, Richard Nys�ter, Jacob Norlin
 * @param io The io to use
 */
var MAX_USERNAME_LENGTH = 30;
var MAX_MESSAGE_LENGTH = 1000;

// export function for listening to the socket
module.exports = function (io) {

	/**
	 * Executes when a new connection is established
	 */
	io.sockets.on('connection', function (socket) {
		var name = '';

		console.log("Someone connected!");

		// socket.emit('join:room', 
		// 	 {
		// 	 	roomId: 1
		// 	 }
		// })

		/**
		 *	Check if user has existing data in a cookie
		 */
		socket.emit('cookies:get', '', function(reply) {
			if (reply) {
				name = model.getName(reply.name);

				if (reply.games) {
					reply.games.forEach(function(gameid) {
						model.addGame(name, gameid);
					});
				}

				if (reply.timeline) {
					reply.timeline.forEach(function(time) {
						model.addTime(name, time);
					});
				}
			} else {
				name = model.getGuestName();
			}
			init();
		});

		/**
		 * Send the new user their name and a list of the users
		 */
		var init = function() {
			socket.emit('init', {
				name: name,
				userdata: model.getUserData()
			});
			newJoin();
		};

		/**
		 *	Notify other clients that a new user has joined
 		 */
		var newJoin = function() {
			socket.broadcast.emit('user:join', {
					name: name,
					data: model.getUserData()[name]
				}
			);
		};

		/**
		 * Broadcast a user's message to other users
		 */
		socket.on('send:message', function (data) {
			if(data.message.length <= MAX_MESSAGE_LENGTH) {
				io.sockets.emit('send:message', {
					user: name,
					text: data.message,
					time: getTime()
				});
			}
		});

		/**
		 * Validate a user's name change, and broadcast it on success
		 */
		socket.on('change:name', function (data, callback) {
			if (model.claimName(data.name)) {
				var oldName = name;
				name = data.name;
				model.renameTimeline(oldName, name);
				model.freeName(oldName);

				io.sockets.emit('change:name', {
					oldName: oldName,
					newName: name
				});

				callback(true);
			} else {
				callback(false);
			}
		});


		/**
		 * User added a new time to their timeline
		 */
		socket.on('timeline:edit:add', function (data) {
			model.addTime(name, data.time);
			io.sockets.emit('timeline:edit:add', data);
		});

		/**
		 * User removed a time from their timeline
		 */
		socket.on('timeline:edit:remove', function (data) {
			model.removeTime(name, data.time);
			io.sockets.emit('timeline:edit:remove', data);
		});


		/**
		 * User added a new game
		 */
		socket.on('game:add', function (gameid) {
			model.addGame(name, gameid);
			io.sockets.emit('game:add', {
				name: name,
				gameid: gameid,
				gamedata: model.getUserData()[name].games[gameid]
			});
		});

		/**
		 * User copied a game
		 */
		socket.on('game:copy', function (gameid) {
			model.copyGame(name, gameid);
			socket.broadcast.emit('game:add', {
				name: name,
				gameid: gameid,
				gamedata: model.getUserData()[name].games[gameid]
			});
		});

		/**
		 * User removed a game
		 */
		socket.on('game:remove', function (gameid) {
			model.removeGame(name, gameid);
			socket.broadcast.emit('game:remove', {
				name: name,
				gameid: gameid
			});
		});

		/**
		 * Clean up when a user leaves, and broadcast it to other users
		 */
		socket.on('disconnect', function () {
			socket.broadcast.emit('user:left', {
				name: name
			});
			model.freeName(name);
		});

	})
};

/**
 * The model stores data
 * @type {{claimName, freeName, getUserData, getName, getGuestName, addTime, removeTime, renameTimeline, getTimeline, addGame, copyGame, removeGame}}
 */

var Rooms = (function(){
	var rooms = {}

	var createNewRoom = function (roomId){
		rooms[roomId] = new Room(roomId);
	}

	var roomExists = function(roomId) {
		for(var room in rooms){
			if(room.roomId == roomId){
				return true;
			}
		}
		return false;
	}

	var getRoom = function(roomId) {
		if(roomExists(roomId)){
			return rooms[roomId];
		}
	}

	return {
		createNewRoom: createNewRoom,
		roomExists: roomExists,
		getRoom: getRoom
	}
})();

var model = (function (roomId) {
	var roomId = roomId;
	var INITIAL_GUEST_NAME = 'Guest ';
	var userdata = {};
	var gamedata = {};

	// Test data please ignore
	gamedata["csgo"] = {
		coverurl: "/images/csgo_thumb.jpg",
		name: "Counter-Strike: Global Offensive"
	};
	gamedata["quake3"] = {
		coverurl: "/images/quake3_thumb.jpg",
		name: "Quake 3 Arena"
	};
	gamedata["l4d"] = {
		coverurl: "/images/l4d_thumb.jpg",
		name: "Left 4 Dead"
	};
	gamedata["dota2"] = {
		coverurl: "/images/dota2_thumb.jpg",
		name: "Dota 2"
	};

	/**
	 * If name is available, create a new user with that name
	 * @param name The name the user wants
	 * @returns {boolean} True if user was created, false otherwise
	 */
	var claimName = function (name) {
		if(validName(name)) {
			userdata[name] = {"id": nextId(), games: {}, timeline: {}};
			return true;
		}
		else
			return false;
	};

	/**
	 * Checks if a name is valid
	 * @returns {boolean} True if name is valid, false otherwise
	 */
	var validName = function (name){
		if (!name || userdata[name] || name.length > MAX_USERNAME_LENGTH) {
			return false;
		}
		else {
			return true;
		}
	};

	/**
	 * Get an available name
	 * @param name The requested name
	 * @returns {*} An available name
	 */
	var getName = function(name) {
		var nextNum = 1;
		var originalName = name;
		if (name === INITIAL_GUEST_NAME)
			name = name+nextNum;

		while (!claimName(name)) {
			name = originalName + nextNum;

			nextNum += 1;
			if(name.length > MAX_USERNAME_LENGTH) // If name is too long we give him guest name instead
				name = INITIAL_GUEST_NAME;
		}
		return name;
	};

	/**
	 * Find the lowest unused "guest" name and claim it
	 * @returns {*} A guest name
	 */
	var getGuestName = function () {
		return getName(INITIAL_GUEST_NAME);
	};

	/**
	 * Get userdata
	 * @returns {{}} The current userdata
	 */
	var getUserData = function () {
		return userdata;
	};


	/**
	 *	Delete a user
	 * @param name The name of the user to delete
	 */
	var freeName = function (name) {
		if (userdata[name]) {
			delete userdata[name];
		}
	};

	var curId = 0;

	/**
	 * Return the next unique ID
	 * @returns {number} A unique ID
	 */
	var nextId = function() {
		return curId++;
	};

	/**
	 * Return the current ID
	 * @returns {number} The current ID
	 */
	var getId = function() {
		return curId;
	};

	/**
	 * Add a new time to a user's timeline
	 * @param name The name of the user
	 * @param time The time to add
	 */
	var addTime = function(name, time) {
		if (userdata[name]) {
			userdata[name].timeline[time] = true;
		}
	};

	/**
	 * Remove a time from a user's timeline
	 * @param name The name of the user
	 * @param time The time to remove
	 */
	var removeTime = function(name, time) {
		if (userdata[name]) {
			delete userdata[name].timeline[time];
		}
	};

	/**
	 * Move the timeline data from an old username to a new one
	 * @param oldName The username to move data from
	 * @param newName The username to move data to
	 */
	var renameTimeline = function(oldName, newName) {
		if (userdata[oldName]) {
			userdata[newName].timeline = userdata[oldName].timeline;
		}
	};

	/**
	 * Return the timeline of all users
	 * @returns {{}} The timeline of all users
	 */
	var getTimeline = function() {
		var timeline = {};
		for (var user in userdata) {
			timeline[user] = userdata[user].timeline;
		}
		return timeline;
	};

	/**
	 * Add a new game to a user by preferably getting it locally or from API if required
	 * @param name The username of the user
	 * @param gameid The id of the game
	 */
	var addGame = function(name, gameid) {
		if (!getGame(gameid))
			addGameFromAPI(gameid);
		addGameToUser(name, gameid);
	};

	/**
	 * Copy a game to a user
	 * @param name The username to copy the game to
	 * @param gameid The id of the game
	 */
	var copyGame = function(name, gameid) {
		addGameToUser(name, gameid);
	};

	/**
	 * Remove a game from a user
	 * @param name The username of the user
	 * @param gameid The id of the game
	 */
	var removeGame = function(name, gameid) {
		removeGameFromUser(name, gameid)
	};

	/**
	 * Download data for a game from the API
	 * @param gameid The id of the game
	 */
	var addGameFromAPI = function(gameid) {
		gamedata[gameid] = {
			// TODO: make api call here
			name: "Unknown game",
			coverurl: "images/unknown.png"
		}
	};

	/**
	 * Add a new game to a user from existing model
	 * @param name The username to add the game to
	 * @param gameid The id of the game
	 */
	var addGameToUser = function(name, gameid) {
		userdata[name].games[gameid] = {
			id: gameid,
			name: getGame(gameid).name,
			coverurl: getGame(gameid).coverurl
		}
	};

	/**
	 * Remove a game from a user
	 * @param name The username to remove from
	 * @param gameid The id of the game
	 */
	var removeGameFromUser = function(name, gameid) {
		delete userdata[name].games[gameid];
	};

	/**
	 * Get data for a game
	 * @param gameid The id of the game
	 * @returns {*} The data for that game
	 */
	var getGame = function(gameid) {
		return gamedata[gameid];
	};

	return {
		claimName: claimName,
		freeName: freeName,
		getUserData: getUserData,
		getName: getName,
		getGuestName: getGuestName,
		addTime: addTime,
		removeTime: removeTime,
		renameTimeline: renameTimeline,
		getTimeline: getTimeline,
		addGame: addGame,
		copyGame: copyGame,
		removeGame: removeGame
	};

}());

/**
 * Return the current time
 * @returns {string} The current time
 */
function getTime() {
	var addZero = function(i) {
		if (i < 10) i = "0" + i;
		return i;
	};
	var curdate = new Date();
	return addZero(curdate.getHours())+":"+addZero(curdate.getMinutes());
}