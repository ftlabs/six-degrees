/* global d3 */
/**
 * Based on http://bl.ocks.org/MoritzStefaner/1377729
 */

'use strict';
const energy = 0.01;

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
		},
		"zoom (log scale)": {
			value: 0,
			range: [-3, 3, 0.1]
		},
		"Don't let rest": {
			value: 1,
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
	people,
	nodes,
	links
}, {
	width = 960,
	height = 500,
	place = 'body'
} = {}) {

	width *= 10;
	height *= 10;

	nodes[0].x = width / 2;
	nodes[0].y = height / 2;
	nodes[0].fixed = true;
	nodes[0].alwaysDrawName = true;

	const svg = d3
		.select(place)
		.append('svg:svg')
		.attr('class', 'd3-svg')
		.attr('width', width)
		.attr('height', height);

	const force = d3.layout
		.force()
		.size([width, height])
		.nodes(nodes)
		.links(links)
		.chargeDistance(500);


	// Start with some initial inwards motion
	force.gravity(1);

	// Restore gravity
	setTimeout(function () {
		force
			.gravity(settings.gravity.strength.value)
			.start().alpha(energy);
	}, 1500);

	// These will get populated later
	const labelLinks = [];
	const labelNodes = [];

	const force2 = d3.layout
		.force()
		.nodes(labelNodes)
		.links(labelLinks)
		.gravity(0)
		.linkDistance(0.5)
		.linkStrength(8)
		.chargeDistance(500)
		.charge(d => d.hasLabel ? -2000 : -10)
		.friction(0.4)
		.size([width, height]);

	let node = svg.selectAll('g.node');
	let link = svg.selectAll('g.link');
	let nodeGraphic;
	let labelLink = svg.selectAll('g.anchorLink');
	let labelNode = svg.selectAll('g.anchorNode');

	node.call(force.drag);

	function setZoom(zoom = 1) {
		svg.style('transform', `translate(-50%, -50%) scale(${zoom})`);
	}

	function updateDisplay() {
		setZoom(Math.pow(10, settings.display["zoom (log scale)"].value));
		link.style('display', l => (l.source.drawLink && l.target.drawLink) || settings.display.showAllLinks.value ? 'inline' : 'none');
		nodeGraphic.style('stroke', n => n.highlight ? '#F64' : '#FFF')
			.style('stroke-width',n => n.highlight ? 5 : 3);
		renderVisibleNames();
	}

	function renderData() {

		nodes.forEach(n => {
			if (!n.labelConfig) {
				const source = {node: n};
				const target = {node: n, hasLabel: true, label: n.label};

				n.labelConfig = {
					source,
					target,
					link: {
						weight: 1,
						node: n
					}
				};
			}
		});

		link = link.data(force.links());
		link.enter()
			.append('svg:line')
			.attr('class', 'link')
			.style('stroke', '#000')
			.style('stroke-width', l => (l.weight * 5) * 0.8 + 0.2)
			.style('display', 'none')
			.style('zIndex', -1);
		link.exit().remove();

		node = node.data(force.nodes());
		nodeGraphic = node
			.enter()
			.append('svg:g')
			.attr('class', 'node')
			.append('svg:circle')
			.attr('r', x => Math.sqrt(x.numberOfOccurences)*2 + 2)
			.style('fill', (n, i) => i === 0 ? '#F64' : '#555')
			.style('stroke', n => n.highlight ? '#F64' : '#FFF')
			.style('stroke-width',n => n.highlight ? 5 : 3)
			.style('zIndex', -1)
			.on('mouseenter', function (n) {
				n.drawName = true;
				n.drawLink = true;
				n.getConnections().forEach(p => p. drawName = true);
				n.getConnections().forEach(p => p. drawLink = true);
				updateDisplay();
			})
			.on('mouseleave', function (n) {
				n.drawName = false;
				n.drawLink = false;
				n.getConnections().forEach(p => p. drawName = false);
				n.getConnections().forEach(p => p. drawLink = false);
				updateDisplay();
			});

		node.exit().remove();

		buildUi();
		renderVisibleNames();
		force.start().alpha(energy);
	}
	renderData();

	function renderVisibleNames() {

		// Empty
		labelLinks.splice(0);
		labelNodes.splice(0);

		// Add new
		nodes
			.filter(n => n.drawName || n.alwaysDrawName || settings.display.showAllNames.value)
			.forEach(n => {
				if (labelNodes.indexOf(n.labelConfig.source) === -1) {
					n.labelConfig.link.source = labelNodes.push(n.labelConfig.source)-1;
					n.labelConfig.link.target = labelNodes.push(n.labelConfig.target)-1;
					labelLinks.push(n.labelConfig.link);
				}
			});

		labelLink = labelLink.data(force2.links());
		labelLink
			.enter()
			.append('svg:line')
			.style('stroke', '#00C')
			.style('opacity', 0.2);

		labelLink.exit().remove();

		labelNode = labelNode.data(force2.nodes());
		const labelNodeGraphic = labelNode
			.enter()
			.append('svg:g');

		// Needed circle
		labelNodeGraphic
			.append('svg:circle')
			.attr('r', 10)
			.style('display', 'none');

		// Label
		labelNodeGraphic
			.append('svg:text')
			.text(d => d.hasLabel ? d.label : '')
			.attr('class', 'd3-label')
			.style('fill', '#555');

		labelNode.exit().remove();

		force2.start().alpha(energy);
	}

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
			return 'translate(' + (d.x || 0) + ',' + (d.y || 0) + ')';
		});
	};


	force.on('tick', function() {

		if (settings.display["Don't let rest"].value) {

			// keep the simulation always running.
			force.alpha(energy);
		}

		node.call(updateNode);
		link.call(updateLink);
	});

	force2.on('tick', function() {
		force2.alpha(energy);

		labelNode.each(function(d, i) {
			if(i % 2 === 0) {

				// Attach one end of the Label Link to the node
				// let the other bounce free avoiding so they can avoid each other
				d.x = d.node.x;
				d.y = d.node.y;
				d.fixed = true;
			}
		});

		labelLink.call(updateLink);
		labelNode.call(updateNode);
	});

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
			).start().alpha(energy);
	}

	applySettings();

	function buildUi() {
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

		document.querySelector('.sappy-settings_people-list-target').innerHTML = `
			<form>
				<label for='people'>Select a starting person
				<input list='people' name='people' id='people-list'>
				<datalist id='people'>
					${Object.keys(window.unifiedData).map(p => '<option value="' + window.unifiedData[p].name + '">').join('')}
				</datalist></label>
				<input type='submit' value='Submit'>
			</form>` +
			nodes
				.map(p => `<div data-id="${p.id}" class="sappy-settings_person-selector">${p.name}</div>`)
				.join('\n');

		function fetchDataForANewPersonById(id) {
			if (!id) return Promise.reject('no id');
			return window.getConnectionsForAPerson(id)
				.then(data => {

					// Reset the rootnode
					nodes[0].x = undefined;
					nodes[0].y = undefined;
					nodes[0].fixed = undefined;
					nodes[0].alwaysDrawName = false;

					links.splice(0);
					nodes.splice(0);

					// Rerender with new data
					renderData();

					links.push(...data.links);
					nodes.push(...data.nodes);

					console.log(links);

					nodes[0].x = width / 2;
					nodes[0].y = height / 2;
					nodes[0].fixed = true;
					nodes[0].alwaysDrawName = true;

					// // Rerender with new data
					renderData();
				});
		}

		document.querySelector('.sappy-settings_people-list-target form').addEventListener('click', function (e) {
			e.preventDefault();
			fetchDataForANewPersonById(`people:${e.currentTarget.elements[0].value}`);
		});

		[...document.querySelectorAll('.sappy-settings_person-selector')]
			.forEach(function (el) {
				el.addEventListener('click', e => {
					fetchDataForANewPersonById(e.currentTarget.dataset.id);
				});
				el.addEventListener('mouseenter', e => {

					// Find the matching node and behave like it does on mouseover
					let n = nodes.filter(p => e.currentTarget.dataset.id === p.id)[0];

					// if the node has been removed then this will be undefined
					if (!n) return;

					n.drawName = true;
					n.drawLink = true;
					n.highlight = true;
					n.getConnections().forEach(p => p. drawName = true);
					n.getConnections().forEach(p => p. drawLink = true);
					updateDisplay();
				});
				el.addEventListener('mouseleave', e => {

					// Find the matching node and behave like it does on mouseout
					let n = nodes.filter(p => e.currentTarget.dataset.id === p.id)[0];

					// if the node has been removed then this will be undefined
					if (!n) return;
					n.drawName = false;
					n.drawLink = false;
					n.highlight = false;
					n.getConnections().forEach(p => p. drawName = false);
					n.getConnections().forEach(p => p. drawLink = false);
					updateDisplay();
				});
			});
	}
};
