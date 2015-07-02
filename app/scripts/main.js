/* jshint browser:true */

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

// Start service worker
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./sw.js')
		.then(function(reg) {
			console.log('sw registered', reg);
		}).catch(function(error) {
			console.log('sw registration failed with ' + error);
		});

	// if the service worker is running...
	// We don't want to make 1000s of api requests without
	// some caching for next time.
	if (navigator.serviceWorker.controller) {
		console.log('Offlining Availble');
		document.body.classList.add('sw-ready');

		Promise.all([
			addScript('https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js'),
			addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default,Array.from')
		]).then(function () {
			addScript('./scripts/demo.js');
		});
	}
}
