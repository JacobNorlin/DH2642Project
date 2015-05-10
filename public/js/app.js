'use strict';

// Declare app level module which depends on filters, and services
var app = angular.module('myApp', ['ngCookies','xeditable', 'ngResource', 'ngRoute'])

app.config(['$routeProvider', '$locationProvider',
	    function($routeProvider, $locationProvider) {
	      
	      	$routeProvider.when('/room/:roomId', {
	          templateUrl: 'index.html',
	          controller: 'AppCtrl' }).
	        otherwise({
	        	redirectTo: '/'
	        })

	        console.log($routeProvider)
	    }
	       
	  ]
	);


