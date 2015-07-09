/* global d3 */
/**
 * Based on http://bl.ocks.org/MoritzStefaner/1377729
 */

'use strict';

const settings = {
	display: {
		description: 'Display Settings',
		showAllNames: {
			value: 0,
			range: [0, 1]
		},
		showAllLinks: {
			value: 0,
			range: [0, 1]
		}
	},
	charge: {
		description: 'Repulsive force between each node',
		proportionalToNumberOfNodes: {
			value: 0,
			range: [0, 1]
		},
		coefficient: {
			value: 1000,
			range: [50, 10000, 50]
		}
	},
	linkDistance: {
		description: 'Optimal distance between connected nodes',
		proportionalToNumberOfNodes: {
			value: 0,
			range: [0, 1]
		},
		coefficient: {
			value: 20,
			range: [0, 400, 5]
		},
		affectedByCoocurence: {
			value: 0,
			range: [0, 1]
		}
	},
	linkStrength: {
		description: 'Force applied to maintain that distance',
		coefficient: {
			value: 10,
			range: [10, 300, 10]
		},
		affectedByCoocurence: {
			value: 0,
			range: [0, 1]
		},
	},
	gravity: {
		description: 'Force drawing all nodes to the center',
		strength: {
			value: 0.5,
			range: [0, 10, 0.5]
		}
	},
};

module.exports = function ({
	nodes,
	links
}, {
	width = 960,
	height = 500,
	place = 'body'
} = {}) {

	nodes[0].x = width / 2;
	nodes[0].y = height / 2;

	const vis = d3
		.select(place)
		.append('svg:svg')
		.attr('width', width)
		.attr('height', height);

	const force = d3.layout
		.force()
		.size([width, height])
		.nodes(nodes)
		.links(links);

	// Start with some initial inwards motion
	force.gravity(1);

	// Reduce it
	setTimeout(function () {
		force
			.gravity(0.5)
			.start();
	}, 500);

	// Remove gravity
	setTimeout(function () {
		force
			.gravity(settings.gravity.strength.value)
			.start();
	}, 1500);

	const link = vis
		.selectAll('line.link')
		.data(links)
		.enter()
		.append('svg:line')
		.attr('class', 'link')
		.style('stroke', '#000')
		.style('opacity', l => (l.weight * 5) * 0.8 + 0.2)
		.style('display', 'none')
		.style('zIndex', -1);

	const node = vis.selectAll('g.node')
		.data(force.nodes())
		.enter()
		.append('svg:g')
		.attr('class', 'node')
		.on('mouseover', function (n) {
			n.drawName = true;
			n.drawLink = true;
			n.getConnections().forEach(p => p. drawName = true);
			n.getConnections().forEach(p => p. drawLink = true);
			updateDisplay();
		})
		.on('mouseout', function (n) {
			if (!settings.display.showAllNames.value) {
				n.drawName = false;
				n.getConnections().forEach(p => p. drawName = false);
			}
			if (!settings.display.showAllLinks.value) {
				n.drawLink = false;
				n.getConnections().forEach(p => p. drawLink = false);
			}
			updateDisplay();
		});

	node.append('svg:circle')
		.attr('r', x => Math.sqrt(x.numberOfOccurences) + 2)
		.style('fill', x => x.isRoot ? '#F64' : '#555')
		.style('stroke', '#FFF')
		.style('stroke-width', 3)
		.style('zIndex', -1);

	node.call(force.drag);

	const nodeText = node
		.append('svg:text')
		.text(d => d.label)
		.style('fill', '#555')
		.style('display', 'none');

	const updateLink = function() {
		this.attr('x1', function(d) {
			return d.source.x;
		}).attr('y1', function(d) {
			return d.source.y;
		}).attr('x2', function(d) {
			return d.target.x;
		}).attr('y2', function(d) {
			return d.target.y;
		});
	};

	const updateNode = function() {
		this.attr('transform', function(d) {
			return 'translate(' + d.x + ',' + d.y + ')';
		});
	};

	force.on('tick', function() {
		node.call(updateNode);
		link.call(updateLink);
	});

	function updateDisplay() {
		link.style('display', l => (l.source.drawLink && l.target.drawLink) ? 'inline' : 'none');
		nodeText.style('display', nt => nt.drawName ? 'inline' : 'none');
	}

	function applySettings(displayOnly) {

		nodes.forEach(p => p.drawName = !!settings.display.showAllNames.value);
		nodes.forEach(p => p.drawLink = !!settings.display.showAllLinks.value);
		updateDisplay();

		if (displayOnly) return;

		force
			.gravity(settings.gravity.strength.value)
			.linkDistance(l => settings.linkDistance.coefficient.value *
				Math.pow(l.weight, -settings.linkDistance.affectedByCoocurence.value) *
				Math.pow(nodes.length, -1 * settings.linkDistance.proportionalToNumberOfNodes.value)
			)
			.charge(-1 *
				settings.charge.coefficient.value /
				Math.pow(nodes.length, settings.charge.proportionalToNumberOfNodes.value)
			)
			.linkStrength(l => settings.linkStrength.coefficient.value *
				Math.pow(l.weight, settings.linkStrength.affectedByCoocurence.value)
			)
			.start();
	}

	applySettings();

	(function buildUi() {
		document.querySelector('.sappy-settings .o-techdocs-card__context')
			.addEventListener('click', e => e.currentTarget.parentNode.classList.toggle('collapsed'));

		document.querySelector('.sappy-people .o-techdocs-card__context')
			.addEventListener('click', e => e.currentTarget.parentNode.classList.toggle('collapsed'));

		function camelToPretty(str) {return str.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(); }

		let slidersHTML = "";

		for (let i in settings) {
        	if (settings.hasOwnProperty(i)) {
				let actionName = i;
				let actionSettings = settings[i];

				slidersHTML += `<div class="o-techdocs-card__title sappy-settings_slider-title">${camelToPretty(actionName)}</div>`;
				slidersHTML += `<div class="o-techdocs-card__subtitle">${actionSettings.description}</div>`;

				for (let j in actionSettings) {
	        		if (j !== 'description' && actionSettings.hasOwnProperty(j)) {
						let tweakName = j;
						let tweakSettings = actionSettings[j];

						slidersHTML += `
							<label class="sappy-settings_slider" for="${actionName + '_' + tweakName}">
							${camelToPretty(tweakName)}${tweakName === 'proportionalToNumberOfNodes' ? ' (' + nodes.length + ')' : ''}`;

						if (tweakSettings.range.length === 2 && tweakSettings.range[0] === 0 && tweakSettings.range[1] === 1) {
							slidersHTML += `<input id="${actionName + '_' + tweakName}" name="${actionName + '_' + tweakName}" type="checkbox" data-actionname="${actionName}" data-tweakname="${tweakName}" value="${tweakSettings.value}" ${tweakSettings.value === 1 ? 'checked' : ''}/></label>`;
						} else {
							slidersHTML += `<br /><input id="${actionName + '_' + tweakName}" name="${actionName + '_' + tweakName}" type="range" data-actionname="${actionName}" data-tweakname="${tweakName}" value="${tweakSettings.value}" min="${tweakSettings.range[0]}" max="${tweakSettings.range[1]}" step="${tweakSettings.range[2] || 1}"/><span class="value">${tweakSettings.value}</span></label>`;
						}
					}
				}
			}
		}

		document.querySelector('.sappy-settings_settings-sliders').innerHTML = slidersHTML;

		[...document.querySelectorAll('.sappy-settings_settings-sliders input[type="range"]')]
			.forEach(function (el) {
				el.addEventListener('input', e => {
					const inputSlider = e.currentTarget;
					settings[inputSlider.dataset.actionname][inputSlider.dataset.tweakname].value = inputSlider.value;
					inputSlider.nextSibling.innerHTML = inputSlider.value;
					applySettings(inputSlider.dataset.actionname === 'display');
				}, false);
			});

		[...document.querySelectorAll('.sappy-settings_settings-sliders input[type="checkbox"]')]
			.forEach(function (el) {
				el.addEventListener('change', e => {
					const checkbox = e.currentTarget;
					settings[checkbox.dataset.actionname][checkbox.dataset.tweakname].value = checkbox.checked ? 1 : 0;
					applySettings(checkbox.dataset.actionname === 'display');
				}, false);
			});

		document.querySelector('.sappy-settings_people-list-target').innerHTML = nodes
			.map(p => `<div data-id="${p.id}" class="sappy-settings_person-selector">${p.name}</div>`)
			.join('\n');

		[...document.querySelectorAll('.sappy-settings_person-selector')]
			.forEach(function (el) {
				el.addEventListener('click', e => {
					const person = e.currentTarget.dataset.id;
					console.log(person);
				});
			});


	})();
};
