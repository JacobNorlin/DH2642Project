'use strict';

// Declare app level module which depends on filters, and services
var app = angular.module('myApp', ['xeditable']);

app.run(function(editableOptions) {
	editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});