'use strict';

/* Controllers */

app.controller('AppCtrl', function ($scope, $cookieStore, socket) {
	var MAX_USERNAME_LENGTH = 30;
	var MAX_MESSAGE_LENGTH = 1000;

	// Socket listeners
	// ================

	socket.on('cookies:get', function (data, callback) {
		if ($cookieStore.get("name")) {
			callback({
				name: $cookieStore.get("name"),
				games: $cookieStore.get("games"),
				timeline: $cookieStore.get("timeline")
			})
		} else {
			callback(false);
		}
	});

	socket.on('init', function (data) {
		$scope.name = data.name;
		$scope.userdata = data.userdata;
		$scope.id = data.userdata[data.name].id;
		updateTitle();
	});

	socket.on('send:message', function (message) {
		$scope.messages.push(message);

		// scroll to bottom
		$('#chat').animate({
			scrollTop: $('#chat')[0].scrollHeight}, 50);
	});

	socket.on('change:name', function (data) {
		changeName(data.oldName, data.newName);
	});

	socket.on('user:join', function (data) {
		console.log("join: ");
		console.log(data);
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has joined.',
			time: getTime()
		});
		$scope.userdata[data.name] = data.data;
		updateTitle();
	});

	// add a message to the conversation when a user disconnects or leaves the room
	socket.on('user:left', function (data) {
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has left.',
			time: getTime()
		});
		delete $scope.userdata[data.name];
		updateTitle();
	});

	socket.on('timeline:edit:add', function (data) {
		if (!$scope.userdata[data.name].timeline)
			console.log("userdata did not have timeline.");
		$scope.userdata[data.name].timeline[data.time] = true;
		saveToCookie();
	});

	socket.on('timeline:edit:remove', function (data) {
		delete $scope.userdata[data.name].timeline[data.time];
		saveToCookie();
	});

	socket.on('game:add', function (data) {
		if ($scope.userdata[data.name].games[data.gameid])
			return;
		$scope.userdata[data.name].games[data.gameid] = data.gamedata;
		saveToCookie();
	});

	socket.on('game:remove', function (data) {
		if (!$scope.userdata[data.name].games[data.gameid])
			console.log("tried to remove gamedata that didnt exist.");
		delete $scope.userdata[data.name].games[data.gameid];
	});

	// Private helpers
	// ===============

	/*
		Updates the title with the current amount of users in the room
	 */
	var updateTitle = function(){
		document.title = "["+Object.keys($scope.userdata).length+"] Gamelobby";
	};

	var saveToCookie = function() {
		$cookieStore.put("name", $scope.name);
		$cookieStore.put("games", gamesToList());
		$cookieStore.put("timeline", timelineToList());
	}

	var gamesToList = function() {
		var games = [];
		for (var key in $scope.userdata[$scope.name].games) {
			games.push(key);
		}
		return games;
	};

	var timelineToList = function() {
		var timeline = [];
		for (var key in $scope.userdata[$scope.name].timeline) {
			timeline.push(key);
		}
		return timeline;
	};

	var changeName = function (oldName, newName) {
		// rename user in list of §users
		var i;
		$scope.userdata[newName] = $scope.userdata[oldName];
		delete $scope.userdata[oldName];

		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + oldName + ' is now known as ' + newName + '.',
			time: getTime()
		});

		$('#chat').animate({
			scrollTop: $('#chat')[0].scrollHeight}, 50);
	};

	// Methods published to the scope
	// ==============================

	// validates name change. if name is illegal, a string should be returned.
	$scope.changeName = function ($data) {
		if($data.length > MAX_USERNAME_LENGTH)
			return "Names are limited to 30 characters, try a shorter name.";

		$scope.oldName = $scope.name;
		socket.emit('change:name', {
			name: $data
		}, function (result) {
			if (!result) {
				$scope.name = $scope.oldName;
				if ($data.length == 0)
					alert('Zero-length names are not allowed.');
				else
					alert('Error changing name. Perhaps it is already taken?');
				return "Error when changing name.";
			} else {
				saveToCookie();
			}
		});
	};

	$scope.messages = [];

	// fires when pressing enter in chat input box
	$scope.sendMessage = function () {
		if ($scope.message.length == 0) {
			return;
		} else if($scope.message.length > MAX_MESSAGE_LENGTH)	{
			$scope.message = $scope.message.substr(0,MAX_MESSAGE_LENGTH);
		}
		socket.emit('send:message', {
			message: $scope.message
		});

		$scope.message = '';
	};

	$scope.togglePopup = function() {
		$(".overlay, .popup").fadeToggle(100);
		$("#searchbox").focus();
	};

	$scope.submitGameSearch = function() {
		socket.emit('game:add', $scope.searchterm);
		$scope.searchterm = '';
	}

	$scope.removeGame = function(gameid) {
		socket.emit('game:remove', gameid)
		delete $scope.userdata[$scope.name].games[gameid];
		saveToCookie();
	}

	$scope.copyGame = function(user, gameid) {
		socket.emit('game:copy', gameid);
		$scope.userdata[$scope.name].games[gameid] = $scope.userdata[user].games[gameid];
		saveToCookie();
	}

	// timeline selection
	$(function () {

		var checkState = function(elem) {
			if (elem.hasClass("timeline-highlighted"+$scope.id%7)) {
				socket.emit('timeline:edit:add', {
					name: $scope.name,
					time: elem.attr("id")
				});
				//console.log(elem.attr("id")+" enabled");
			}
			else {
				socket.emit('timeline:edit:remove', {
					name: $scope.name,
					time: elem.attr("id")
				});
				//console.log(elem.attr("id")+" disabled");
			}
		};

		var isMouseDown = false;


		$("#timeline-row td:not(.no-select)")
			.mousedown(function () {
				isMouseDown = true;
				$(this).toggleClass("timeline-highlighted"+$scope.id%7);
				checkState($(this));
				return false; // prevent text selection
			})
			.mouseover(function () {
				if (isMouseDown) {
					$(this).toggleClass("timeline-highlighted"+$scope.id%7);
					checkState($(this));
				}
			});

		$(document)
			.mouseup(function () {
				isMouseDown = false;
			});
	});

	$scope.times = [ '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00' ];

});

function getTime() {
	var addZero = function(i) {
		if (i < 10) i = "0" + i;
		return i;
	};
	var curdate = new Date();
	return addZero(curdate.getHours())+":"+addZero(curdate.getMinutes());
}