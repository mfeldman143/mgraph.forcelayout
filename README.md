# README.md
# mgraph.forcelayout

A modern, high-performance force-directed graph layout algorithm that works in any dimension (2D, 3D, and above). This ES modules port of ngraph.forcelayout uses optimized data structures (quad trees and higher-dimensional analogues) to quickly approximate long-distance forces using the Barnes-Hut algorithm.

[![npm version](https://badge.fury.io/js/mgraph.forcelayout.svg)](https://www.npmjs.com/package/mgraph.forcelayout)
[![Build Status](https://github.com/mfeldman143/mgraph.forcelayout/workflows/test/badge.svg)](https://github.com/mfeldman143/mgraph.forcelayout/actions)

## Features

- 🚀 **High Performance**: Uses Barnes-Hut algorithm for O(n log n) complexity
- 🌐 **Multi-dimensional**: Works in 2D, 3D, or any number of dimensions
- 📦 **Modern ES Modules**: Tree-shakeable, works with all modern bundlers
- ⚛️ **Framework Ready**: Compatible with React, Vue, Angular, and vanilla JS
- 🎯 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🔧 **Customizable**: Extensive physics simulation parameters
- 📱 **Universal**: Works in browsers, Node.js, and web workers

## Installation

```bash
npm install mgraph.forcelayout mgraph.graph
```

## Quick Start

```javascript
import createLayout from 'mgraph.forcelayout';
import createGraph from 'mgraph.graph';

// Create a graph
const graph = createGraph();
graph.addNode(1);
graph.addNode(2);
graph.addNode(3);
graph.addLink(1, 2);
graph.addLink(2, 3);
graph.addLink(3, 1);

// Create layout
const layout = createLayout(graph);

// Run simulation
for (let i = 0; i < 100; i++) {
  layout.step();
}

// Get positions
graph.forEachNode(node => {
  const pos = layout.getNodePosition(node.id);
  console.log(`Node ${node.id}: (${pos.x}, ${pos.y})`);
});

// Clean up
layout.dispose();
```

## API Reference

### Creating a Layout

```javascript
const layout = createLayout(graph, options);
```

**Parameters:**

- `graph`: An `mgraph.graph` instance
- `options`: Optional physics settings object

**Options:**

```javascript
{
  dimensions: 2,           // Number of spatial dimensions (2D, 3D, etc.)
  springLength: 30,        // Ideal spring length between connected nodes
  springCoefficient: 0.8,  // Spring force strength (0-1)
  gravity: -12,           // Node repulsion strength (negative values)
  theta: 0.8,             // Barnes-Hut approximation parameter (0-1)
  dragCoefficient: 0.9,   // Velocity damping (0-1)
  timeStep: 0.5,          // Integration time step
  adaptiveTimeStepWeight: 0, // Adaptive time stepping (experimental)
  debug: false            // Enable debug mode
}
```

### Core Methods

#### `layout.step()`

Performs one iteration of the physics simulation.

```javascript
const isStable = layout.step();
if (isStable) {
  console.log('Layout has converged!');
}
```

#### `layout.getNodePosition(nodeId)`

Returns the current position of a node.

```javascript
const pos = layout.getNodePosition(1);
console.log(pos); // { x: 10.5, y: -5.2 } (2D) or { x, y, z } (3D)
```

#### `layout.setNodePosition(nodeId, x, y, z, ...)`

Sets a node's position manually.

```javascript
layout.setNodePosition(1, 0, 0);     // 2D
layout.setNodePosition(1, 0, 0, 0);  // 3D
```

#### `layout.pinNode(node, isPinned)`

Pins or unpins a node to prevent it from moving.

```javascript
const node = graph.getNode(1);
layout.pinNode(node, true);  // Pin node
layout.pinNode(node, false); // Unpin node
```

#### `layout.isNodePinned(node)`

Checks if a node is pinned.

```javascript
const isPinned = layout.isNodePinned(node);
```

### Layout Information

#### `layout.getGraphRect()`

Returns the bounding box of all nodes.

```javascript
const rect = layout.getGraphRect();
console.log(rect); // { min_x, min_y, max_x, max_y }
```

#### `layout.getLinkPosition(linkId)`

Returns the start and end positions of a link.

```javascript
const linkPos = layout.getLinkPosition(linkId);
console.log(linkPos); // { from: {x, y}, to: {x, y} }
```

#### `layout.getForceVectorLength()`

Returns the total force in the system (useful for detecting convergence).

```javascript
const totalForce = layout.getForceVectorLength();
if (totalForce < 0.01) {
  console.log('System is stable');
}
```

## Advanced Usage

### Events

The layout emits events during simulation:

```javascript
layout.on('stable', (isStable) => {
  if (isStable) {
    console.log('Layout has stabilized!');
  }
});

layout.on('step', () => {
  console.log('Simulation step completed');
});
```

### Iterating Over Bodies

For advanced physics manipulation:

```javascript
layout.forEachBody((body, nodeId) => {
  console.log(`Node ${nodeId} velocity:`, body.velocity);
  
  // Manually adjust forces
  body.force.x += 10;
  body.force.y -= 5;
});
```

### Accessing the Physics Simulator

For low-level control:

```javascript
const simulator = layout.simulator;
console.log('Current settings:', simulator.settings);

// Adjust parameters during simulation
simulator.gravity(-15);
simulator.theta(0.9);
```

## Framework Integration

### React Hook Example

```javascript
import { useEffect, useRef, useState } from 'react';
import createLayout from 'mgraph.forcelayout';

function useForceLayout(graph, options = {}) {
  const layoutRef = useRef(null);
  const [positions, setPositions] = useState(new Map());
  
  useEffect(() => {
    if (!graph) return;
    
    layoutRef.current = createLayout(graph, options);
    const layout = layoutRef.current;
    
    // Run simulation
    const animate = () => {
      const isStable = layout.step();
      
      // Update positions
      const newPositions = new Map();
      graph.forEachNode(node => {
        newPositions.set(node.id, layout.getNodePosition(node.id));
      });
      setPositions(newPositions);
      
      if (!isStable) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
    
    return () => {
      layout.dispose();
    };
  }, [graph]);
  
  return positions;
}
```

### Vue Composition API Example

```javascript
import { ref, onMounted, onUnmounted, watch } from 'vue';
import createLayout from 'mgraph.forcelayout';

export function useForceLayout(graph, options = {}) {
  const positions = ref(new Map());
  const isRunning = ref(false);
  let layout = null;
  
  const runSimulation = () => {
    if (!layout || !isRunning.value) return;
    
    const isStable = layout.step();
    
    // Update positions
    const newPositions = new Map();
    graph.forEachNode(node => {
      newPositions.set(node.id, layout.getNodePosition(node.id));
    });
    positions.value = newPositions;
    
    if (!isStable && isRunning.value) {
      requestAnimationFrame(runSimulation);
    }
  };
  
  watch(() => graph, (newGraph) => {
    if (layout) {
      layout.dispose();
    }
    
    if (newGraph) {
      layout = createLayout(newGraph, options);
      isRunning.value = true;
      runSimulation();
    }
  }, { immediate: true });
  
  onUnmounted(() => {
    if (layout) {
      layout.dispose();
    }
  });
  
  return {
    positions: readonly(positions),
    isRunning,
    start: () => { isRunning.value = true; runSimulation(); },
    stop: () => { isRunning.value = false; }
  };
}
```

## Advanced Examples

### 3D Visualization

```javascript
const layout3D = createLayout(graph, { dimensions: 3 });

// Run simulation
for (let i = 0; i < 500; i++) {
  layout3D.step();
}

// Use with Three.js
graph.forEachNode(node => {
  const pos = layout3D.getNodePosition(node.id);
  const mesh = scene.getObjectByName(`node-${node.id}`);
  if (mesh) {
    mesh.position.set(pos.x, pos.y, pos.z);
  }
});
```

### Custom Physics Settings

```javascript
// High-quality, slow simulation
const preciseLayout = createLayout(graph, {
  theta: 0.1,           // More accurate force calculation
  timeStep: 0.1,        // Smaller time steps
  dragCoefficient: 0.95 // Less damping
});

// Fast, approximate simulation
const fastLayout = createLayout(graph, {
  theta: 1.0,           // Maximum approximation
  timeStep: 1.0,        // Larger time steps
  dragCoefficient: 0.8  // More damping
});
```

### Adaptive Simulation

```javascript
const layout = createLayout(graph);
let iterations = 0;
const maxIterations = 1000;

function simulate() {
  const isStable = layout.step();
  const forceLength = layout.getForceVectorLength();
  iterations++;
  
  console.log(`Iteration ${iterations}, Force: ${forceLength.toFixed(4)}`);
  
  if (!isStable && iterations < maxIterations && forceLength > 0.01) {
    requestAnimationFrame(simulate);
  } else {
    console.log('Simulation complete!');
    layout.dispose();
  }
}

simulate();
```

## Performance Tips

- Use appropriate theta values: Lower values (0.1-0.5) for accuracy, higher values (0.8-1.0) for speed
- Adjust time step: Smaller values for stability, larger for speed
- Monitor force vector length: Stop simulation when forces are minimal
- Pin static nodes: Prevent unnecessary calculations for fixed nodes
- Use adaptive time stepping: Enable for better convergence in complex layouts

## Browser Support

- Modern Browsers: Chrome 61+, Firefox 60+, Safari 11+, Edge 16+
- Node.js: 14+ (ES modules support required)
- Bundlers: Webpack, Rollup, Vite, Parcel (all versions with ES modules support)

## CDN Usage

For direct browser usage without a bundler:

```html
<script type="module">
  import createLayout from 'https://unpkg.com/mgraph.forcelayout/dist/mgraph.forcelayout.esm.js';
  
  // Your code here
</script>
```

Or with UMD (global variable):

```html
<script src="https://unpkg.com/mgraph.forcelayout/dist/mgraph.forcelayout.umd.min.js"></script>
<script>
  const layout = mgraphCreateLayout(graph);
</script>
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build library
npm run build

# Run benchmarks
npm run bench

# Start development server
npm run dev
```

## Performance Benchmarks

Latest benchmark results on a modern desktop (Node.js, Intel i7):

**Code Generation Performance:**
✓ Bounds Generator (2D):        71,556 ops/sec ±2.53%
✓ Body Generator (2D):         103,462 ops/sec ±1.62%
✓ Drag Force Generator (2D):   471,197 ops/sec ±2.09%
✓ Spring Force Generator (2D): 138,933 ops/sec ±2.44%
✓ Integrator Generator (2D):   109,209 ops/sec ±2.58%
✓ QuadTree Generator (2D):      17,811 ops/sec ±3.09%

**Layout Performance (1000 nodes, 2000 edges):**

- 2D Layout: ~60 FPS on modern hardware
- 3D Layout: ~45 FPS on modern hardware
- Memory Usage: ~2MB for 1000 nodes

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Related Projects

- [mgraph.graph](https://github.com/mfeldman143/mgraph.graph) - Graph data structure
- [mgraph.events](https://github.com/mfeldman143/mgraph.events) - Event system
- [mgraph.generators](https://github.com/mfeldman143/mgraph.generators) - Graph generators

## License

[BSD-3-Clause License](LICENSE). See LICENSE for details.

## Acknowledgments

This library is a modern ES modules port of the excellent [ngraph.forcelayout](https://github.com/anvaka/ngraph.forcelayout) by Andrei Kashcha. The core algorithms and mathematical foundations remain faithful to the original implementation.
