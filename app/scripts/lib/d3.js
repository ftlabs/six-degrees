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

	nodes[0].x = width/2;
	nodes[0].y = height/2;

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
		.charge(-1000)
		.linkStrength(l => l.weight * 10);

	window.force = force;

	force.start();

	// Attach the labels.
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
		.style('stroke', '#000')
		.style('opacity', l => (l.weight * 5) * 0.8 + 0.2)
		.style('display', 'none');

	const node = vis.selectAll('g.node')
		.data(force.nodes())
		.enter()
		.append('svg:g')
		.attr('class', 'node')
		.on('mouseover', function (n) {
			n.drawLine = true;
			n.getConnections().forEach(p => p. drawLine = true);
			link.style('display', l => (l.source.drawLine && l.target.drawLine) ? 'inline' : 'none');
			nodeText.style('display', n => n.node.drawLine ? 'inline' : 'none');
		})
		.on('mouseout', function (n) {
			n.drawLine = false;
			n.getConnections().forEach(p => p. drawLine = false);
			link.style('display', l => (l.source.drawLine && l.target.drawLine) ? 'inline' : 'none');
			nodeText.style('display', n => n.node.drawLine ? 'inline' : 'none');
		});

	node.append('svg:circle')
		.attr('r', x => Math.sqrt(x.numberOfOccurences) + 2)
		.style('fill', x => x.isRoot ? '#F64' : '#555')
		.style('stroke', '#FFF')
		.style('stroke-width', 3);

	node.call(force.drag);


	const anchorLink = vis
		.selectAll('line.anchorLink')
		.data(labelAnchorLinks);

	const anchorNode = vis.selectAll('g.anchorNode')
		.data(force2.nodes())
		.enter()
		.append('svg:g')
		.attr('class', 'anchorNode');

	anchorNode.append('svg:circle').attr('r', 0).style('fill', '#FFF');
	const nodeText = anchorNode.append('svg:text')
		.text(function(d, i) {
			return i % 2 === 0 ? '' : d.node.label;
		})
		.style('fill', '#555')
		.style('font-family', 'Arial')
		.style('font-size', 12)
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

		// keep the labels connected to thde nodes
		force2.start();

		node.call(updateNode);

		anchorNode.each(function(d, i) {
			if(i % 2 === 0) {

				// Attatch one end of the Label Link to the node
				d.x = d.node.x;
				d.y = d.node.y;
				d.fixed = true;
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
