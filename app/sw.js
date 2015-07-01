/* global Cache, caches, fetch, Request, self */
/* jshint browser:true */

var API_CACHE_NAME = 'api_cache_v1';
var API_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 *3; // 3 Days

// Inline Cache polyfill
if (!Cache.prototype.add) {
	Cache.prototype.add = function add(request) {
		return this.addAll([request]);
	};
}

if (!Cache.prototype.addAll) {
	Cache.prototype.addAll = function addAll(requests) {
		var cache = this;

		// Since DOMExceptions are not constructable:
		function NetworkError(message) {
			this.name = 'NetworkError';
			this.code = 19;
			this.message = message;
		}
		NetworkError.prototype = Object.create(Error.prototype);

		return Promise.resolve().then(function() {
			if (arguments.length < 1) throw new TypeError();

			requests = requests.map(function(request) {
				if (request instanceof Request) {
					return request;
				}
				else {
					return String(request); // may throw TypeError
				}
			});

			return Promise.all(
				requests.map(function(request) {
					if (typeof request === 'string') {
						request = new Request(request);
					}

					var scheme = new URL(request.url).protocol;

					if (scheme !== 'http:' && scheme !== 'https:') {
						throw new NetworkError("Invalid scheme");
					}

					return fetch(request.clone());
				})
			);
		}).then(function(responses) {
			// TODO: check that requests don't overwrite one another
			// (don't think this is possible to polyfill due to opaque responses)
			return Promise.all(
				responses.map(function(response, i) {
					return cache.put(requests[i], response);
				})
			);
		}).then(function() {
			return undefined;
		});
	};
}

function isLocal(url) {
	return (new URL(url).host === location.host);
}

self.addEventListener('install', function(event) {
	console.log('Installing service worker');

	// If possible immediately use the new service worker.
	if (typeof event.replace !== "undefined") event.replace();
});

self.addEventListener('fetch', function(event) {

	// Don't try working offline
	if (isLocal(event.request.url)) {
		return fetch(event.request);
	}

	// Cache api requests
	var resp = caches.match(event.request)
		.then(function(r) {
			var age = Date.now() - (new Date(r.headers.get('Date')).getTime());

			// If it is stale then get a fresh one instead.
			if (r.headers.get('Date') && age > API_CACHE_MAX_AGE) {
				throw Error('Stale Cache');
			}
			return r;
		})
		.catch(function () {
			return fetch(event.request);
		})
		.then(function (fetchResponse) {
			caches.open(API_CACHE_NAME).then(function(cache) {
				console.log('Caching: ', fetchResponse.url);
				cache.put(event.request, fetchResponse);
			});
			return fetchResponse.clone();
		});
	event.respondWith(resp);
});
