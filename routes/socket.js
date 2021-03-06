/**
 * Handle serverside communication
 * @Authors Magnus Olsson, Richard Nysäter, Jacob Norlin
 * @param io The io to use
 */



// export function for listening to the socket

/**
 * TODO: Write this comment
 * @param io
 * @param rooms
 */
module.exports = function (io, rooms) {




	/**
	 * Executes when a new connection is established
	 * Pretty sure this is a closure, which is convenient
	 */
	io.sockets.on('connection', function (socket) {
		var name = '';

		console.log("Someone connected!");

		var nsp;
		var currentRoom;




		/**
		 *	Will assign the socket to the given roomId. Since the rest of the code depends on this there will be race conditions, not sure how to fix.
		 */
		socket.on('join:room', function(roomId, callback) {

			nsp = roomId;
			socket.join(nsp);
			currentRoom = rooms.getRoom(nsp);
			setAllListeners();
			callback(true);
		});

		/**
		 *	Will create a room of the given id and assign the socket to that socket room. Since the rest of the code depends on this there will be race conditions, not sure how to fix.
		 */
		socket.on('create:room', function(data, callback){
			nsp = rooms.generateRoomId();
			socket.join(nsp);
			rooms.createNewRoom(nsp);
			currentRoom = rooms.getRoom(nsp);
			setAllListeners();
			callback({
				roomId:nsp
			});
		});

		//This should fix some race conditions, its not pretty but muh concurrency. Some data loss might occur
		var setAllListeners = function() {


			//Checks for matches every X seconds
			setInterval(function() {
				var currentTime = roundTime();
		    	var data = currentRoom.filterForUsersGames(currentRoom.getUsersToNotify('18:00'), name)
		    	console.log("user", data)
		    	if(data.length > 0){
		    		socket.emit('notify:player', data);
		    	}
			}, 5 * 1000); // 60 * 1000 milsec

			/**
			 *	Check if user has existing data in a cookie
			 */
			socket.emit('cookies:get', '', function(reply) {

				if (reply) {
					name = currentRoom.getName(reply.name);

					if (reply.games) {

						reply.games.forEach(function(pair) {
							var gameid = pair[0];
							var minPlayers = pair[1];
							currentRoom.addGame(name, gameid, minPlayers, function(){
								io.sockets.emit('game:add', {
									name: name,
									gameid: gameid,
									gamedata: currentRoom.getUserData()[name].games[gameid]
								});
							});
						});
					}

					if (reply.timeline) {
						reply.timeline.forEach(function(time) {
							currentRoom.addTime(name, time);
						});
					}
				} else {
					name = currentRoom.getGuestName();
				}
				init();
			});

			/**
			 * Send the new user their name and a list of the users
			 */
			var init = function() {
				console.log(currentRoom.getUserData());
				socket.emit('init', {
					name: name,
					userdata: currentRoom.getUserData()
				});
				newJoin();
			};

			/**
			 *	Notify other clients that a new user has joined
			 */
			var newJoin = function() {
				io.to(nsp).emit('user:join', {
						name: name,
						data: currentRoom.getUserData()[name]
					}
				);
			};

			/**
			 * Broadcast a user's message to other users
			 */
			socket.on('send:message', function (data) {
				console.log(rooms);
				if(data.message.length <= rooms.MAX_MESSAGE_LENGTH) {
					io.to(nsp).emit('send:message', {
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
				if (currentRoom.claimName(data.name)) {
					var oldName = name;
					name = data.name;
					currentRoom.renameTimeline(oldName, name);
					currentRoom.freeName(oldName);

					io.to(nsp).emit('change:name', {
						oldName: oldName,
						newName: name
					});

					callback(true);
				} else {
					callback(false);
				}
			});

			/**
			* Clears the timeline of a user
			*/
			socket.on('timeline:clear', function(data){
				for(var key in currentRoom.getUserData()[data.name].timeline){
					delete currentRoom.getUserData()[data.name].timeline[key];
				}
				io.to(nsp).emit('timeline:clear', data);
			})


			/**
			 * User added a new time to their timeline
			 */
			socket.on('timeline:edit:add', function (data) {
				console.log(data);
				currentRoom.addTime(name, data.time);
				io.to(nsp).emit('timeline:edit:add', data);
			});

			/**
			 * User removed a time from their timeline
			 */
			socket.on('timeline:edit:remove', function (data) {
				currentRoom.removeTime(name, data.time);
				io.to(nsp).emit('timeline:edit:remove', data);
			});

			/**
			 * User sends search request to server
			 */
			socket.on('game:search', function (searchquery) {
				currentRoom.gameSearchAPI(searchquery, function(results) {
					io.sockets.emit('game:searchresults', results);
				});
			});

			/**
			 * Store new number of min players
			 */
			socket.on('numplayer:change', function(data){
				currentRoom.updateNumPlayers(data.name, data.userdata);
				io.to(nsp).emit('numplayer:change', currentRoom.getUserData());
			});

			/**
			 * User added a new game
			 */
			socket.on('game:add', function (gameid) {
				currentRoom.addGame(name, gameid, 2, function() {
					io.sockets.emit('game:add', {
						name: name,
						gameid: gameid,
						gamedata: currentRoom.getUserData()[name].games[gameid]
					});
				});
			});

			/**
			 * User copied a game
			 */
			socket.on('game:copy', function (gameid) {
				currentRoom.copyGame(name, gameid);
				io.to(nsp).emit('game:add', {
					name: name,
					gameid: gameid,
					gamedata: currentRoom.getUserData()[name].games[gameid]
				});
			});

			/**
			 * User removed a game
			 */
			socket.on('game:remove', function (gameid) {
				currentRoom.removeGame(name, gameid);
				io.to(nsp).emit('game:remove', {
					name: name,
					gameid: gameid
				});
			});

			/**
			 * Clean up when a user leaves, and broadcast it to other users
			 */
			socket.on('disconnect', function () {
				io.to(nsp).emit('user:left', {
					name: name
				});
				currentRoom.freeName(name);
			});

		}



	})
};

//Takes a date() and rounds it to neares 30 mins and returns it as formatted string.
var roundTime = function(){
	var coeff = 1000 * 60 * 30;
	var date = new Date();  //or use any other date
	var rounded = new Date(Math.round(date.getTime() / coeff) * coeff)
	return formatTime(rounded);
}

function formatTime(date) {
	var addZero = function(i) {
		if (i < 10) i = "0" + i;
		return i;
	};
	var curdate = new Date();
	return addZero(date.getHours())+":"+addZero(date.getMinutes());
}

/**
 * Return the current time
 * @returns {string} The current time
 */
function getTime() {
	return formatTime(new Date());
}