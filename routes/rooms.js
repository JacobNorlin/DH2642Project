'use strict';
/**
 * The model stores data
 * @type {{claimName, freeName, getUserData, getName, getGuestName, addTime, removeTime, renameTimeline, getTimeline, addGame, copyGame, removeGame}}
 */



var exports = module.exports = {};
var giantbomb = require('../config.js').giantbomb;
var request = require('request');


var rooms = {}	

exports.MAX_USERNAME_LENGTH = 30;
exports.MAX_MESSAGE_LENGTH = 1000;

exports.createNewRoom = function (roomId){
	console.log("created room")
	rooms[roomId] = new Room();
}

exports.roomExists = function(roomId) {
	for(var room in rooms){
		console.log(room == roomId )
		if(room == roomId){
			console.log("room exists")
			return true;
		}
	}

	return false;
}

exports.getRoom = function(roomId) {
	return rooms[roomId];
}

exports.generateRoomId = function(){
	function randomString(length, chars) {
	    var result = '';
	    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
	    return result;
	}
	return randomString(8, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
}


var Room = function () {
	var INITIAL_GUEST_NAME = 'Guest ';
	var userdata = {};
	var gamedata = {};

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
		if (!name || userdata[name] || name.length > exports.MAX_USERNAME_LENGTH) {
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
			if(name.length > exports.MAX_USERNAME_LENGTH) // If name is too long we give him guest name instead
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
	var addGame = function(name, gameid, callback) {
		if (!getGame(gameid)) {
			addGameByIdAPI(gameid, function(){
				addGameToUser(name, gameid);
				callback();
			});
		} else {
			addGameToUser(name, gameid);
			callback();
		}
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
	var gameSearchAPI = function(searchQuery, callback) {

		var url = "http://www.giantbomb.com/api/games/?api_key="+giantbomb.API_KEY+"&format=json&filter=name:"+searchQuery+",platforms:94&sort=original_release_date:desc&field_list=name,id,image&limit=7";
		console.log(url)
		request(url, function (error, response, data) {
			if (!error && response.statusCode == 200) {
				data = JSON.parse(data);
				if (data.results.length == 0) {
					callback({
						status: 'empty',
						data: []
					});
				} else {
					for (var i=0; i < data.results.length; i++) {
						if (!data.results[i].image)
							continue;

						gamedata[data.results[i].id] = {
							name: data.results[i].name,
							image: data.results[i].image.icon_url
						}
					}
					callback({
						status: 'ok',
						data: data.results
					});
				}
			} else if (error) {
				console.log("gameSearchAPI failed (query: "+searchQuery+")");
			}
		});
	};

	/**
	 * Download data for a game from the API
	 * @param gameid The id of the game
	 */
	var addGameByIdAPI = function(gameid, callback) {
		var url = "http://www.giantbomb.com/api/game/"+gameid+"/?api_key="+giantbomb.API_KEY+"&format=json&field_list=id,name,image";
		console.log("api requesting for id = "+gameid);
		request(url, function (error, response, data) {
			if (!error && response.statusCode == 200) {
				data = JSON.parse(data);
				gamedata[data.results.id] = {
					image: data.results.image.icon_url,
					name: data.results.name
				};
				callback();
			} else if (error) {
				console.log("addGameByIdAPI failed (gameid: "+gameid+")");
			}

		});
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
			image: getGame(gameid).image
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
		removeGame: removeGame,
		gameSearchAPI: gameSearchAPI,
		addGameByIdAPI: addGameByIdAPI
	};

}