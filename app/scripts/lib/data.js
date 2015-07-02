'use strict';


const nodes = [];
const labelAnchors = [];
const labelAnchorLinks = [];
const links = [];

// Create nodes
for(let i = 0; i < 30; i++) {
	const labelAnchorNode = {
		label: 'node ' + i
	};
	nodes.push(labelAnchorNode);
	labelAnchors.push({
		node: labelAnchorNode
	});
	labelAnchors.push({
		node: labelAnchorNode
	});
}

// Link up nodes
for(let i = 0; i < nodes.length; i++) {
	for(let j = 0; j < i; j++) {
		if(Math.random() > 0.95) {
			links.push({
				source: i,
				target: j,
				weight: Math.random()
			});
		}
	}
	labelAnchorLinks.push({
		source: i * 2,
		target: i * 2 + 1,
		weight: 1
	});
}

module.exports = {
	nodes,
	labelAnchors,
	labelAnchorLinks,
	links
};

// fetch list of people.
// pick one
// fetch their coocurring people
// then fetch theirs
