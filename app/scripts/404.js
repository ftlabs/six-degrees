/* jshint browser:true */
/* global fetch */
'use strict';


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

	return addScript('./scripts/graph.js');

}).then(function () {

	// wait about 20s then fetch the whole cache. ~3MB
	setTimeout(function () {
		fetch('./scripts/caches/everything.json')
			.then(response => response.text())
			.then(string => JSON.parse(string))
			.then(json => window.populateCache(json));	
	}, 20000);

	// Load about 30 seconds now
	return fetch('./scripts/caches/beginning.json')
		.then(response => response.text())
		.then(string => JSON.parse(string))
		.then(json => window.populateCache(json))
		.then(() => window.graph());
});
