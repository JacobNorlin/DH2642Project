app.run(function(editableOptions) {
	editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});

$(document).keydown(function(e) {
	// ESCAPE key pressed
	if (e.keyCode == 27 && $('#addgamepopup').is(":visible")) {
		$(".overlay, .popup").fadeToggle(100);
		$('#chatinput').focus();
	}
});