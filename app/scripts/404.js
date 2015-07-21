/* jshint browser:true */
/* global fetch */
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
]).then(() => {

	document.querySelector('.sorry-hero .hide-overlay').addEventListener('click', function () {
		document.querySelector('.sorry-hero').classList.add('hidden');
	});

	// Precache Responses
	fetch('./caches/2015-05-01-2015-05-10.json')
		.then(response => response.text())
		.then(string => JSON.parse(string))
		.then(json => data.populateCache(json))
		.then(() => {
				const dateRange = {
					dateFrom: "2015-05-01",
					dateTo: "2015-05-10"
				};

				data.init(dateRange);
				graph({
					generator: data.generator,
					generatorOptions: {

						// Do not fetch data for dates not
						// in the cache
						fetchMissingData: false,

						// saveCacheWhenDone: dateRange
					},
					place: '.graph-area',
					width: document.querySelector('.graph-area').clientWidth,
					height: document.querySelector('body').clientHeight
				});
		});


});
