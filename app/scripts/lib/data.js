/* global fetch, atob */
/*jshint esnext:true */

'use strict';

// fetch list of people.
// pick one
// fetch their coocurring people
// then fetch theirs
const pako = require('pako');
const ui = require('./ui');

const unifiedData = {};
const populus = [];

const MAX_NUMBER_OF_NODES = 10;

const TIME_DATA_COLLECTED_FROM = 1413649806047;
const DAYS_TO_GO_BACK = Math.floor((Date.now() - TIME_DATA_COLLECTED_FROM)/(24*3600*1000));
const currentDate = (new Date()).getDate();

const TOPIC_MIN_RELEVANCE = 0.6;
const TOPIC_MAX_COUNT = 5;

let personSearch = location.search.match(/\?people=([a-zA-Z+]+)/);

if (personSearch && personSearch[1]) {
	personSearch = personSearch[1].replace(/\+/g, ' ');
}

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
			this.island.connections.unpacked = JSON.parse(pako.inflate(atob(this.island.connections.json_zlib_base64), {to: 'string'}));
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

function fetchJSON(...urls) {

	const modal = ui.modal('.o-techdocs-main', `Loading:<br /> ${urls.join('<br />')}`);
	console.log('Loading: ', urls.join(',\n'));
	return Promise.all(urls.map(url => {
		return fetch(url)
			.then(response => response.text())
			.then(string => JSON.parse(string));
	})).then(results => {

		modal.remove();
		return results;
	});
}

function getConnectionsForPeople(peopleArray) {

	// Each person should populate their connections
	peopleArray = peopleArray.map(person => getOrCreatePerson(person));
	peopleArray.forEach(person => person.getConnections(1));
	return {nodes: peopleArray};
}

function updateData({daysAgo, days}) {
	return (
			fetchJSON(
				'https://ftlabs-sapi-capi-slurp-slice.herokuapp.com' + `/erdos_islands_of/people/with_connectivity/just_top_10?slice=${daysAgo},${days}`,
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
		.then(([people, topics]) => ({nodes: getConnectionsForPeople(people), topics}))
		.catch(function (e) {
			ui.modal('.o-techdocs-main', `Error: ${e.message}`);
			throw e;
		});
}

const daysBack = DAYS_TO_GO_BACK;
const stepSize = 1;
const windowSize = 7;

const configs = [];
const dataCache = new Map();

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function stringifyDateNumber(n) {
	const nString = String(n);
	if (nString.length === 1) return "0" + nString;
	return nString;
}

for (let i=0; i < daysBack - windowSize; i+=stepSize) {
	const date = new Date(Date.now() - 3600 * 24 * 1000 * (daysBack - i));

	let config = {
		days: windowSize,
		date: {
			dayOfWeek: days[date.getDay()],
			date: stringifyDateNumber(date.getDate()),
			monthName: months[date.getMonth()],
			month: stringifyDateNumber(date.getMonth() + 1),
			year: String(date.getFullYear())
		}
	};

	config.date.apiFormat = `${config.date.year}-${config.date.month}-${config.date.date}`;
	config.daysAgo = config.date.apiFormat;

	configs.push(config);
}

const topicQueue = [];
setInterval(function() {
	if (!topicQueue.length) return;
	let item = topicQueue.shift();
	item[0].classList[item[1]]('visible');
}, 100);
function renderTopics(topicList) {
	let listEl = document.querySelector('.topics_topic-list');
	topicList.forEach(topic => {
		let el = document.getElementById('topic-'+topic);
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

module.exports.generator = function *dataGenerator() {

	for (let config of configs) {

		document.querySelector(".date-target .dow").innerHTML = config.date.dayOfWeek;
		document.querySelector(".date-target .dom").innerHTML = config.date.date;
		document.querySelector(".date-target .month").innerHTML = config.date.monthName;
		document.querySelector(".date-target .year").innerHTML = config.date.year;

		// Refresh the page on a new day.
		if ((new Date()).getDate() !== currentDate) {
			location.reload();
			break;
		}

		if (dataCache.has(config)) {
			renderTopics(dataCache.get(config).topics);
			yield Promise.resolve(dataCache.get(config).nodes);
		} else {
			yield updateData(config)
			.then(({topics, nodes}) => {
				dataCache.set(config, {topics, nodes});
				renderTopics(topics);
				return nodes;
			});
		}
	}
};
