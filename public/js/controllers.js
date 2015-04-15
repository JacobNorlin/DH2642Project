'use strict';

/* Controllers */

app.controller('AppCtrl', function ($scope, socket) {
	var MAX_USERNAME_LENGTH = 30;
	var MAX_MESSAGE_LENGTH = 1000;

	var chat = $("#chat");

	// Socket listeners
	// ================

	socket.on('init', function (data) {
		$scope.name = data.name;
		$scope.users = data.users;
		updateTitle();
	});

	socket.on('send:message', function (message) {
		$scope.messages.push(message);
		chat.scrollTop(chat.prop("scrollHeight")); // scroll to bottom
		// chat.scrollTop(1e+10); // scroll to bottom
	});

	socket.on('change:name', function (data) {
		changeName(data.oldName, data.newName);
	});

	socket.on('user:join', function (data) {
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has joined.'
		});
		$scope.users.push(data.name);
		updateTitle();
	});

	// add a message to the conversation when a user disconnects or leaves the room
	socket.on('user:left', function (data) {
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has left.'
		});
		var i, user;
		for (i = 0; i < $scope.users.length; i++) {
			user = $scope.users[i];
			if (user === data.name) {
				$scope.users.splice(i, 1);
				break;
			}
		}
		updateTitle();
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
			text: 'User ' + oldName + ' is now known as ' + newName + '.'
		});
	}

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
				alert('There was an error changing your name. Names cannot be blank or more than 30 characters and must be unique.');
				return "Error changing name.";
			} else {
				changeName($scope.oldName, $data);
				$scope.name = $data;
			}
		});
	};

	$scope.messages = [];

	$scope.sendMessage = function () {
		if ($scope.message.length == 0)
			return;
		else if($scope.message.length > MAX_MESSAGE_LENGTH)
		{
			$scope.message = $scope.message.substr(0,MAX_MESSAGE_LENGTH);
		}
		socket.emit('send:message', {
			message: $scope.message
		});

		// add the message to our model locally
		$scope.messages.push({
			user: $scope.name,
			text: $scope.message
		});

		// clear message box
		$scope.message = '';
		chat.scrollTop(chat.prop("scrollHeight")); // scroll to bottom
		// chat.scrollTop(1e+10); // scroll to bottom
	};

	$scope.togglePopup = function() {
		$(".overlay, .popup").fadeToggle(100);
	};

});
