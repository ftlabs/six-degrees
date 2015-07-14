/* global d3 */
/**
 * Based on http://bl.ocks.org/MoritzStefaner/1377729
 */

'use strict';
const energy = 0.1;

const settings = {
	display: {
		description: 'Display Settings',
		showAllNames: {
			value: 1,
			range: [0, 1]
		},
		showAllLinks: {
			value: 1,
			range: [0, 1]
		},
		"zoom (log scale)": {
			value: 0,
			range: [-3, 3, 0.1]
		},
		"Don't let rest": {
			value: 0,
			range: [0, 1]
		}
	},
	charge: {
		description: 'Repulsive force between each node',
		proportionalToNumberOfOccurences: {
			value: 1,
			range: [0, 1]
		},
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
		proportionalToNumberOfOccurences: {
			value: 1,
			range: [0, 1]
		},
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
			value: 5,
			range: [0, 50, 1]
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
	friction: {
		description: 'dampening force on the velocity',
		strength: {
			value: 0.5,
			range: [0, 1, 0.05]
		}
	},
};

module.exports = function ({
	nodes
}, {
	width = 960,
	height = 500,
	place = 'body'
} = {}) {


	/**
	 * Make the svg 10 times larger
	 */

	const screenWidth = width;
	const screenHeight = height;
	width *= 10;
	height *= 10;

	/**
	 * Variables
	 */

	const svg = d3
		.select(place)
		.append('svg:svg')
		.attr('class', 'd3-svg')
		.attr('width', width)
		.attr('height', height);

	const force = d3.layout
		.force()
		.size([width, height])
		.nodes([])
		.links([])
		.chargeDistance(500)
		.friction(0.5);

	const drag = force.drag();


	// Change the default energy value resume restores to.
	force.oldResume = force.resume;
	force.resume = function (...args) {return force.oldResume.apply(force, args).alpha(energy); };

	const force2 = d3.layout
		.force()
		.nodes([])
		.links([])
		.gravity(0)
		.linkDistance(0.5)
		.linkStrength(10)
		.chargeDistance(500)
		.charge(d => d.hasLabel ? -2000 : -100)
		.friction(0.3)
		.size([width, height]);

	let node = svg.selectAll('g.node');
	let link = svg.selectAll('g.link');
	let nodeGraphic;
	let labelLink = svg.selectAll('g.anchorLink');
	let labelNode = svg.selectAll('g.anchorNode');

	/**
	 * Functions
	 */

	function autoZoom() {
		let minX = 0;
		let minY = 0;
		let maxX = 0;
		let maxY = 0;

		force.nodes().forEach(n => {
			if (n.x < minX) minX = n.x;
			if (n.y < minY) minY = n.y;
			if (n.x > maxX) maxX = n.x;
			if (n.y > maxY) maxY = n.y;
		});

		// 0.1 seems to be arbritary scaling factor between
		// d3 positions and the screen space.
		setZoom(5 / Math.min((maxX - minX)/screenWidth, (maxY - minY)/screenHeight));
	}

	window.autoZoom = autoZoom;

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

	let newItemInterval;
	function updateData() {

		buildUi();

		const forceLinks = force.links();
		const forceNodes = force.nodes();

		// Empty
		forceLinks.splice(0);
		forceNodes.splice(0);

		// create nodes for each of the labels
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

		// make the root node special
		nodes[0].x = width / 2;
		nodes[0].y = height / 2;
		// nodes[0].fixed = true;
		nodes[0].alwaysDrawName = true;

		// Render the empty set of nodes.
		renderPoints();

		let nodeBuffer = new Set();

		let i = (function *nextNodeToRender() {

			let firstNode = nodes[0];
			yield firstNode;
			while(nodeBuffer.size) {
				let n = nodeBuffer.values().next().value;
				nodeBuffer.delete(n);
				yield n;
			}
		})();

		// Stop any current display from having
		// nodes appended to it.
		clearInterval(newItemInterval);
		newItemInterval = setInterval(function () {

			// Add the nodes
			const {value, done} = i.next();
			if (done) {

				// Give the graph a jiggle after the last node added
				setTimeout(() => force.start().alpha(0.2), 500);
				return clearInterval(newItemInterval);
			}

			forceNodes.push(value);

			console.log(value);

			value.getConnections(1).forEach(n => {
				if (forceNodes.indexOf(n) === -1) {

					// make sure it is in the chosen from the data
					if (nodes.indexOf(n) !== -1) {
						nodeBuffer.add(n);
					}
				} else {

					// Already on the diagram link them up
					forceLinks.push({
						target: forceNodes.indexOf(value),
						source: forceNodes.indexOf(n),
						weight: n.normalizedConnectionWeights
					});
				}
			});
			renderPoints();
		}, 100);
	}

	function renderPoints() {

		link = link.data(force.links());
		link.enter()
			.append('svg:line')
			.attr('class', 'link')
			.style('stroke', '#000')
			.style('stroke-width', l => (l.weight * 5) * 0.8 + 0.2)
			.style('opacity', l => (l.weight * 5) * 0.8 + 0.2)
			.style('display', 'none')
			.style('pointer-events', 'none')
			.style('zIndex', -2);
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

		node.call(drag);

		node.exit().remove();

		updateDisplay();
		force.start().alpha(energy);
	}

	function renderVisibleNames() {

		const labelLinks = force2.links();
		const labelNodes = force2.nodes();

		// Empty
		labelLinks.splice(0);
		labelNodes.splice(0);

		// Add new
		nodes
			.filter(n => n.drawName || n.alwaysDrawName || settings.display.showAllNames.value)
			.forEach(n => {
				n.labelConfig.target.x = n.x - 20;
				n.labelConfig.target.y = n.y - 20;
				n.labelConfig.link.source = labelNodes.push(n.labelConfig.source)-1;
				n.labelConfig.link.target = labelNodes.push(n.labelConfig.target)-1;
				labelLinks.push(n.labelConfig.link);
			});

		labelLink = labelLink.data(force2.links());
		labelLink
			.enter()
			.append('svg:line')
			.style('display', 'none');

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
			.style('fill', '#55A');

		labelNode.exit().remove();

		force2.start();
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

	function applySettings() {

		updateDisplay();

		force
			.gravity(settings.gravity.strength.value)
			.friction(settings.friction.strength.value)
			.linkDistance(l => settings.linkDistance.coefficient.value *
				Math.pow(l.weight, -settings.linkDistance.affectedByCoocurence.value) *
				Math.pow(nodes.length, -1 * settings.linkDistance.proportionalToNumberOfNodes.value) *
				Math.pow(l.target.numberOfOccurences + l.source.numberOfOccurences, settings.linkDistance.proportionalToNumberOfOccurences.value * 0.5)
			)
			.charge(n => -1 *
				settings.charge.coefficient.value /
				Math.pow(nodes.length, settings.charge.proportionalToNumberOfNodes.value) *
				Math.pow(n.numberOfOccurences, settings.charge.proportionalToNumberOfOccurences.value * 0.5)
			)
			.linkStrength(l => settings.linkStrength.coefficient.value *
				Math.pow(l.weight, settings.linkStrength.affectedByCoocurence.value)
			).start().alpha(energy);
	}

	document.querySelector('.sappy-settings .o-techdocs-card__context')
		.addEventListener('click', e => e.currentTarget.parentNode.classList.toggle('collapsed'));

	function buildUi() {

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
					applySettings();
				}, false);
			});

		[...document.querySelectorAll('.sappy-settings_settings-sliders input[type="checkbox"]')]
			.forEach(function (el) {
				el.addEventListener('change', e => {
					const checkbox = e.currentTarget;
					settings[checkbox.dataset.actionname][checkbox.dataset.tweakname].value = checkbox.checked ? 1 : 0;
					applySettings();
				}, false);
			});
	}

	force.on('tick', function() {
		node.call(updateNode);
		link.call(updateLink);
	});

	force2.on('tick', function() {
		force2.alpha(energy);

		labelNode.each(function(d, i) {
			if(i % 2 === 0) {

				// The labels are on an elastic tether to the node
				// they repel each other but try to stay close to the node
				// this fixes one end to the node.
				d.x = d.node.x;
				d.y = d.node.y;
				d.fixed = true;
			}
		});

		labelLink.call(updateLink);
		labelNode.call(updateNode);
	});

	updateData();
	applySettings();
};
