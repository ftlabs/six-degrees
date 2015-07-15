/* global fetch, atob */
/*jshint esnext:true */

'use strict';

// fetch list of people.
// pick one
// fetch their coocurring people
// then fetch theirs
const pako = require('pako');
const ui = require('./ui');

const weeksBack = 5;

const unifiedData = {};
const populus = [];

const MAX_NUMBER_OF_NODES = 10;

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

		//unpack island
		if (typeof this.island.connections.unpacked === 'undefined') {
			this.island.connections.unpacked = JSON.parse(pako.inflate(atob(this.island.connections.json_zlib_base64), {to: 'string'}));
		}
	}

	getConnections(maxDepth=1, depth=1) {

		// Update own set of connections.
		if (!this.connections) {
			this.connectionWeights = new Map();
			this.normalizedConnectionWeights = new Map();

			// create people for each connection.
			this.connections = new Set(
				this.island.connections.unpacked[this.islandIndex]
					.map((numberOfConnections, i) => {
						if (numberOfConnections === 0) {
							return false;
						}
						const connectedPerson = getOrCreatePerson(this.island.islanders[i]);
						this.connectionWeights.set(connectedPerson, numberOfConnections);
						this.normalizedConnectionWeights.set(connectedPerson, numberOfConnections/this.island.maxConnections);
						return connectedPerson;
					})
					.filter(p => p !== false)
			);
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
	const modal = ui.modal('.o-techdocs-main', `Loading:<br />${urls.join('<br />')}`);
	return Promise.all(urls.map(url => fetch(url)
		.then(response => response.text())
		.then(string => JSON.parse(string))
	)).then(results => {
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
			daysAgo && days ?
			fetchJSON('https://ftlabs-sapi-capi-slurp-slice.herokuapp.com' + `/erdos_islands_of/people/with_connectivity?slice=-${daysAgo},${days}`) :
			fetchJSON('https://ftlabs-sapi-capi-slurp.herokuapp.com/erdos_islands_of/people/with_connectivity')
		 )
		.then(function([islandsJSON]) {

			let peopleList = [];
			islandsJSON.islands.forEach(function (island) {
				peopleList.push(...island.islanders.map(islanders => islanders[0]));
			});

			return [
				peopleList,
				islandsJSON
			];
		})
		.then(function ([people, islandsJSON]) {

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
					unifiedData[id].connections = undefined;

					// update the source data to have objects
					// rather than arrays.
					return unifiedData[id];
				});
			});

			return islandsJSON.islands[0].islanders.slice(0, MAX_NUMBER_OF_NODES);
		})
		.then(getConnectionsForPeople)
		.catch(function (e) {
			ui.modal('.o-techdocs-main', `Error: ${e.message}`);
			throw e;
		});
}

module.exports.iterator = (function *dataGenerator() {
	const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
	const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	for (let i=0; i<weeksBack; i++) {

		let date = new Date(Date.now() - 3600 * 24 * 7 * 1000 * (weeksBack - i));

		document.querySelector(".date-target .dow").innerHTML = days[date.getDay()];
		document.querySelector(".date-target .dom").innerHTML = date.getDate();
		document.querySelector(".date-target .month").innerHTML = months[date.getMonth()];
		document.querySelector(".date-target .year").innerHTML = date.getFullYear();

		yield updateData({
			daysAgo: (weeksBack - i) * 7,
			days: 7
		});
	}
})();
