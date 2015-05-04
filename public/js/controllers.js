'use strict';

/* Controllers */

app.controller('AppCtrl', function ($scope, socket) {
	var MAX_USERNAME_LENGTH = 30;
	var MAX_MESSAGE_LENGTH = 1000;

	// Socket listeners
	// ================

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

	socket.on('timeline:edit', function (data) {
		if (data.operation == "remove") {
			delete $scope.userdata[data.name].timeline[data.time];
		} else if (data.operation == "add") {
			if (!$scope.userdata[data.name].timeline)
				console.log("userdata did not have timeline.");
			$scope.userdata[data.name].timeline[data.time] = true;
		}
	});


	// Private helpers
	// ===============

	/*
		Updates the title with the current amount of users in the room
	 */
	var updateTitle = function(){
		document.title = "["+Object.keys($scope.userdata).length+"] Gamelobby";
	}

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
	};

	// timeline selection
	$(function () {
		var checkState = function(elem) {
			if (elem.hasClass("timeline-highlighted"+$scope.id%7)) {
				socket.emit('timeline:edit', {
					name: $scope.name,
					operation: "add",
					time: elem.attr("id")
				});
				//console.log(elem.attr("id")+" enabled");
			}
			else {
				socket.emit('timeline:edit', {
					name: $scope.name,
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