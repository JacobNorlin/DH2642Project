app.run(function(editableOptions) {
	editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});

/**
 * Handle keyboard commands
 */
$(document).keydown(function(e) {
	// If ESCAPE is pressed, hide popups
	if (e.keyCode == 27 && $('#addgamepopup').is(":visible")) {
		$(".overlay, .popup").fadeOut(100);
		$('#chatinput').focus();
	}

});