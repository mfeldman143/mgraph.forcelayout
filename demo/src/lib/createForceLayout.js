// src/lib/createForceLayout.js
import createLayout from 'mgraph.forcelayout';

export default function createForceLayout(graph, layoutSettings) {
  return createLayout(graph, Object.assign({
    dimensions: 2,
    timeStep: 0.5,
    springLength: 10,
    gravity: -12,
    springCoefficient: 0.8,
    dragCoefficient: 0.9,
    debug: false,
  }, layoutSettings));
}
