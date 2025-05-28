// lib/getGraph.js
/**
 * Load your graph here.
 */
// https://github.com/anvaka/miserables
import miserables from 'miserables';

// Other loaders:

// https://github.com/anvaka/mgraph.generators
// import generate from 'mgraph.generators';

// https://github.com/anvaka/mgraph.graph
// import createGraph from 'mgraph.graph';

// https://github.com/anvaka/mgraph.fromjson
// import fromjson from 'mgraph.fromjson'

// https://github.com/anvaka/mgraph.fromdot
// import fromdot from 'mgraph.fromdot'

export default function getGraph() {
  return miserables.create();
  // return generate.wattsStrogatz(20, 5, 0.4);
}