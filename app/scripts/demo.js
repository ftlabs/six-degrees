'use strict';

/* jshint browser:true */
require('babel/polyfill');
require('./lib/data.js')
	.then(function(data) {
		require('./lib/d3.js')(data, {
			place: '.o-techdocs-content',
			width: document.querySelector('body').clientWidth,
			height: document.querySelector('body').clientHeight - document.querySelector('.o-header').clientHeight
		});
	});
