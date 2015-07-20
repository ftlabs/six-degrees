'use strict';

/* jshint browser:true */
require('babel/polyfill');
const data = require('./lib/data.js');
const graph = require('./lib/d3.js');

window.graph = function () {
	graph({
		generator: data.generator,
		place: '.graph-area',
		width: document.querySelector('.graph-area').clientWidth,
		height: document.querySelector('body').clientHeight
	});
};
