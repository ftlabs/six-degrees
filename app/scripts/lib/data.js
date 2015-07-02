/* global fetch */

'use strict';

// fetch list of people.
// pick one
// fetch their coocurring people
// then fetch theirs

const ui = require('./ui');
let selectedPerson;

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
		${people.map(p => `<option value="${p.slice(7)}">`).join('')}
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
	.then(person => fetch(`http://ftlabs-sapi-capi-slurp.herokuapp.com/cooccurrences_as_counts/${person}/by_type/people`))
	.then(response => response.text())
	.then(string => JSON.parse(string))
	.then(json => json.cooccurrences_as_counts.people)
	.then(function(list) {
		var maxCount = list[0][1];
		return list.map(function(item) {
			return {
				name: item[0],
				count: item[1],
				weight: item[1]/maxCount
			};
		});
	})
	.then(function (peopleList) {

		const nodes = [];
		const labelAnchors = [];
		const labelAnchorLinks = [];
		const links = [];

		if (peopleList.length === 0) {
			throw Error('Not enough people connected to selected person.');
		}

		// Add the orignal person as having 1 conection to themselves
		peopleList.unshift({
			name: selectedPerson,
			count: 1,
			weight: 1/peopleList[0].count
		});

		const nPeople = peopleList.length;

		function createNode(label) {
			const labelAnchorNode = {label};
			nodes.push(labelAnchorNode);
			labelAnchors.push({
				node: labelAnchorNode
			});
			labelAnchors.push({
				node: labelAnchorNode
			});
		}

		// Create nodes
		for(let i = 0; i < nPeople; i++) {
			createNode(peopleList[i].name);
		}

		// Link up nodes
		for(let i = 0; i < nodes.length; i++) {
			links.push({
				source: 0,
				target: i,
				weight: peopleList[i].weight
			});
			labelAnchorLinks.push({
				source: i * 2,
				target: i * 2 + 1,
				weight: 1
			});
		}

		return {
			nodes,
			labelAnchors,
			labelAnchorLinks,
			links
		};

	})
	.catch(function (e) {
		ui.modal('.o-techdocs-main', `Error: ${e.message}`);
		throw e;
	});
