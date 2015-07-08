'use strict';

var dom = {
	datalist: document.querySelector('#data-people'),
	form: document.querySelector('#erdos-form'),
	txtstartperson: document.querySelector('#txtstartperson'),
	txtendperson: document.querySelector('#txtendperson'),
	errormsg: document.querySelector('#errormsg'),
	result: document.querySelector('#result')
}

fetch('http://ftlabs-sapi-capi-slurp.herokuapp.com/metadatums/by_type/people')
	.then(response => response.text())
	.then(string => JSON.parse(string))
	.then(json => json.metadatums_by_type.people)
	.then(function (people) {

		// ['people:Joe Bloggs', 'people:Adam Smith', 'people:Milton Friedman', ...]

		dom.datalist.innerHTML = people.map(p => '<option value="'+detagify(p)+'">').join('');
		dom.form.addEventListener('submit', function (e) {
			e.preventDefault();
			let from = tagify(dom.txtstartperson.value);
			let to = tagify(dom.txtendperson.value);
			if (from && to) renderErdos(from, to);
		});
	})
;

function renderErdos(from, to) {
	fetch(`http://ftlabs-sapi-capi-slurp.herokuapp.com/erdos_between/${from}/${to}`)
		.then(response => response.text())
		.then(string => JSON.parse(string))
		.then(function(data) {
			if (!('chain' in data)) throw new Error ("No chain");
			dom.errormsg.classList.remove('visible');
			dom.result.innerHTML = `<li class='person'>${detagify(from)}</li>`
			 	+ data.fleshed_out_chain.map(rel => {
					return `<ul class='articles'>`
						+ rel.articles.map(article => `<li><a href='${article.location.uri}'>${article.title}</a><p>${article.excerpt}</p></li>`).join('')
						+ `</ul>`
						+ `<li class='person'>${detagify(rel.to)}</li>`
					;
				}).join('')
			;
		})
		.catch(function(e) {
			dom.errormsg.innerHTML = `There is no chain between ${detagify(from)} and ${detagify(to)}.`;
			dom.errormsg.classList.add('visible');
		})
	;
}

function tagify(tag) {
	return 'people:'+encodeURIComponent(tag);
}
function detagify(tag) {
	return decodeURIComponent(tag).replace(/^people\:/, '');
}
