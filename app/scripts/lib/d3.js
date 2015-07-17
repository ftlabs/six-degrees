/* global d3 */
/**
 * Based on http://bl.ocks.org/MoritzStefaner/1377729
 */

'use strict';
const ENERGY = 0.1;
const NODE_ADD_PERIOD = 200;

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
			value: 2300,
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
			value: 1,
			range: [0, 1]
		},
		coefficient: {
			value: 600,
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


/**
 * This is what draws the graph using D3.
 * 
 * @param  {[type]} options.generator [Required] A generator which produces an iterator, the iterator should output {[Person]}
 * @param  {Number} options.width     Width of the display port
 * @param  {Number} options.height    Height of the display port
 * @param  {String} options.place     Selector to determine where to place the D3 SVG in the body.
 * @return {void}                   
 */
module.exports = function ({
	generator,
	width = 960,
	height = 500,
	place = 'body'
} = {}) {


	/**
	 * Make the svg 10 times larger so that
	 * we can zoom out by shrinking the svg.
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

	svg.append("g").attr("id", "links");
	svg.append("g").attr("id", "nodes");
	svg.append("g").attr("id", "anchorLinks");
	svg.append("g").attr("id", "anchorNodes");

	const force = d3.layout
		.force()
		.size([width, height])
		.nodes([])
		.links([])
		.chargeDistance(500)
		.friction(0.5);

	const drag = force.drag();

	window.force = force;

	// Change the default ENERGY value resume restores to.
	force.oldResume = force.resume;
	force.resume = function (...args) {return force.oldResume.apply(force, args).alpha(ENERGY); };

	const force2 = d3.layout
		.force()
		.nodes([])
		.links([])
		.gravity(0)
		.linkDistance(5)
		.linkStrength(1)
		.chargeDistance(50)
		.charge(d => d.hasLabel ? -1000 : -100)
		.friction(0.3)
		.size([width, height]);

	let link = svg.select("#links").selectAll('g.link');
	let node = svg.select("#nodes").selectAll('g.node');
	let labelLink = svg.select("#anchorLinks").selectAll('g.anchorLink');
	let labelNode = svg.select("#anchorNodes").selectAll('g.anchorNode');

	/**
	 * Functions
	 */

	function setZoom(zoom = 1) {
		svg.style('transform', `translate(-50%, -50%) scale(${zoom})`);
	}

	function updateDisplay() {
		setZoom(Math.pow(10, settings.display["zoom (log scale)"].value));
		svg.selectAll('.link')
			.style('display', l => (l.source.drawLink && l.target.drawLink) || settings.display.showAllLinks.value ? 'inline' : 'none');
		svg.selectAll('.node-circle')
			.style('stroke', n => n.highlight ? '#F64' : '#FFF')
			.style('stroke-width',n => n.highlight ? 5 : 3)
			.style('fill', n => n.isRoot ? '#F64' : '#555')
			.transition().duration(200).attr("r", n => (Math.sqrt(n.numberOfOccurences) * 6 + 3) / (n.age === false ? 1 : n.age));
		renderVisibleNames();
	}

	let newItemInterval;
	let iterator = generator();
	function getNewData() {

		const {value, done} = iterator.next();
		if (done) {
			iterator = generator();
			return getNewData();
		}

		value.then(({nodes}) => processData(nodes));
	}
	window.getNewData = getNewData;

	function processData(newNodes) {
		buildUi(newNodes);

		const forceNodes = force.nodes();

		// create nodes for each of the labels
		newNodes.forEach(n => {
			if (!n.labelConfig) {
				const source = {node: n, id: n.name + '_label_source'};
				const target = {node: n, id: n.name + '_label_target', hasLabel: true, label: n.label};

				n.labelConfig = {
					source,
					target,
					link: {
						weight: 1,
						node: n,
						id: source.node.name + '_' + target.node.name + '_label'
					}
				};
			}
		});

		// Age existing nodes
		forceNodes.forEach(n => {
			n.age = (n.age ? n.age + 1 : 1);
		});

		// All current nodes have an age of one
		newNodes.forEach(n => {
			n.age = 1;
		});

		// Iterate over each of the new nodes and make sure that any
		// node that they are connected to is connected back.
		forceNodes.forEach(n => {
			n.isRoot = false;
			n.connections.forEach(p => {
				p.connections.add(n);
				p.connectionWeights.set(n, n.connectionWeights.get(p));
				p.normalizedConnectionWeights.set(n, n.connectionWeights.get(p));
			});
		});

		// Iterate over each of the old nodes and make sure that any
		// node that they are connected to is connected back.
		newNodes.forEach(n => {
			n.connections.forEach(p => {
				p.connections.add(n);
				p.connectionWeights.set(n, n.connectionWeights.get(p));
				p.normalizedConnectionWeights.set(n, n.connectionWeights.get(p));
			});
		});

		forceNodes.forEach((n, i) => {

			const tooOld = n.age > 3;
			if (tooOld) {
				n.age = false;
				forceNodes.splice(i, 1);
			}
			return !tooOld;
		});

		newNodes[0].isRoot = true;

		let nodeBuffer = new Set();

		// Add nodes not already in the graph
		let nodesToRender = new Set(newNodes.filter(n => forceNodes.indexOf(n) === -1));

		let i = (function *nextNodeToRender() {
			while(nodeBuffer.size || nodesToRender.size) {
				let n = (nodeBuffer.size ? nodeBuffer : nodesToRender).values().next().value;
				nodeBuffer.delete(n);
				nodesToRender.delete(n);
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

				// start loading the next slice after a few seconds
				setTimeout(getNewData, 2000);
				return clearInterval(newItemInterval);
			}

			forceNodes.push(value);

			// Check connections and either get them to be added next
			// or connect them in the graph.
			value.connections.forEach(n => {
				if (forceNodes.indexOf(n) === -1) {

					// make sure it is in the chosen from the data
					if (newNodes.indexOf(n) !== -1) {
						nodeBuffer.add(n);
					}
				}
			});

			renderPoints();
			renderLinks();
			force.start().alpha(ENERGY);
			applySettings();
		}, NODE_ADD_PERIOD);
	}

	function removeNode(n) {
		const forceNodes = force.nodes();
		const i = forceNodes.indexOf(n);
		if (i === -1) return;
		forceNodes.splice(i, 1);
		renderPoints();
		renderLinks();
		applySettings();
		force.start();
	}

	function renderPoints() {

		force.nodes().forEach(n => {
			n.weight = 1;
		});

		node = node.data(force.nodes(), n => n.name);
		node
			.enter()
			.append('svg:g')
			.attr('class', 'node')
			.append('svg:circle')
			.attr("r", 0) 
			.attr('class', 'node-circle')
			.on('mouseenter', function (n) {
				console.log(n.name, ':', Array.from(n.connections).map(n => n.name).join(', '));
				if (settings.display.showAllNames.value && settings.display.showAllLinks.value) return;
				n.drawName = true;
				n.drawLink = true;
				n.getConnections().forEach(p => p.drawName = true);
				n.getConnections().forEach(p => p.drawLink = true);
				updateDisplay();
			})
			.on('mouseleave', function (n) {
				if (settings.display.showAllNames.value && settings.display.showAllLinks.value) return;
				n.drawName = false;
				n.drawLink = false;
				n.getConnections().forEach(p => p.drawName = false);
				n.getConnections().forEach(p => p.drawLink = false);
				updateDisplay();
			})
			.on('click', removeNode);

		node.call(drag);

		node.exit().remove();
	}

	function renderLinks() {

		const forceLinks = force.links();
		const forceNodes = force.nodes();

		// Remove all links
		forceLinks.splice(0);

		// Relink nodes
		forceNodes.forEach(n => {

			forceNodes.forEach(n2 => {

				// Create a new link
				if (n.isConnectedTo(n2)) forceLinks.push({
					target: n2,
					source: n,
					weight: n.normalizedConnectionWeights.get(n2),
					id: n2.name + '_' + n.name 
				});
			});
		});

		link = link.data(force.links(), l => l.id);

		link.enter()
			.append('svg:line')
			.attr('class', 'link')
			.style('stroke', '#000')
			.style('stroke-width', l => (l.weight * 5) * 0.8 + 0.2)
			.style('opacity', l => (l.weight * 5) * 0.8 + 0.2)
			.style('display', 'none')
			.on('mouseenter', function (l) {
				console.log(l.target.name, '<--->', l.source.name);
			});
		link.exit().remove();
	}

	function renderVisibleNames() {


		const labelLinks = force2.links();
		const labelNodes = force2.nodes();
		const nodes = force.nodes();

		// Empty
		labelLinks.splice(0);
		labelNodes.splice(0);

		// Add new links
		nodes
			.filter(n => n.drawName || n.alwaysDrawName || settings.display.showAllNames.value)
			.forEach(n => {
				n.labelConfig.target.x = n.x - 20;
				n.labelConfig.target.y = n.y - 20;
				n.labelConfig.link.source = labelNodes.push(n.labelConfig.source)-1;
				n.labelConfig.link.target = labelNodes.push(n.labelConfig.target)-1;
				labelLinks.push(n.labelConfig.link);
			});

		labelLink = labelLink.data(force2.links(), l => l.id);
		labelLink
			.enter()
			.append('svg:line')
			.style('display', 'none');

		labelLink.exit().remove();

		// Add new nodes
		labelNode = labelNode.data(force2.nodes(), n => n.id);
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
			return 'translate(' + d.x + ',' + d.y + ')';
		});
	};

	function applySettings() {

		updateDisplay();
		const nodes = force.nodes();

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
				Math.pow(nodes.length, settings.charge.proportionalToNumberOfNodes.value * 0.5) *
				Math.pow(n.numberOfOccurences, settings.charge.proportionalToNumberOfOccurences.value * 0.5)
			)
			.linkStrength(l => settings.linkStrength.coefficient.value *
				Math.pow(l.weight, settings.linkStrength.affectedByCoocurence.value)
			).start().alpha(ENERGY);
	}

	document.querySelector('.sappy-settings .o-techdocs-card__context')
		.addEventListener('click', e => e.currentTarget.parentNode.classList.toggle('collapsed'));

	function buildUi(newNodes) {

		const nodes = force.nodes();

		function camelToPretty(str) {return str.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(); }

		document.querySelector(".person-of-interest-target").innerHTML = newNodes[0] ? newNodes[0].name : '';

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
		force2.alpha(ENERGY);

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

	getNewData();
};
