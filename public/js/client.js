app.run(function(editableOptions) {
	editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});

$(function () {
	var checkState = function(elem) {
		if (elem.hasClass("timeline-highlighted"))
			console.log(elem.attr("id")+" enabled");
		else
			console.log(elem.attr("id")+" disabled");
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