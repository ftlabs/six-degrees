
var data = require('./lib/data.js');
console.log(data);
require('./lib/d3.js')(data, {
	place: '.o-techdocs-content'
});
