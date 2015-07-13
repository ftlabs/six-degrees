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
window.unifiedData = unifiedData;
const populus = [];

const MAX_NUMBER_OF_NODES = 50;

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

function getConnectionsForAPerson(id) {
	return Promise.resolve(unifiedData[id])
		.then(personData => getOrCreatePerson(personData))
		.then(rootPerson => rootPerson.getConnections(4))
		.then(people => {

			let root = people.values().next().value;

			// Limit the number of people to the
			// top by most occurences
			// remove the root person since they need to be first
			const selected = Array.from(people)
				.sort((p1, p2) => p2.numberOfOccurences - p1.numberOfOccurences)
				.filter(p => p !== root)
				.slice(0, MAX_NUMBER_OF_NODES - 1);

			// re-add the root person
			selected.unshift(root);

			return selected;
		})
		.then(nodes => ({nodes}));
}

window.getConnectionsForAPerson = getConnectionsForAPerson;

module.exports = fetchJSON(
		'https://ftlabs-sapi-capi-slurp.herokuapp.com/metadatums/by_type/people',
		'https://ftlabs-sapi-capi-slurp.herokuapp.com/erdos_islands_of/people/with_connectivity'
	)
	.then(([peopleJson, islandsJSON]) => [
		peopleJson.metadatums_by_type.people.filter(p => islandsJSON.isolateds.indexOf(p) === -1),
		islandsJSON
	])
	.then(function ([people, islandsJSON]) {

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

		if (personSearch) {
			return 'people:' + personSearch;
		}

		const modal = ui.modal('.o-techdocs-main', `
			<form>
				<label for='people'>Select a starting person
				<input list='people' name='people' id='people-list'>
				<datalist id='people'>
					${Object.keys(people).map(p => '<option value="' + people[p].name + '">').join('')}
				</datalist></label>
				<input type='submit' value='Submit'>
			</form>`);

		return new Promise(function (resolve) {
			modal.el.querySelector('form').addEventListener('submit', function selectFromModal(e) {
				e.preventDefault();
				if (e.currentTarget.elements[0].value) {
					modal.remove();
					resolve(`people:${e.target.elements[0].value}`);
				}
			});
		});
	})
	.then(getConnectionsForAPerson)
	.catch(function (e) {
		ui.modal('.o-techdocs-main', `Error: ${e.message}`);
		throw e;
	});
