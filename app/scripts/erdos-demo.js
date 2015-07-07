'use strict';

var dom = {
	datalist: document.querySelector('#data-people'),
	form: document.querySelector('#erdos-form'),
}

fetch('http://ftlabs-sapi-capi-slurp.herokuapp.com/metadatums/by_type/people')
	.then(response => response.text())
	.then(string => JSON.parse(string))
	.then(json => json.metadatums_by_type.people)
	.then(function (people) {
		.innerHTML = people.map(p => '<option value="' + p.slice(7) + '">').join('');
		return new Promise(function (resolve) {
			dom.form.addEventListener('submit', function (e) {
				e.preventDefault();
				if (e.target.elements[0].value) {
					selectedPerson = `people:${e.target.elements[0].value}`;
					// TODO
				}
			});
		});
	})
;
