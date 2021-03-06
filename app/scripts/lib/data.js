/* global fetch, atob */
/*jshint esnext:true */

'use strict';

// fetch list of people.
// pick one
// fetch their coocurring people
// then fetch theirs
const ui = require('./ui');

const unifiedData = {};
const populus = [];

const MAX_NUMBER_OF_NODES = 10;

const TOPIC_MIN_RELEVANCE = 0.6;
const TOPIC_MAX_COUNT = 5;

const TIME_DATA_COLLECTED_FROM = 1413649806047;

const currentDate = (new Date()).getDate();

const stepSize = 1;
const windowSize = 7;

const configs = [];

const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const namesOfTheMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const topicQueue = [];

const renderInformationUI = !!document.querySelector('.information');

class Person {
	constructor(personData) {
		this.name = personData.name;
		this.label = personData.name;
		this.numberOfOccurences = personData.numberOfOccurences;
		this.id = personData.id;
		this.isAmbassador = personData.isAmbassador;
		this.island = personData.island;
		this.islandIndex = personData.islandIndex;
		this.style = 'default';
		this.connectionWeights = new Map();
		this.normalizedConnectionWeights = new Map();
		this.connections = new Set();

		//unpack island
		if (typeof this.island.connections.unpacked === 'undefined') {
			this.island.connections.unpacked = this.island.connections.uncompressed;
		}
	}

	clearConnectionCache() {
		this.connections.clear();
		this.connectionWeights.clear();
		this.normalizedConnectionWeights.clear();
	}

	getConnections(maxDepth=1, depth=1) {

		// Update own set of connections.
		if (!this.connections.size) {

			// create people for each connection.
			const connections = this.island.connections.unpacked[this.islandIndex]
					.map((numberOfConnections, i) => {
						if (numberOfConnections === 0) {
							return false;
						}
						const connectedPerson = getOrCreatePerson(this.island.islanders[i]);
						this.connectionWeights.set(connectedPerson, numberOfConnections);
						this.normalizedConnectionWeights.set(connectedPerson, numberOfConnections/this.island.maxConnections);
						return connectedPerson;
					})
					.filter(p => p !== false);

			if (connections.length) {
				this.connections.add(...connections);
			}
		}

		const collectedPeople = new Set([this]);

		this.connections.forEach(c => collectedPeople.add(c));

		if (depth < maxDepth) {
			this.connections.forEach(person => person
				.getConnections(maxDepth, depth + 1)
				.forEach(c => collectedPeople.add(c))
			);
		}

		return collectedPeople;
	}

	isConnectedTo(person) {
		if (typeof this.connections === 'undefined') {
			this.getConnections(1);
		}
		return this.connections.has(person);
	}
}

function getOrCreatePerson(options) {
	for (let p of populus) {
		if (p.id === options.id) {
			return p;
		}
	}
	let np = new Person(options);
	populus.push(np);
	return np;
}

const responseCache = new Map();
function fetchJSON(options, ...urls) {

	let modal;

	if (typeof options === 'string') {
		urls.unshift(options);
	}

	// If not all of the responses are cached then show the overlay
	if (urls.map(url => responseCache.has(url)).indexOf(false) !== -1) {
		modal = ui.modal('.o-techdocs-main', `Loading:<br /> ${urls.join('<br />')}`);
	}

	return Promise.all(urls.map(url => {

		// Fetch and cache response
		if (responseCache.has(url)) {
			return Promise.resolve(responseCache.get(url))
				.then(string => JSON.parse(string));
		} else {

			if (options.forceCache) {
				throw Error('Will not fetch fresh requests cache needs to be prepopulated');
			}

			console.log('Loading: ', url);

			return fetch(url)
				.then(response => response.text())
				.then(string => {

					// cache response body string
					responseCache.set(url, string);
					return string;
				})
				.then(string => JSON.parse(string));
		}
	}))
	.then(results => {
		if (modal) modal.remove();
		return results;
	});
}

/**
 * Save the cache to a file
 * @param  {string} dateFrom Reference start date format 2015-01-01
 * @param  {string} dateTo   Reference end date format 2015-01-01
 * @return {void}
 */
function printCache({dateFrom, dateTo}) {

	if (!dateFrom || !dateTo) {
		throw Error("Reference dates need to be defined for sensible output.");
	}

	const output = {};
	Array.from(responseCache.keys()).forEach(i => {
		output[i] = responseCache.get(i);
	});

	var downloadLink = document.createElement("a");
	var blob = new Blob(["\ufeff", JSON.stringify({
		dateFrom,
		dateTo,
		cachedResponses: output
	})]);
	var url = URL.createObjectURL(blob);
	downloadLink.href = url;
	downloadLink.download = "cache.json";

	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

function populateCache(urlsToString) {
	for (let url in urlsToString) {
		if (urlsToString.hasOwnProperty(url)) {
			responseCache.set(url, urlsToString[url]);
		}
	}
}

function getConnectionsForPeople(peopleArray) {

	// Each person should populate their connections
	peopleArray = peopleArray.map(person => getOrCreatePerson(person));
	peopleArray.forEach(person => person.getConnections(1));
	return {nodes: peopleArray};
}

function updateData({daysAgo, days}, fetchMissing = true) {
	return (
			fetchJSON(
				{forceCache: !fetchMissing},
				'https://ftlabs-sapi-capi-slurp-slice.herokuapp.com' + `/erdos_islands_of/people/with_connectivity/just_top_10?slice=${daysAgo},${days}&uncompressed=true`,
				'https://ftlabs-sapi-capi-slurp-slice.herokuapp.com' + `/metadatums_freq/by_type/primaryTheme/by_type?slice=${daysAgo},${days}`
			)
		)
		.then(function([islandsJSON, topicsJson]) {

			const peopleList = [];
			islandsJSON.islands.forEach(function (island) {
				peopleList.push(...island.islanders.map(islanders => islanders[0]));
			});

			const topics = topicsJson

				// Find topic list in returned data
				.metadatums_freq_by_type_by_type.primaryTheme.topics

				// Reduce to only significant topics
				.reduce((acc, topic) => {
					if (!acc.length || ((acc[0][1] * TOPIC_MIN_RELEVANCE) < topic[1]) && acc.length < TOPIC_MAX_COUNT) {
						acc.push(topic);
					}
					return acc;
				}, [])

				// Remove topics: prefix
				.map(topic => topic[0].slice(7))
			;

			return [
				peopleList,
				islandsJSON,
				topics
			];
		})
		.then(function ([people, islandsJSON, topics]) {

			people.map(function (p) {
				unifiedData[p] = unifiedData[p] || {
					id: p,
					name: p.slice(7)
				};
				return unifiedData;
			});

			islandsJSON.islands.forEach(function (island) {

				island.maxConnections = island.ambassador[1];

				island.islanders = island.islanders.map(function (islander, index) {
					const id = islander[0];
					unifiedData[id].numberOfOccurences = islander[1];
					unifiedData[id].isAmbassador = (id === island.ambassador[0]);
					unifiedData[id].island = island;
					unifiedData[id].islandIndex = index;
					if (unifiedData[id].connections) {
						unifiedData[id].clearConnectionCache();
					}

					// update the source data to have objects
					// rather than arrays.
					return unifiedData[id];
				});
			});

			return [islandsJSON.islands[0].islanders.slice(0, MAX_NUMBER_OF_NODES), topics];
		})
		.then(([people, topics]) => ({nodes: getConnectionsForPeople(people), topics}));
}

function stringifyDateNumber(n) {
	const nString = String(n);
	if (nString.length === 1) return "0" + nString;
	return nString;
}

function renderTopics(topicList) {
	let listEl = document.querySelector('.topics_topic-list');
	topicList.forEach(topic => {
		let el = document.getElementById('topic-' + topic);
		if (!el) {
			el = document.createElement('li');
			el.id = 'topic-'+topic;
			el.innerHTML = "<div>"+topic+"</div>";
			listEl.appendChild(el);
		}
		topicQueue.push([el, 'add']);
	});
	Array.from(document.querySelectorAll('.topics_topic-list li')).forEach(el => {
		if (topicList.indexOf(el.querySelector('div').innerHTML) === -1) {
			topicQueue.push([el, 'remove']);
		}
	});
}

/**
 * Generate the config which the generator iterates over.
 * Parameters can be overridden by parameters in the search string. E.g.
 * http://ftlabs-six-degrees.herokuapp.com/graph.html?dateFrom=2015-07-05&dateTo=2015-07-08
 * or
 * http://ftlabs-six-degrees.herokuapp.com/graph.html?daysBack=18
 *
 * @param  {Integer} options.daysBack Number of days to go back
 * @param  {Unix Timestamp} options.dateTo   Used for defining a date range
 * @param  {Unix Timestamp} options.dateFrom Used for defining a date range
 * @return void
 */
module.exports.init = function({daysBack, dateTo, dateFrom} = {}) {

	if (dateFrom) {
		dateFrom = dateFrom.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (!dateFrom) throw Error("Invalid dateFrom format needs to be like: 2015-07-18");
		dateFrom = new Date(dateFrom[1], Number(dateFrom[2]) - 1, dateFrom[3]).getTime();

		if (dateTo) {
			dateTo = dateTo.match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (!dateTo) throw Error("Invalid dateTo format needs to be like: 2015-07-18");
			dateTo = new Date(dateTo[1], Number(dateTo[2]) - 1, dateTo[3]).getTime();
		}
	} else {

		let dateFromTo = location.search.match(/^\?dateFrom=(\d{4})-(\d{2})-(\d{2})(&dateTo=(\d{4})-(\d{2})-(\d{2}))?/);
		if (dateFromTo && dateFromTo[1] && dateFromTo[2] && dateFromTo[3]){
			dateFrom = new Date(dateFromTo[1], Number(dateFromTo[2]) - 1, dateFromTo[3]).getTime();
			if (dateFromTo && dateFromTo[5] && dateFromTo[6] && dateFromTo[7]){
				dateTo = new Date(dateFromTo[5], Number(dateFromTo[6]) - 1, dateFromTo[7]).getTime();
			}
		}
	}

	if (!daysBack) {
		daysBack = location.search.match(/^\?daysBack=(\d+)/);
		if (daysBack && daysBack[1]) {
			daysBack = Number(daysBack[1]);
		}
	}

	// if days back not set by the search string or the function arguments then
	// daysBack is calculated using the dateFrom or if that it not set defaults
	// to showing the whole range.
	daysBack = daysBack || Math.floor((Date.now() - (dateFrom || TIME_DATA_COLLECTED_FROM)) / (24 * 3600 * 1000));

	for (let i=0; i <= daysBack - windowSize; i+=stepSize) {
		const date = new Date(Date.now() - 3600 * 24 * 1000 * (daysBack - i));

		let config = {
			days: windowSize,
			date: {
				dayOfWeek: daysOfTheWeek[date.getDay()],
				date: stringifyDateNumber(date.getDate()),
				monthName: namesOfTheMonths[date.getMonth()],
				month: stringifyDateNumber(date.getMonth() + 1),
				year: String(date.getFullYear())
			}
		};
		config.date.apiFormat = `${config.date.year}-${config.date.month}-${config.date.date}`;
		config.daysAgo = config.date.apiFormat;

		configs.push(config);

		// Stop if there is an endpoint set.
		if (date.getTime() > dateTo) {
			break;
		}
	}

	if (!configs.length) throw Error('No Dates Selected');

	setInterval(function() {
		if (!topicQueue.length) return;
		let item = topicQueue.shift();
		item[0].classList[item[1]]('visible');
	}, 100);
};

module.exports.populateCache = populateCache;
module.exports.printCache = printCache;

module.exports.generator = function *dataGenerator({fetchMissingData = true, saveCacheWhenDone = false} = {}) {

	for (let config of configs) {

		if (renderInformationUI) {
			document.querySelector(".date-target .dow").innerHTML = config.date.dayOfWeek;
			document.querySelector(".date-target .dom").innerHTML = config.date.date;
			document.querySelector(".date-target .month").innerHTML = config.date.monthName;
			document.querySelector(".date-target .year").innerHTML = config.date.year;
		}

		// Refresh the page on a new day.
		if ((new Date()).getDate() !== currentDate) {
			location.reload();
			break;
		}

		yield updateData(config, fetchMissingData)
			.then(({topics, nodes}) => {
				if (renderInformationUI) {
					renderTopics(topics);
				}
				return nodes;
			});
	}

	if (saveCacheWhenDone) {
		printCache(saveCacheWhenDone);
	}
};
