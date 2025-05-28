# mgraph.forcelayout

A force-directed graph layout algorithm that works in any dimension (2D, 3D, and above). This modern port of ngraph.forcelayout uses optimized data structures (quad trees and higher-dimensional analogues) to quickly approximate long-distance forces. It is part of the mgraph family and works seamlessly with mgraph.graph.

## Table of Contents
- [API Usage](#api-usage)
- [Code Generators](#code-generators)
- [Overview](#overview) 
- [Unit Tests](#unit-tests)
- [Performance Benchmarks](#performance-benchmarks)
- [Installation](#installation)
- [Development Commands](#development-commands)
- [License](#license)

## API Usage

All force-directed layout algorithms are iterative. Create a layout for your graph and perform multiple iterations until the layout "settles."

### Basic Usage

```javascript
import createLayout from 'mgraph.forcelayout';
import createGraph from 'mgraph.graph';

const graph = createGraph();
// Add nodes and links to your graph...
const layout = createLayout(graph);

// Perform iterations until the layout stabilizes:
for (let i = 0; i < 1000; ++i) {
  layout.step();
}

// Query node positions:
graph.forEachNode(node => {
  console.log(layout.getNodePosition(node.id)); // returns { x, y } (or more dimensions)
});
```

### Higher Dimensions

To perform layout in a space with more than two dimensions, pass an options object:

```javascript
const layout3D = createLayout(graph, { dimensions: 3 });
const pos = layout3D.getNodePosition(nodeId); // returns { x, y, z }
```

### Node Positions & Pinning

Positions returned by `getNodePosition()` and `getLinkPosition()` are consistent between calls. You can "pin" a node to prevent it from moving:

```javascript
const node = graph.getNode(nodeId);
layout.pinNode(node, true); // pin the node

// Toggle pinning:
layout.pinNode(node, !layout.isNodePinned(node));
```

Or set a custom position:

```javascript 
layout.setNodePosition(nodeId, x, y); // for 2D; include z for 3D layouts
```

### Monitoring & Disposal

The layout listens to graph changes automatically. To stop monitoring and free resources:

```javascript
layout.dispose();
```

### Physics Simulator

Customize the simulation by passing your own physics settings:

```javascript
const physicsSettings = {
  timeStep: 0.5,
  dimensions: 2,
  gravity: -12,
  theta: 0.8,
  springLength: 10,
  springCoefficient: 0.8,
  dragCoefficient: 0.9,
};

const layout = createLayout(graph, physicsSettings);
```

Access the underlying simulator via `layout.simulator` if needed.

### Bounding Box & Body Manipulation

Determine the area occupied by your graph:

```javascript
const rect = layout.getGraphRect();
// rect.min_x, rect.min_y (top-left), rect.max_x, rect.max_y (bottom-right)
```

For advanced use, you can iterate over individual bodies:

```javascript
layout.forEachBody((body, nodeId) => {
  // process each body
});
```

## Code Generators

The library includes a dynamic code-generation module (found in the `lib/code-generators.ts` file) that produces optimized code for:

- Computing bounds
- Generating Body and Vector classes
- Creating force functions (drag and spring forces)
- Integrating movement
- Building a quadtree for efficient force approximation

## Overview

### TypeScript Types & Validation
The code generators are written in TypeScript, include type definitions, and perform input validation (e.g. ensuring the dimension is a positive integer).

### Error Handling
The generated functions throw descriptive errors if the input parameters are invalid or if the code-generation process fails.

Usage Example:

```
import { createPatternBuilder, generateBoundsFunction } from 'mgraph.forcelayout';

const pattern = createPatternBuilder(2);
console.log(pattern('Coordinate: {var}', { join: '; ' }));
// Expected output: "Coordinate: x; Coordinate: y"

const boundsFunc = generateBoundsFunction(2);
const bounds = boundsFunc([], { springLength: 10 }, { nextDouble: () => 0.5 });
console.log(bounds.box);
```

## Unit Tests

Unit tests for each generator function are written in TypeScript (see `tests/code-generators.test.ts`). They cover:

- Correctness of coordinate names and pattern builder
- Verification that each generated function returns a valid function/class
- Validation that error conditions are caught

Run Unit Tests:
```
npm run test
```

## Performance Benchmarks

Performance benchmarks are provided in `benchmarks/code-generators.bench.ts` using Benchmark.js. They measure the time to generate each piece of code (bounds, body, force functions, integrator, quadtree).

Run Benchmarks:
```
npm run bench
```

## Installation

Install via npm:
```
npm install mgraph.forcelayout
```

Or include via CDN:
```
<script src="https://unpkg.com/mgraph.forcelayout/dist/mgraph.forcelayout.min.js"></script>
```

When using the CDN, the library is exposed as the global `mgraphCreateLayout`.

## Development Commands

### Build
Build the library (if you use a bundler or transpile TypeScript):
```
npm run build
```

### Run Unit Tests
Execute the test suite:
```
npm run test
```

Run Linter:
```
npm run lint
```

### Run Benchmarks 
Run performance benchmarks for the code generators:
```
npm run bench
```

### Watch & Rebuild
Use your preferred watch tool (e.g. `tsc -w`) to continuously rebuild the TypeScript files in `lib`.

## Performance Benchmarks

Performance benchmarks are provided in `benchmarks/code-generators.bench.ts` using Benchmark.js. They measure the time to generate each piece of code (bounds, body, force functions, integrator, quadtree).

Latest benchmark results (Node.js, Intel i7):

```
Running performance benchmarks for code generators (2D)...
Bounds Generator (2D)        x  71,556 ops/sec  ±2.53% (83 runs sampled)
Body Generator (2D)          x 103,462 ops/sec  ±1.62% (85 runs sampled)
Drag Force Generator (2D)    x 471,197 ops/sec  ±2.09% (82 runs sampled)
Spring Force Generator (2D)  x 138,933 ops/sec  ±2.44% (85 runs sampled)
Integrator Generator (2D)    x 109,209 ops/sec  ±2.58% (87 runs sampled)
QuadTree Generator (2D)      x  17,811 ops/sec  ±3.09% (78 runs sampled)
```

Key observations:

Drag Force Generator is the fastest, capable of generating over 470K functions per second
QuadTree Generator is the slowest due to its complexity, but still achieves ~18K generations per second
All generators maintain high performance suitable for runtime code generation

Run benchmarks yourself:
```
npm run bench
```

## License
```
BSD-3-Clause
```