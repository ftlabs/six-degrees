'use strict';

/* jshint browser:true */
require('babel/polyfill');
const data = require('./lib/data.js');
require('./lib/d3.js')({
	generator: data.generator,
	place: '.o-techdocs-content',
	width: document.querySelector('.o-techdocs-content').clientWidth,
	height: document.querySelector('body').clientHeight
});
