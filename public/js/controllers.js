'use strict';

/* Controllers */

app.controller('AppCtrl', function ($scope, socket) {
	var MAX_USERNAME_LENGTH = 30;
	var MAX_MESSAGE_LENGTH = 1000;

	// Socket listeners
	// ================

	socket.on('init', function (data) {
		$scope.name = data.name;
		$scope.users = data.users;
		$scope.timeline = data.timeline;
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
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has joined.',
			time: getTime()
		});
		$scope.users.push(data.name);

		$scope.timeline[data.name] = {};

		updateTitle();
	});

	// add a message to the conversation when a user disconnects or leaves the room
	socket.on('user:left', function (data) {
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has left.',
			time: getTime()
		});
		var i, user;
		for (i = 0; i < $scope.users.length; i++) {
			user = $scope.users[i];
			if (user === data.name) {
				$scope.users.splice(i, 1);
				break;
			}
		}

		delete $scope.timeline[data.name];
		updateTitle();
	});

	socket.on('timeline:edit', function (data) {
		if (data.operation == "remove") {
			delete $scope.timeline[data.name][data.time];
		} else if (data.operation == "add") {
			if (!$scope.timeline[data.name])
				$scope.timeline[data.name] = {};
			$scope.timeline[data.name][data.time] = true;
		}
	});


	// Private helpers
	// ===============

	/*
		Updates the title with the current amount of users in the room
	 */
	var updateTitle = function(){
		document.title = "["+$scope.users.length+"] Gamelobby";
	}

	var changeName = function (oldName, newName) {
		// rename user in list of users
		var i;
		for (i = 0; i < $scope.users.length; i++) {
			if ($scope.users[i] === oldName) {
				$scope.users[i] = newName;
			}
		}

		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + oldName + ' is now known as ' + newName + '.',
			time: getTime()
		});

		$scope.timeline[newName] = $scope.timeline[oldName];
		delete $scope.timeline[oldName];

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
			}
		});
	};

	$scope.messages = [];

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

	$scope.timeline = {};

	$scope.togglePopup = function() {
		$(".overlay, .popup").fadeToggle(100);
	};

	$(function () {
		var checkState = function(elem) {
			if (elem.hasClass("timeline-highlighted")) {
				socket.emit('timeline:edit', {
					operation: "add",
					time: elem.attr("id")
				});
				//console.log(elem.attr("id")+" enabled");
			}
			else {
				socket.emit('timeline:edit', {
					operation: "remove",
					time: elem.attr("id")
				});
				//console.log(elem.attr("id")+" disabled");
			}
		};

		var isMouseDown = false;

		$("#timeline-row td:not(.no-select)")
			.mousedown(function () {
				isMouseDown = true;
				$(this).toggleClass("timeline-highlighted");
				checkState($(this));
				return false; // prevent text selection
			})
			.mouseover(function () {
				if (isMouseDown) {
					$(this).toggleClass("timeline-highlighted");
					checkState($(this));
				}
			});

		$(document)
			.mouseup(function () {
				isMouseDown = false;
			});
	});

});

function getTime() {
	var addZero = function(i) {
		if (i < 10) i = "0" + i;
		return i;
	};
	var curdate = new Date();
	return addZero(curdate.getHours())+":"+addZero(curdate.getMinutes());
}