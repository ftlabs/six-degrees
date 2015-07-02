'use strict';
/* global document */

module.exports = {
	modal(parentSelector, content) {
		const parent = document.querySelector(parentSelector);
		const modalEl = document.createElement('div');
		modalEl.classList.add('modal');
		parent.appendChild(modalEl);
		modalEl.innerHTML = content;
		return {
			el: modalEl,
			remove: () => parent.removeChild(modalEl)
		};
	}
};
