'use strict';

// Declare app level module which depends on filters, and services
var app = angular.module('myApp', ['ngCookies','xeditable', 'ngResource', 'ngRoute']).
	config(['$routeProvider', '$locationProvider',
	    function($routeProvider, $locationProvider) {
	      $locationProvider.html5Mode(true);
	      $routeProvider
	        .when("/contacts/:roomId", {
	          templateUrl: "partials/index.jade",
	          controller: "AppCtrl" })
	    }
	       
	  ]
	);


