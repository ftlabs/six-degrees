/* global fetch */

'use strict';

// fetch list of people.
// pick one
// fetch their coocurring people
// then fetch theirs

const ui = require('./ui');
const MAX_POPULATION = 100;
let selectedPerson;
let populus = [];

class Person {
	constructor({
		name
	}) {
		if (typeof weight === undefined) {
			throw Error('Can\'t construct person without weight');
		}
		if (typeof weight === undefined) {
			throw Error('Can\'t construct person without weight');
		}
		this.name = name.slice(7);
		this.label = name.slice(7);
		this.id = name;
		this.connections = new Set();
	}

	connect(targetPerson) {
		this.connections.add(targetPerson);

		// Add self to raget if not already added
		if (targetPerson.connectedTo(this)) {
			targetPerson.connect(this);
		}
	}

	connectedTo(person) {
		return this.connections.has(person);
	}
}

function getOrCreatePerson(options) {
	for (let p of populus) {
		if (p.id === options.name) {
			return p;
		}
	}
	let np = new Person(options);
	populus.push(np);
	return np;
}

function fetchPerson(person) {
	return fetch(`http://ftlabs-sapi-capi-slurp.herokuapp.com/cooccurrences_as_counts/${person.id}/by_type/people`)
		.then(response => response.text())
		.then(string => JSON.parse(string))
		.then(json => json.cooccurrences_as_counts.people)
		.then(function(list) {
			var maxCount = list[0][1];

			return list.map(function(item) {
				return new Person({
					name: `people:${item[0]}`,
					count: item[1],
					weight: item[1] / maxCount
				});
			});
		})
		.then(function (list) {

			// add new people to the people list and sort out
			for (let p of list) getOrCreatePerson(p);
			return populus;
		});
}

module.exports = fetch('http://ftlabs-sapi-capi-slurp.herokuapp.com/metadatums/by_type/people')
	.then(response => response.text())
	.then(string => JSON.parse(string))
	.then(json => json.metadatums_by_type.people)
	.then(function (people) {

		return ui.modal('.o-techdocs-main', `
			<form>
				<label for="people">Select a starting person
				<input list="people" name="people">
				<datalist id="people">
					${people.map(p => '<option value="' + p.slice(7) + '">').join('')}
				</datalist></label>
				<submit>
			</form>`);
	})
	.then(function (modal) {
		return new Promise(function (resolve) {
			modal.el.querySelector('form').addEventListener('submit', function (e) {
				e.preventDefault();
				if (e.target.elements[0].value) {
					modal.remove();
					selectedPerson = `people:${e.target.elements[0].value}`;
					resolve(selectedPerson);
				}
			});
		});
	})
	.then(name => getOrCreatePerson({name}))
	.then(fetchPerson)
	.then(function (peopleArray) {

		console.log(peopleArray);

		const labelAnchors = [];
		const labelAnchorLinks = [];
		const links = [];

		if (peopleArray.length === 1) {
			throw Error(`Not enough people connected to ${selectedPerson}.`);
		}

		const nPeople = peopleArray.length;

		// Create nodes
		for(let i = 0; i < nPeople; i++) {
			labelAnchors.push({
				node: peopleArray[i]
			});
			labelAnchors.push({
				node: peopleArray[i]
			});
		}

		// Link up nodes
		for(let i = 0; i < peopleArray.length; i++) {
			links.push({
				source: 0,
				target: i,
				weight: 0.01
			});
			labelAnchorLinks.push({
				source: i * 2,
				target: i * 2 + 1,
				weight: 1
			});
		}

		return {
			nodes: peopleArray,
			labelAnchors,
			labelAnchorLinks,
			links
		};

	})
	.catch(function (e) {
		ui.modal('.o-techdocs-main', `Error: ${e.message}`);
		throw e;
	});
