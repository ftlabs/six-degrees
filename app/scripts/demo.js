'use strict';

/* jshint browser:true */

require('./lib/data.js')
	.then(function(data) {
		require('./lib/d3.js')(data, {
			place: '.o-techdocs-content',
			width: document.querySelector('.o-techdocs-content').clientWidth
		});
	});
