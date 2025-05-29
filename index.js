// index.js
import eventify from 'mgraph.events';
import createSimulatorModule from './lib/createPhysicsSimulator.js';

const noop = () => {};

/**
 * Creates a force-based layout for a given graph.
 */
export default function createLayout(graph, physicsSettings = {}) {
  if (!graph) {
    throw new Error('Graph structure cannot be undefined');
  }
  if (Array.isArray(physicsSettings)) {
    throw new Error('Physics settings is expected to be an object');
  }

  const createSimulator = physicsSettings.createSimulator || createSimulatorModule;
  const physicsSimulator = createSimulator(physicsSettings);

  const nodeBodies = new Map();
  const springs = {};
  let bodiesCount = 0;
  const springTransform = physicsSimulator.settings.springTransform || noop;

  initPhysics();
  listenToEvents();

  let wasStable = false;

  function onStableChanged(isStable) {
    api.fire('stable', isStable);
  }

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
    let fx = 0, fy = 0;
    forEachBody((body) => {
      fx += Math.abs(body.force.x);
      fy += Math.abs(body.force.y);
    });
    return Math.hypot(fx, fy);
  }

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

  function listenToEvents() {
    graph.on('changed', onGraphChanged);
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
    if (!fromBody || !toBody) return; // Safety check
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
    const links = graph.getLinks(node.id);
    if (!links) return [];

    const linksArray = Array.from(links);
    return linksArray.reduce((neighbors, link) => {
      const otherBody = link.fromId !== node.id
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
    if (!body) return; // Safety check
    const links = graph.getLinks(nodeId);
    const linkCount = links ? Array.from(links).length : 0;
    const mass = 1 + linkCount / 3.0;
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

  return api;
}

// Export the simulator for compatibility
createLayout.simulator = createSimulatorModule;