// export function for listening to the socket
module.exports = function (io) {

	io.sockets.on('connection', function (socket) {
		var name = '';

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

		// send the new user their name and a list of users
		var init = function() {
			socket.emit('init', {
				name: name,
				userdata: model.getUserData()
			});
			newJoin();
		}

		// notify other clients that a new user has joined
		var newJoin = function() {
			socket.broadcast.emit('user:join', {
					name: name,
					data: model.getUserData()[name]
				}
			);
		}

		// broadcast a user's message to other users
		socket.on('send:message', function (data) {
			io.sockets.emit('send:message', {
				user: name,
				text: data.message,
				time: getTime()
			});
		});

		// validate a user's name change, and broadcast it on success
		socket.on('change:name', function (data, fn) {
			if (model.claimName(data.name)) {
				var oldName = name;
				name = data.name;
				model.renameTimeline(oldName, name);
				model.freeName(oldName);

				io.sockets.emit('change:name', {
					oldName: oldName,
					newName: name
				});

				fn(true);
			} else {
				fn(false);
			}
		});

		// user changed their timeline preferences
		socket.on('timeline:edit:add', function (data) {
			model.addTime(name, data.time);
			io.sockets.emit('timeline:edit:add', data);
		});

		socket.on('timeline:edit:remove', function (data) {
			model.removeTime(name, data.time);
			io.sockets.emit('timeline:edit:remove', data);
		});


		// user added/removed game
		socket.on('game:add', function (gameid) {
			model.addGame(name, gameid);
			io.sockets.emit('game:add', {
				name: name,
				gameid: gameid,
				gamedata: model.getUserData()[name].games[gameid]
			});
		});

		// user added/removed game
		socket.on('game:copy', function (gameid) {
			model.copyGame(name, gameid);
			socket.broadcast.emit('game:add', {
				name: name,
				gameid: gameid,
				gamedata: model.getUserData()[name].games[gameid]
			});
		});

		socket.on('game:remove', function (gameid) {
			model.removeGame(name, gameid);
			socket.broadcast.emit('game:remove', {
				name: name,
				gameid: gameid
			});
		});

		// clean up when a user leaves, and broadcast it to other users
		socket.on('disconnect', function () {
			socket.broadcast.emit('user:left', {
				name: name
			});
			model.freeName(name);
		});

	})
};

// Keep track of which names are used so that there are no duplicates
var model = (function () {
	var userdata = {};
	var gamedata = {};
	gamedata["csgo"] = {
		coverurl: "images/csgo_thumb.jpg",
		name: "Counter-Strike: Global Offensive"
	};
	gamedata["quake3"] = {
		coverurl: "images/quake3_thumb.jpg",
		name: "Quake 3 Arena"
	};
	gamedata["l4d"] = {
		coverurl: "images/l4d_thumb.jpg",
		name: "Left 4 Dead"
	};
	gamedata["dota2"] = {
		coverurl: "images/dota2_thumb.jpg",
		name: "Dota 2"
	};

	// if name is available, create it
	var claimName = function (name) {
		if (!name || userdata[name]) {
			return false;
		} else {
			userdata[name] = {"id": nextId(), games: {}, timeline: {}};
			return true;
		}
	};

	var getName = function(name) {
		var nextNum = 1;
		if (name === 'Guest ')
			name = name+nextNum;

		while (!claimName(name)) {
			name = name + nextNum;
			nextNum += 1;
		}

		return name;
	}

	// find the lowest unused "guest" name and claim it
	var getGuestName = function () {
		return getName('Guest ');
	};

	// serialize claimed names as an array
	var getUserData = function () {
		return userdata;
	};

	// delete user name
	var freeName = function (name) {
		if (userdata[name]) {
			delete userdata[name];
		}
	};

	// add time for username at time
	var addTime = function(name, time) {
		if (userdata[name]) {
			userdata[name].timeline[time] = true;
		}
	};

	//
	var curId = 0;
	var nextId = function() {
		return curId++;
	};

	var getId = function() {
		return curId;
	}

	// remove time for username at time
	var removeTime = function(name, time) {
		if (userdata[name]) {
			delete userdata[name].timeline[time];
		}
	};

	// move timeline data from old username to new
	var renameTimeline = function(oldName, newName) {
		if (userdata[oldName]) {
			userdata[newName].timeline = userdata[oldName].timeline;
		}
	};

	// return timeline data for all users
	var getTimeline = function() {
		var timeline = {};
		for (var user in userdata) {
			timeline[user] = userdata[user].timeline;
		}
		return timeline;
	};

	var addGame = function(name, gameid) {
		if (!getGame(gameid))
			addGameFromAPI(gameid);
		addGameToUser(name, gameid);
	};

	var copyGame = function(name, gameid) {
		addGameToUser(name, gameid);
	};

	var removeGame = function(name, gameid) {
		removeGameFromUser(name, gameid)
	};

	var addGameFromAPI = function(gameid) {
		gamedata[gameid] = {
			// make api call
			name: "Unknown game",
			coverurl: "images/unknown.png"
		}
	};

	var addGameToUser = function(name, gameid) {
		userdata[name].games[gameid] = {
			id: gameid,
			name: getGame(gameid).name,
			coverurl: getGame(gameid).coverurl
		}
	}

	var removeGameFromUser = function(name, gameid) {
		delete userdata[name].games[gameid];
	}

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

function getTime() {
	var addZero = function(i) {
		if (i < 10) i = "0" + i;
		return i;
	};
	var curdate = new Date();
	return addZero(curdate.getHours())+":"+addZero(curdate.getMinutes());
}