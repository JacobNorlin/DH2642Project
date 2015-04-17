// export function for listening to the socket
module.exports = function (io) {

	io.sockets.on('connection', function (socket) {
		var name = model.getGuestName();

		// send the new user their name and a list of users
		socket.emit('init', {
			name: name,
			users: model.get()
		});

		// notify other clients that a new user has joined
		socket.broadcast.emit('user:join', {
			name: name
		});

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
			if (model.claim(data.name)) {
				var oldName = name;
				model.free(oldName);

				name = data.name;

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
		socket.on('timeline:edit', function (data) {
			if (data.operation == "remove") {
				model.removeTime(name, data.time);
			} else if (data.operation == "add") {
				model.addTime(name, data.time);
			}

			//add sender's name
			data.name = name;

			socket.broadcast.emit('timeline:edit', data);
		});

		// clean up when a user leaves, and broadcast it to other users
		socket.on('disconnect', function () {
			socket.broadcast.emit('user:left', {
				name: name
			});
			model.free(name);
		});

	})
};

// Keep track of which names are used so that there are no duplicates
var model = (function () {
	var userdata = {};

	var claim = function (name) {
		if (!name || userdata[name]) {
			return false;
		} else {
			userdata[name] = {games: {}, times: {}};
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
		for (var user in userdata) {
			res.push(user);
		}

		return res;
	};

	var free = function (name) {
		if (userdata[name]) {
			delete userdata[name];
		}
	};

	var addTime = function(name, time) {
		if (userdata[name]) {
			userdata[name].times[time] = true;
		}
	};

	var removeTime = function(name, time) {
		if (userdata[name]) {
			delete userdata[name].times[time];
		}
	};

	var getTimes = function(name) {
		if (userdata[name])
			return userdata[name].times;
	};

	return {
		claim: claim,
		free: free,
		get: get,
		getGuestName: getGuestName,
		addTime: addTime,
		removeTime: removeTime,
		getTimes: getTimes
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