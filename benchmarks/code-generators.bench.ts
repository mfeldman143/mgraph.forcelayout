const Benchmark = require('benchmark');
const {
  generateBoundsFunction,
  generateCreateBodyFunction,
  generateCreateDragForceFunction,
  generateCreateSpringForceFunction,
  generateIntegratorFunction,
  generateQuadTreeFunction
} = require('../lib/code-generators');

console.log('Running performance benchmarks for code generators (2D)...');
const suite = new Benchmark.Suite();

suite.add('Bounds Generator (2D)', () => {
  generateBoundsFunction(2);
});

suite.add('Body Generator (2D)', () => {
  generateCreateBodyFunction(2, false);
});

suite.add('Drag Force Generator (2D)', () => {
  generateCreateDragForceFunction(2);
});

suite.add('Spring Force Generator (2D)', () => {
  generateCreateSpringForceFunction(2);
});

suite.add('Integrator Generator (2D)', () => {
  generateIntegratorFunction(2);
});

suite.add('QuadTree Generator (2D)', () => {
  generateQuadTreeFunction(2);
});

suite.on('cycle', (event) => {
  console.log(String(event.target));
});

suite.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name'));
});

suite.run({ async: true });
