// index.js
import eventify from 'mgraph.events';
import createSimulatorModule from './lib/createPhysicsSimulator.js';

const noop = () => {};

/**
 * Creates a force-based layout for a given graph.
 *
 * @param {any} graph - The graph to lay out.
 * @param {object} [physicsSettings={}] - Custom settings for the physics simulator.
 * @returns {object} The layout API.
 */
export default function createLayout(graph, physicsSettings = {}) {
  if (!graph) {
    throw new Error('Graph structure cannot be undefined');
  }
  if (Array.isArray(physicsSettings)) {
    throw new Error('Physics settings is expected to be an object');
  }

  // Use a custom simulator if provided, otherwise fall back to the default.
  const createSimulator =
    physicsSettings.createSimulator || createSimulatorModule;
  const physicsSimulator = createSimulator(physicsSettings);

  // Decide which default nodeMass function to use based on the graph version.
  // (These functions are defined below.)
  let nodeMass =
    graph.version > 19 ? defaultSetNodeMass : defaultArrayNodeMass;
  if (typeof physicsSettings.nodeMass === 'function') {
    nodeMass = physicsSettings.nodeMass;
  }

  // Maps node IDs to physics body objects.
  const nodeBodies = new Map();
  // Stores springs by link id.
  const springs = {};
  let bodiesCount = 0;
  const springTransform = physicsSimulator.settings.springTransform || noop;

  // Initialize the physics state and start listening for graph changes.
  initPhysics();
  listenToEvents();

  let wasStable = false;

  const api = {
    step() {
      if (bodiesCount === 0) {
        updateStableStatus(true);
        return true;
      }
      const lastMove = physicsSimulator.step();
      api.lastMove = lastMove;
      api.fire('step');

      const ratio = lastMove / bodiesCount;
      const isStableNow = ratio <= 0.01;
      updateStableStatus(isStableNow);
      return isStableNow;
    },

    getNodePosition(nodeId) {
      return getInitializedBody(nodeId).pos;
    },

    setNodePosition(nodeId, ...args) {
      const body = getInitializedBody(nodeId);
      body.setPosition(...args);
    },

    getLinkPosition(linkId) {
      const spring = springs[linkId];
      if (spring) {
        return { from: spring.from.pos, to: spring.to.pos };
      }
    },

    getGraphRect() {
      return physicsSimulator.getBBox();
    },

    forEachBody,
    
    pinNode(node, isPinned) {
      const body = getInitializedBody(node.id);
      body.isPinned = Boolean(isPinned);
    },

    isNodePinned(node) {
      return getInitializedBody(node.id).isPinned;
    },

    dispose() {
      graph.off('changed', onGraphChanged);
      api.fire('disposed');
    },

    getBody(nodeId) {
      return nodeBodies.get(nodeId);
    },

    getSpring,

    getForceVectorLength,

    simulator: physicsSimulator,
    graph,
    lastMove: 0,
  };

  eventify(api);
  return api;

  // ─── INTERNAL FUNCTIONS ────────────────────────────────────────────────

  const updateStableStatus = (isStableNow) => {
    if (wasStable !== isStableNow) {
      wasStable = isStableNow;
      onStableChanged(isStableNow);
    }
  };

  function forEachBody(cb) {
    nodeBodies.forEach(cb);
  }

  function getForceVectorLength() {
    let fx = 0,
      fy = 0;
    forEachBody((body) => {
      fx += Math.abs(body.force.x);
      fy += Math.abs(body.force.y);
    });
    return Math.hypot(fx, fy);
  }

  /**
   * Returns a spring for a given link. It supports two signatures:
   *  - getSpring(linkId)
   *  - getSpring(fromId, toId)
   */
  function getSpring(fromId, toId) {
    let linkId;
    if (toId === undefined) {
      linkId = typeof fromId !== 'object' ? fromId : fromId.id;
    } else {
      const link = graph.hasLink(fromId, toId);
      if (!link) return;
      linkId = link.id;
    }
    return springs[linkId];
  }

  function listenToEvents() {
    graph.on('changed', onGraphChanged);
  }

  function onStableChanged(isStable) {
    api.fire('stable', isStable);
  }

  function onGraphChanged(changes) {
    changes.forEach((change) => {
      if (change.changeType === 'add') {
        if (change.node) {
          initBody(change.node.id);
        }
        if (change.link) {
          initLink(change.link);
        }
      } else if (change.changeType === 'remove') {
        if (change.node) {
          releaseNode(change.node);
        }
        if (change.link) {
          releaseLink(change.link);
        }
      }
    });
    bodiesCount = graph.getNodesCount();
  }

  function initPhysics() {
    bodiesCount = 0;
    graph.forEachNode((node) => {
      initBody(node.id);
      bodiesCount++;
    });
    graph.forEachLink(initLink);
  }

  function initBody(nodeId) {
    if (nodeBodies.has(nodeId)) return;
    const node = graph.getNode(nodeId);
    if (!node) {
      throw new Error(`initBody() was called with unknown node id: ${nodeId}`);
    }
    let pos = node.position;
    if (!pos) {
      const neighbors = getNeighborBodies(node);
      pos = physicsSimulator.getBestNewBodyPosition(neighbors);
    }
    const body = physicsSimulator.addBodyAt(pos);
    body.id = nodeId;
    nodeBodies.set(nodeId, body);
    updateBodyMass(nodeId);
    if (isNodeOriginallyPinned(node)) {
      body.isPinned = true;
    }
  }

  function releaseNode(node) {
    const nodeId = node.id;
    const body = nodeBodies.get(nodeId);
    if (body) {
      nodeBodies.delete(nodeId);
      physicsSimulator.removeBody(body);
    }
  }

  function initLink(link) {
    updateBodyMass(link.fromId);
    updateBodyMass(link.toId);
    const fromBody = nodeBodies.get(link.fromId);
    const toBody = nodeBodies.get(link.toId);
    const spring = physicsSimulator.addSpring(fromBody, toBody, link.length);
    springTransform(link, spring);
    springs[link.id] = spring;
  }

  function releaseLink(link) {
    const spring = springs[link.id];
    if (spring) {
      const from = graph.getNode(link.fromId);
      const to = graph.getNode(link.toId);
      if (from) updateBodyMass(from.id);
      if (to) updateBodyMass(to.id);
      delete springs[link.id];
      physicsSimulator.removeSpring(spring);
    }
  }

  function getNeighborBodies(node) {
    if (!node.links) return [];
    let links = node.links;
    // If node.links is a Set, convert it to an array
    if (typeof links.forEach === 'function' && typeof links.reduce !== 'function') {
      links = Array.from(links);
    }
    return links.reduce((neighbors, link) => {
      const otherBody =
        link.fromId !== node.id
          ? nodeBodies.get(link.fromId)
          : nodeBodies.get(link.toId);
      if (otherBody && otherBody.pos) {
        neighbors.push(otherBody);
      }
      return neighbors;
    }, []);
  }

  function updateBodyMass(nodeId) {
    const body = nodeBodies.get(nodeId);
    const mass = nodeMass(nodeId); // This calls either defaultArrayNodeMass or defaultSetNodeMass
    console.log(`Node ${nodeId}: links = ${graph.getLinks(nodeId)}, mass = ${mass}, type of mass = ${typeof mass}`); // Debugging line
    if (Number.isNaN(mass)) {
      throw new Error('Node mass should be a number');
    }
    body.mass = mass;
  }

  function isNodeOriginallyPinned(node) {
    return node?.isPinned || (node?.data && node.data.isPinned);
  }

  function getInitializedBody(nodeId) {
    if (!nodeBodies.has(nodeId)) {
      initBody(nodeId);
    }
    return nodeBodies.get(nodeId);
  }

  // ─── Default mass functions ────────────────────────────────────────────

  function defaultArrayNodeMass(nodeId) {
    const links = graph.getLinks(nodeId);
    return links ? 1 + links.length / 3.0 : 1;
  }

  function defaultSetNodeMass(nodeId) {
    const links = graph.getLinks(nodeId);
    return links ? 1 + links.size / 3.0 : 1;
  }
}

createLayout.simulator = createSimulatorModule;
