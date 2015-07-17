'use strict';

/* jshint browser:true */
require('babel/polyfill');
const data = require('./lib/data.js');
require('./lib/d3.js')({
	generator: data.generator,
	place: '.graph-area',
	width: document.querySelector('.graph-area').clientWidth,
	height: document.querySelector('body').clientHeight
});
