import createLayout from '../index.js';
import createGraph from 'mgraph.graph';

describe('createLayout()', () => {
  const graph  = createGraph();
  graph.addNode(1); graph.addNode(2); graph.addLink(1, 2);

  const layout = createLayout(graph);

  it('exposes simulator & step()', () => {
    expect(typeof layout.step).toBe('function');
    expect(layout.simulator).toBeDefined();
  });

  it('computes positions & stable event', () => {
    let stableFired = false;
    layout.on('stable', s => { if (s) stableFired = true; });

    // run a few steps
    for (let i = 0; i < 60 && !stableFired; ++i) layout.step();

    expect(stableFired).toBe(true);
    const pos = layout.getNodePosition(1);
    expect(Number.isFinite(pos.x) && Number.isFinite(pos.y)).toBe(true);
  });

  it('pins and unpins nodes', () => {
    const n1 = graph.getNode(1);
    layout.pinNode(n1, true);
    expect(layout.isNodePinned(n1)).toBe(true);
    layout.pinNode(n1, false);
    expect(layout.isNodePinned(n1)).toBe(false);
  });
});
