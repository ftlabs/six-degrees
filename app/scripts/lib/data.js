/* global fetch, atob */

'use strict';

// fetch list of people.
// pick one
// fetch their coocurring people
// then fetch theirs
const pako = require('pako');
const ui = require('./ui');

const populus = [];

class Person {
	constructor(personData) {
		this.name = personData.name,
		this.label = personData.name,
		this.numberOfOccurences = personData.numberOfOccurences,
		this.id = personData.id,
		this.isAmbassador = personData.isAmbassador,
		this.island = personData.island;
		this.islandIndex = personData.islandIndex;

		//unpack island
		if (typeof this.island.connections.unpacked === 'undefined') {
			this.island.connections.unpacked = JSON.parse(pako.inflate(atob(this.island.connections.json_zlib_base64), {to: 'string'}));
		}
	}

	getConnections(maxDepth=1, depth=1) {

		const collectedPeople = new Set();

		this.connectionWeights = new Map();

		// create people for each connection.
		this.connections = new Set(
			this.island.connections.unpacked[this.islandIndex]
				.map((numberOfConnections, i) => {
					if (numberOfConnections === 0) return false;

					const connectedPerson = getOrCreatePerson(this.island.islanders[i]);
					this.connectionWeights.set(connectedPerson, numberOfConnections);
					return connectedPerson;
				})
				.filter(p => p !== false)
		);

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

function fetchJSON(url) {
	return fetch(url)
		.then(response => response.text())
		.then(string => JSON.parse(string));
}

module.exports = Promise.all([
		fetchJSON('https://ftlabs-sapi-capi-slurp.herokuapp.com/metadatums/by_type/people'),
		fetchJSON('http://ftlabs-sapi-capi-slurp.herokuapp.com/erdos_islands_of/people/with_connectivity'),
	])
	.then(([peopleJson, islandsJSON]) => [peopleJson.metadatums_by_type.people, islandsJSON])
	.then(function ([people, islandsJSON]) {

		const unifiedData = {};

		people.map(function (p) {
			unifiedData[p] = {
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

				// update the source data to have objects
				// rather than arrays.
				return unifiedData[id];
			});
		});

		return unifiedData;
	})
	.then(function (people) {

		return [people, ui.modal('.o-techdocs-main', `
			<form>
				<label for="people">Select a starting person
				<input list="people" name="people">
				<datalist id="people">
					${Object.keys(people).map(p => '<option value="' + people[p].name + '">').join('')}
				</datalist></label>
				<submit>
			</form>`)];
	})
	.then(function ([people, modal]) {
		modal.remove();
		return people[`people:Yoko Ono`];
		return new Promise(function (resolve) {
			modal.el.querySelector('form').addEventListener('submit', function (e) {
				e.preventDefault();
				if (e.target.elements[0].value) {
					modal.remove();
					resolve(people[`people:${e.target.elements[0].value}`]);
				}
			});
		});
	})
	.then(personData => getOrCreatePerson(personData).getConnections(2))
	.then(connectedPeeps => Array.from(connectedPeeps))
	.then(connectedPeeps => {

		const labelAnchors = [];
		const labelAnchorLinks = [];
		const links = [];

		if (connectedPeeps.length === 1) {
			throw Error(`Not enough people connected`);
		}

		const nPeople = connectedPeeps.length;

		// Create nodes
		for(let i = 0; i < nPeople; i++) {
			labelAnchors.push({
				node: connectedPeeps[i]
			});
			labelAnchors.push({
				node: connectedPeeps[i]
			});
		}

		// Link up nodes
		for(var i = 0; i < nPeople; i++) {
			for(var j = 0; j < i; j++) {
				if(connectedPeeps[j].isConnectedTo(connectedPeeps[i])) {
					links.push({
						source : i,
						target : j,
						weight : connectedPeeps[j].connectionWeights.get(connectedPeeps[i])/connectedPeeps[j].island.maxConnections
					});
				}
			}
			labelAnchorLinks.push({
				source: i * 2,
				target: i * 2 + 1,
				weight: 1
			});
		}

		return {
			nodes: connectedPeeps,
			labelAnchors,
			labelAnchorLinks,
			links
		};

	})
	.catch(function (e) {
		ui.modal('.o-techdocs-main', `Error: ${e.message}`);
		throw e;
	});
