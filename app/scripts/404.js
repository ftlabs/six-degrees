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
]).then(() => {

	document.querySelector('.sorry-hero .hide-overlay').addEventListener('click', function () {
		document.querySelector('.sorry-hero').classList.add('hidden');
	});

	// Precache Responses then run do notallow trying to fetch fresh data
	const json = require('../caches/2015-04-01-2015-06-01.json');

	data.populateCache(json.cachedResponses);

	// fetch dateFrom and dateTo information from the cache file
	let {dateFrom, dateTo} = json;

	const dateRange = {dateFrom, dateTo};

	data.init(dateRange);
	graph({
		generator: data.generator,
		generatorOptions: {

			// Do not fetch data for dates not
			// in the cache
			fetchMissingData: false
		},
		place: '.graph-area',
		width: document.querySelector('.graph-area').clientWidth,
		height: document.querySelector('body').clientHeight
	});


	// Run the demo caching responses then save to a file at the end.

	// const dateRange = {dateFrom: "2015-04-01", dateTo: "2015-06-01"};

	// data.init(dateRange);
	// graph({
	// 	generator: data.generator,
	// 	generatorOptions: {

	// 		// Once it has loaded save the cache to a new file with
	// 		// the dateRange set to the dateRange which was loaded.
	// 		saveCacheWhenDone: dateRange
	// 	},
	// 	place: '.graph-area',
	// 	width: document.querySelector('.graph-area').clientWidth,
	// 	height: document.querySelector('body').clientHeight
	// });
});
