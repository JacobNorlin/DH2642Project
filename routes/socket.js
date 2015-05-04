// export function for listening to the socket
module.exports = function (io) {

	io.sockets.on('connection', function (socket) {
		var name = model.getGuestName();

		// send the new user their name and a list of users
		socket.emit('init', {
			name: name,
			userdata: model.getUserData()
		});

		// notify other clients that a new user has joined
		socket.broadcast.emit('user:join', {
				name: name,
				data: model.getUserData()[name]
			}
		);

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
				model.renameTimeline(oldName, data.name);
				model.freeName(oldName);

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
				model.removeTime(data.name, data.time);
			} else if (data.operation == "add") {
				model.addTime(data.name, data.time);
			}

			socket.broadcast.emit('timeline:edit', data);
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

	// if name is available, create it
	var claimName = function (name) {
		if (!name || userdata[name]) {
			return false;
		} else {
			userdata[name] = {"id": nextId(), games: {}, timeline: {}};
			return true;
		}
	};

	// find the lowest unused "guest" name and claim it
	var getGuestName = function () {
		var name,
			nextGuestId = 1;

		do {
			name = 'Guest ' + nextGuestId;
			//name = 'Guest' + (Math.floor((Math.random() * 900) + 100));
			nextGuestId += 1;
		} while (!claimName(name));

		return name;
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

	return {
		claimName: claimName,
		freeName: freeName,
		getUserData: getUserData,
		getGuestName: getGuestName,
		addTime: addTime,
		removeTime: removeTime,
		renameTimeline: renameTimeline,
		getTimeline: getTimeline
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