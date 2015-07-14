'use strict';

/* jshint browser:true */
require('babel/polyfill');
require('./lib/d3.js')(
	require('./lib/data.js').iterator, {
	place: '.o-techdocs-content',
	width: document.querySelector('.o-techdocs-content').clientWidth,
	height: document.querySelector('body').clientHeight
});
