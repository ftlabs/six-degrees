/* global d3 */
/**
 * Based on http://bl.ocks.org/MoritzStefaner/1377729
 */

'use strict';

module.exports = function ({
	nodes,
	labelAnchors,
	labelAnchorLinks,
	links
}, {
	width = 960,
	height = 500,
	place = 'body'
} = {}) {

	const vis = d3
		.select(place)
		.append('svg:svg')
		.attr('width', width)
		.attr('height', height);

	const force = d3.layout
		.force()
		.size([width, height])
		.nodes(nodes)
		.links(links)
		.gravity(1)
		.linkDistance(50)
		.charge(-3000)
		.linkStrength(function(x) {
			return x.weight * 10;
		});


	force.start();

	const force2 = d3.layout
		.force()
		.nodes(labelAnchors)
		.links(labelAnchorLinks)
		.gravity(0)
		.linkDistance(0)
		.linkStrength(8)
		.charge(-100)
		.size([width, height]);

	force2.start();

	const link = vis
		.selectAll('line.link')
		.data(links)
		.enter()
		.append('svg:line')
		.attr('class', 'link')
		.style('stroke', '#CCC');

	const node = vis.selectAll('g.node')
		.data(force.nodes())
		.enter()
		.append('svg:g')
		.attr('class', 'node');

	node.append('svg:circle')
		.attr('r', 5)
		.style('fill', '#555')
		.style('stroke', '#FFF')
		.style('stroke-width', 3);

	node.call(force.drag);


	const anchorLink = vis
		.selectAll('line.anchorLink')
		.data(labelAnchorLinks);//.enter().append('svg:line').attr('class', 'anchorLink').style('stroke', '#999');

	const anchorNode = vis.selectAll('g.anchorNode')
		.data(force2.nodes())
		.enter()
		.append('svg:g')
		.attr('class', 'anchorNode');

	anchorNode.append('svg:circle').attr('r', 0).style('fill', '#FFF');
	anchorNode.append('svg:text')
		.text(function(d, i) {
			return i % 2 === 0 ? '' : d.node.label;
		})
		.style('fill', '#555')
		.style('font-family', 'Arial')
		.style('font-size', 12);

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

		force2.start();

		node.call(updateNode);

		anchorNode.each(function(d, i) {
			if(i % 2 === 0) {
				d.x = d.node.x;
				d.y = d.node.y;
			} else {
				const b = this.childNodes[1].getBBox();

				const diffX = d.x - d.node.x;
				const diffY = d.y - d.node.y;

				const dist = Math.sqrt(diffX * diffX + diffY * diffY);

				let shiftX = b.width * (diffX - dist) / (dist * 2);
				shiftX = Math.max(-b.width, Math.min(0, shiftX));
				const shiftY = 5;
				this.childNodes[1].setAttribute('transform', 'translate(' + shiftX + ',' + shiftY + ')');
			}
		});


		anchorNode.call(updateNode);

		link.call(updateLink);
		anchorLink.call(updateLink);

	});

};
