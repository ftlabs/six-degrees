/* jshint browser:true */

'use strict';

require('babel/polyfill');
const data = require('./lib/data.js');
const graph = require('./lib/d3.js');

function addScript(url) {
	return new Promise(function (resolve, reject) {
		var script = document.createElement('script');
		script.setAttribute('src', url);
		document.head.appendChild(script);
		script.onload = resolve;
		script.onerror = reject;
	});
}

Promise.all([
	addScript('https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js'),
	addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default')
]).then(function () {
	data.init();
	graph({
		generator: data.generator,
		place: '.graph-area',
		width: document.querySelector('.graph-area').clientWidth,
		height: document.querySelector('body').clientHeight
	});
});
