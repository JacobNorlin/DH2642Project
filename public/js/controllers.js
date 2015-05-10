/**
 * This controller handles everything client-side at the moment.
 * @Authors Magnus Olsson, Richard Nysäter, Jacob Norlin
 */

'use strict';

/* Controllers */

app.controller('AppCtrl', function ($scope, $location, $cookieStore, $routeParams, socket) {
	var MAX_USERNAME_LENGTH = 30;
	var MAX_MESSAGE_LENGTH = 1000;

	// Socket listeners
	// ================


  	var roomId = $location.absUrl().split('/')[3];

  	console.log(roomId)
  	var nsp;
  	if(roomId){
	  	socket.emit('join:room', roomId, function(reply){

	  	})
  	}else{
  		socket.emit('create:room', '', function(reply){
  			$location.path('/'+reply.roomId)
  		})
  	}

	/**
	 * Send back the data from the cookies
	 */
	socket.on('cookies:get', function (data, callback) {
		if ($cookieStore.get("name")) {
			callback({
				name: $cookieStore.get("name"),
				games: $cookieStore.get("games"),
				timeline: $cookieStore.get("timeline"),
				roomId: roomId
			})
		} else {
			callback(false);
		}
	});

	/**
	 * Initialize the scope
	 */
	socket.on('init', function (data) {

		$scope.name = data.name;
		$scope.userdata = data.userdata;
		$scope.id = data.userdata[data.name].id;
		updateTitle();
	});

	/**
	 * Receive a new message in the chat log
	 */
	socket.on('send:message', function (message) {
		$scope.messages.push(message);

		// scroll to bottom
		$('#chat').animate({
			scrollTop: $('#chat')[0].scrollHeight}, 50);
	});

	/**
	 *	Change the name of a user
	 */
	socket.on('change:name', function (data) {
		changeName(data.oldName, data.newName);
	});

	/**
	 * Handle a new user joining the room
	 */
	socket.on('user:join', function (data) {
		// Send a message to the chat about the user joining
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has joined.',
			time: getTime()
		});

		$scope.userdata[data.name] = data.data;
		updateTitle();
	});

	/**
	 * Handles a user leaving the room
	 */
	socket.on('user:left', function (data) {
		// Send a message to the chat about the user leaving
		$scope.messages.push({
			user: 'chatroom',
			text: 'User ' + data.name + ' has left.',
			time: getTime()
		});

		delete $scope.userdata[data.name];
		updateTitle();
	});

	/**
	 *	Update the timeline with an added time for a user
	 */
	socket.on('timeline:edit:add', function (data) {
		if (!$scope.userdata[data.name].timeline)
			console.log("userdata did not have timeline.");

		$scope.userdata[data.name].timeline[data.time] = true;
		saveToCookie();
	});

	/**
	 *	Update the timeline with a removed time for a user
	 */
	socket.on('timeline:edit:remove', function (data) {
		delete $scope.userdata[data.name].timeline[data.time];
		saveToCookie();
	});

	/**
	 *	Update the list of games with a new game for a user
	 */
	socket.on('game:add', function (data) {
		if ($scope.userdata[data.name].games[data.gameid]) // Game already exists
			return;

		$scope.userdata[data.name].games[data.gameid] = data.gamedata;
		saveToCookie();
	});

	/**
	 *	Update the list of games with a removed game for a user
	 */
	socket.on('game:remove', function (data) {
		if (!$scope.userdata[data.name].games[data.gameid])
			console.log("tried to remove gamedata that didnt exist.");

		delete $scope.userdata[data.name].games[data.gameid];
	});

	// Private helpers
	// ===============

	/**
	 * Updates the title with the current amount of users in the room
	 */
	var updateTitle = function(){
		document.title = "["+Object.keys($scope.userdata).length+"] Gamelobby";
	};

	/**
	 * Save the user's data to a cookie.
	 */
	var saveToCookie = function() {
		$cookieStore.put("name", $scope.name);
		$cookieStore.put("games", gamesToList());
		$cookieStore.put("timeline", timelineToList());
	};

	/**
	 * Create a list of the user's games
	 * @returns {Array} An array of the games
	 */
	var gamesToList = function() {
		var games = [];
		for (var key in $scope.userdata[$scope.name].games) {
			games.push(key);
		}
		return games;
	};

	/**
	 * Create a list of the user's timeline
	 * @returns {Array} An array of the selected times in the timeline
	 */
	var timelineToList = function() {
		var timeline = [];
		for (var key in $scope.userdata[$scope.name].timeline) {
			timeline.push(key);
		}
		return timeline;
	};

	/**
	 * Changes the name of a user
	 * @param oldName The old name of the user
	 * @param newName The new name of the user
	 */
	var changeName = function (oldName, newName) {
		// rename user in list of users
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

	/**
	 * Validates name change. If the name change failed, a string should be returned.
	 * @param $data The new name of a user
	 * @returns {string} An error string if something went wrong
	 */
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

	/**
	 *	Send a message to the other users
	 */
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

	/**
	 * Show the search popup when adding a new game
	 */
	$scope.togglePopup = function() {
		$(".overlay, .popup").fadeToggle(100);
		$("#searchbox").focus();
	};

	/**
	 * Add a new game to the user's game list
	 */
	$scope.submitGameSearch = function() {
		socket.emit('game:add', $scope.searchterm);
		$scope.searchterm = '';
	};

	/**
	 * Remove a game from the user's game list
	 * @param gameid The gameid of the game to be removed
	 */
	$scope.removeGame = function(gameid) {
		socket.emit('game:remove', gameid)
		delete $scope.userdata[$scope.name].games[gameid];
		saveToCookie();
	};

	/**
	 * Copy a game from another user to this user's game list
	 * @param user The user to copy a game from
	 * @param gameid The id of the game to copy
	 */
	$scope.copyGame = function(user, gameid) {
		socket.emit('game:copy', gameid);
		$scope.userdata[$scope.name].games[gameid] = $scope.userdata[user].games[gameid];
		saveToCookie();
	};


	/**
	 * Handle timeline selection
	 */
	$(function () {

		/**
		 *	Either add or remove a piece of the timeline.
		 * @param elem The time to add or remove
		 */
		var checkState = function(elem) {
			if (elem.hasClass("timeline-highlighted"+$scope.id%7)) { //If user has highlighted the time, add it
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