/* global fetch, console */

'use strict';

var dom = {
	datalist: document.querySelector('#data-people'),
	form: document.querySelector('#erdos-form'),
	txtstartperson: document.querySelector('#txtstartperson'),
	txtendperson: document.querySelector('#txtendperson'),
	errormsg: document.querySelector('#errormsg'),
	result: document.querySelector('#result'),
	peoplecount: document.querySelector('#people-count')
};

var slurpApp = 'https://ftlabs-sapi-capi-slurp-slice.herokuapp.com';

fetch(`${slurpApp}/metadatums/by_type/people`)
	.then(response => response.text())
	.then(string => JSON.parse(string))
	.then(json => json.metadatums_by_type.people)
	.then(function (people) {

		// ['people:Joe Bloggs', 'people:Adam Smith', 'people:Milton Friedman', ...]

		dom.datalist.innerHTML = people.map(p => '<option value="'+detagify(p)+'">').join('');
		dom.peoplecount.innerHTML = people.length;
		dom.form.addEventListener('submit', function (e) {
			e.preventDefault();
			let from = tagify(dom.txtstartperson.value);
			let to = tagify(dom.txtendperson.value);
			if (from && to) renderErdos(from, to);
		});

		var qs = location.search.slice(1).split('&').reduce(function (acc, el) {
			var [key, val] = el.split('=');
			acc[key] = val;
			return acc;
		}, {});
		if ('from' in qs && 'to' in qs) {
			dom.txtstartperson.value = detagify(qs.from);
			dom.txtendperson.value = detagify(qs.to);
			renderErdos(qs.from, qs.to);
		}
	})
;

function renderErdos(from, to) {
	fetch(`${slurpApp}/erdos_between/${from}/${to}`)
		.then(response => response.text())
		.then(string => JSON.parse(string))
		.then(function(data) {
			if (!('chain' in data)) throw new Error("No chain");
			dom.errormsg.classList.remove('visible');
			dom.result.innerHTML = `<li class='person'>${detagify(from)}</li>` +
				data.fleshed_out_chain.map(rel => {
					return `<ul class='articles'>` +
						rel.articles.map(article => {
							let img = ((article.es_data && article.es_data.primary_img) && `<img src='${article.es_data.primary_img.url}' alt='${article.es_data.primary_img.alt}'>`) || '';
							let priTheme = (article.metadata && article.metadata.filter(str => str.indexOf('primaryTheme') !== -1).map(str => str.replace(/^primaryTheme\:\w+\:/, '')).join(', ')) || "";
							let pattern = new RegExp('('+detagify(rel.from)+'|'+detagify(rel.to)+')', 'ig');
							let highlighted = article.excerpt.replace(pattern, '<strong>$1</strong>');
							if (priTheme) priTheme = `<div class="themes">${priTheme}</div>`;
							return `<li>${priTheme}${img}<a href='${article.location.uri}?ftcamp=engage/extensions/sixdegrees_erdoschain/web/sixdegrees/ftlabs'>${article.title}</a><p>${highlighted}</p></li>`;
						}).join('') +
						`</ul>` +
						`<li class='person'>${detagify(rel.to)}</li>`
					;
				}).join('')
			;
			history.replaceState({}, '', location.href.replace(/^(http[^\?]+)(\?.*)?$/, '$1?from='+from+'&to='+to));
		})
		.catch(function(e) {
			console.warn(e);
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
