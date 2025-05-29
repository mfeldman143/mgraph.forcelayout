// lib/createPhysicsSimulator.js
import merge from 'mgraph.merge';
import eventify from 'mgraph.events';
import random from 'mgraph.random';

// Import from the consolidated code generators
import {
  generateCreateBodyFunction,
  generateQuadTreeFunction,
  generateBoundsFunction,
  generateCreateDragForceFunction,
  generateCreateSpringForceFunction,
  generateIntegratorFunction
} from './code-generators.js';
const dimensionalCache = {};

export default function createPhysicsSimulator(settings) {
  if (settings) {
    // Check for names from older versions of the layout
    if (settings.springCoeff !== undefined) throw new Error('springCoeff was renamed to springCoefficient');
    if (settings.dragCoeff !== undefined) throw new Error('dragCoeff was renamed to dragCoefficient');
  }

  settings = merge(settings, {
    springLength: 10,
    springCoefficient: 0.8,
    gravity: -12,
    theta: 0.8,
    dragCoefficient: 0.9,
    timeStep: 0.5,
    adaptiveTimeStepWeight: 0,
    dimensions: 2,
    debug: false
  });

  let factory = dimensionalCache[settings.dimensions];
  if (!factory) {
    const dimensions = settings.dimensions;
    factory = {
      Body: generateCreateBodyFunction(dimensions, settings.debug),
      createQuadTree: generateQuadTreeFunction(dimensions),
      createBounds: generateBoundsFunction(dimensions),
      createDragForce: generateCreateDragForceFunction(dimensions),
      createSpringForce: generateCreateSpringForceFunction(dimensions),
      integrate: generateIntegratorFunction(dimensions),
    };
    dimensionalCache[dimensions] = factory;
  }

  const Body = factory.Body;
  const createQuadTree = factory.createQuadTree;
  const createBounds = factory.createBounds;
  const createDragForce = factory.createDragForce;
  const createSpringForce = factory.createSpringForce;
  const integrate = factory.integrate;
  const createBody = pos => new Body(pos);

  const rng = random.random(42);
  const bodies = [];
  const springs = [];

  const quadTree = createQuadTree(settings, rng);
  const bounds = createBounds(bodies, settings, rng);
  const springForce = createSpringForce(settings, rng);
  const dragForce = createDragForce(settings);

  const forces = [];
  const forceMap = new Map();
  let iterationNumber = 0;

  addForce('nbody', nbodyForce);
  addForce('spring', updateSpringForce);

  const publicApi = {
    bodies,
    quadTree,
    springs,
    settings,
    addForce,
    removeForce,
    getForces,

    step() {
      for (let i = 0; i < forces.length; ++i) {
        forces[i](iterationNumber);
      }
      const movement = integrate(bodies, settings.timeStep, settings.adaptiveTimeStepWeight);
      iterationNumber += 1;
      return movement;
    },

    addBody(body) {
      if (!body) throw new Error('Body is required');
      bodies.push(body);
      return body;
    },

    addBodyAt(pos) {
      if (!pos) throw new Error('Body position is required');
      const body = createBody(pos);
      bodies.push(body);
      return body;
    },

    removeBody(body) {
      if (!body) return;
      const idx = bodies.indexOf(body);
      if (idx < 0) return;
      bodies.splice(idx, 1);
      if (bodies.length === 0) {
        bounds.reset();
      }
      return true;
    },

    addSpring(body1, body2, springLength, springCoefficient) {
      if (!body1 || !body2) {
        throw new Error('Cannot add null spring to force simulator');
      }
      if (typeof springLength !== 'number') {
        springLength = -1;
      }
      const spring = new Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1);
      springs.push(spring);
      return spring;
    },

    getTotalMovement() {
      return integrate.totalMovement || 0;
    },

    removeSpring(spring) {
      if (!spring) return;
      const idx = springs.indexOf(spring);
      if (idx > -1) {
        springs.splice(idx, 1);
        return true;
      }
    },

    getBestNewBodyPosition(neighbors) {
      return bounds.getBestNewPosition(neighbors);
    },

    getBBox: getBoundingBox,
    getBoundingBox: getBoundingBox,

    invalidateBBox() {
      console.warn('invalidateBBox() is deprecated, bounds always recomputed on `getBBox()` call');
    },

    gravity(value) {
      if (value !== undefined) {
        settings.gravity = value;
        quadTree.options({gravity: value});
        return this;
      } else {
        return settings.gravity;
      }
    },

    theta(value) {
      if (value !== undefined) {
        settings.theta = value;
        quadTree.options({theta: value});
        return this;
      } else {
        return settings.theta;
      }
    },

    random: rng
  };

  expose(settings, publicApi);
  eventify(publicApi);

  return publicApi;

  function getBoundingBox() {
    bounds.update();
    return bounds.box;
  }

  function addForce(forceName, forceFunction) {
    if (forceMap.has(forceName)) throw new Error('Force ' + forceName + ' is already added');
    forceMap.set(forceName, forceFunction);
    forces.push(forceFunction);
  }

  function removeForce(forceName) {
    const forceIndex = forces.indexOf(forceMap.get(forceName));
    if (forceIndex < 0) return;
    forces.splice(forceIndex, 1);
    forceMap.delete(forceName);
  }

  function getForces() {
    return forceMap;
  }

  function nbodyForce() {
    if (bodies.length === 0) return;
    quadTree.insertBodies(bodies);
    let i = bodies.length;
    while (i--) {
      const body = bodies[i];
      if (!body.isPinned) {
        body.reset();
        quadTree.updateBodyForce(body);
        dragForce.update(body);
      }
    }
  }

  function updateSpringForce() {
    let i = springs.length;
    while (i--) {
      springForce.update(springs[i]);
    }
  }
}

// Simple Spring class
class Spring {
  constructor(fromBody, toBody, length, springCoefficient) {
    this.from = fromBody;
    this.to = toBody;
    this.length = length;
    this.coefficient = springCoefficient;
  }
}

function expose(settings, target) {
  for (const key in settings) {
    augment(settings, target, key);
  }
}

function augment(source, target, key) {
  if (!source.hasOwnProperty(key)) return;
  if (typeof target[key] === 'function') {
    return;
  }
  const sourceIsNumber = Number.isFinite(source[key]);

  if (sourceIsNumber) {
    target[key] = function (value) {
      if (value !== undefined) {
        if (!Number.isFinite(value)) throw new Error('Value of ' + key + ' should be a valid number.');
        source[key] = value;
        return target;
      }
      return source[key];
    };
  } else {
    target[key] = function (value) {
      if (value !== undefined) {
        source[key] = value;
        return target;
      }
      return source[key];
    };
  }
}