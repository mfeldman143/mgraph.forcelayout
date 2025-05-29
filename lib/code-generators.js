// lib/code-generators.js
/* eslint-disable no-new-func */
// -----------------------------------------------------------------------------
//  Code‑generation helpers for mgraph.forcelayout
//  All functions are ESM‑friendly and place helper declarations *before* they
//  are referenced inside template literals to avoid ReferenceErrors.
// -----------------------------------------------------------------------------

/**
 * Maps a zero‑based coordinate index to a variable name.
 *  0 → x, 1 → y, 2 → z, 3 → c4, 4 → c5 … (historical convention)
 */
export const getVariableName = (index) => {
  if (!Number.isInteger(index) || index < 0)
    throw new Error('Index must be a non‑negative integer');
  switch (index) {
    case 0: return 'x';
    case 1: return 'y';
    case 2: return 'z';
    default: return `c${index + 1}`; // keep original +1 offset for backward compatibility
  }
};

/**
 * Returns a tiny template helper that repeats `template` once per dimension and
 * substitutes `{var}` with the coordinate name. Options:
 *  • indent  – spaces inserted before every line after the first (default 0)
 *  • join    – string used to join the lines (default "\n")
 *  • escapeNewlines – if true, converts newlines to literal "\n" (for string
 *    literals embedded inside generated code)
 */
export const createPatternBuilder = (dimension) => {
  if (!Number.isInteger(dimension) || dimension <= 0)
    throw new Error('Dimension must be a positive integer');

  return (template, { indent = 0, join = '\n', escapeNewlines = false } = {}) => {
    const pad = ' '.repeat(indent);
    const lines = Array.from({ length: dimension }, (_, i) => {
      const prefix = i === 0 ? '' : pad;
      return prefix + template.replace(/{var}/g, getVariableName(i));
    }).join(join);
    return escapeNewlines ? lines.replace(/\n/g, '\\n') : lines;
  };
};

// -----------------------------------------------------------------------------
//  Bounds helper (computes bounding box & best new position)
// -----------------------------------------------------------------------------
export const generateBoundsFunction = (dimension) =>
  new Function('bodies', 'settings', 'random', generateBoundsFunctionBody(dimension));

export const generateBoundsFunctionBody = (dimension) => {
  const p = createPatternBuilder(dimension);
  return `
  const boundingBox = {
    ${p('min_{var}: 0, max_{var}: 0,', { indent: 4 })}
  };
  
  return {
    box: boundingBox,
    update: updateBoundingBox,
    reset: resetBoundingBox,
    getBestNewPosition(neighbors) {
      let ${p('base_{var} = 0', { join: ', ' })};
  
      if (neighbors.length) {
        for (let i = 0; i < neighbors.length; ++i) {
          const pos = neighbors[i].pos;
          ${p('base_{var} += pos.{var};', { indent: 10 })}
        }
        ${p('base_{var} /= neighbors.length;', { indent: 8 })}
      } else {
        ${p('base_{var} = (boundingBox.min_{var} + boundingBox.max_{var}) / 2;', { indent: 8 })}
      }
  
      const len = settings.springLength;
      return {
        ${p('{var}: base_{var} + (random.nextDouble() - 0.5) * len,', { indent: 8 })}
      };
    }
  };

  function updateBoundingBox() {
    if (!bodies.length) return;
    ${p('let min_{var} =  Infinity;', { indent: 4 })}
    ${p('let max_{var} = -Infinity;', { indent: 4 })}
    for (let i = 0, l = bodies.length; i < l; ++i) {
      const pos = bodies[i].pos;
      ${p('if (pos.{var} < min_{var}) min_{var} = pos.{var};', { indent: 6 })}
      ${p('if (pos.{var} > max_{var}) max_{var} = pos.{var};', { indent: 6 })}
    }
    ${p('boundingBox.min_{var} = min_{var};', { indent: 4 })}
    ${p('boundingBox.max_{var} = max_{var};', { indent: 4 })}
  }

  function resetBoundingBox() {
    ${p('boundingBox.min_{var} = boundingBox.max_{var} = 0;', { indent: 4 })}
  }
  `;
};

// -----------------------------------------------------------------------------
//  Body & Vector generators
// -----------------------------------------------------------------------------
export const generateCreateBodyFunction = (dimension, debugSetters = false) => {
  const code = generateCreateBodyFunctionBody(dimension, debugSetters);
  return new Function(code)().Body; // extract constructor
};

export const generateCreateBodyFunctionBody = (dimension, debugSetters) => {
  const p = createPatternBuilder(dimension);

  // --- Vector ---------------------------------------------------------------
  const vectorCode = (() => {
    const setters = debugSetters ? Array.from({ length: dimension }, (_, i) => {
      const v = getVariableName(i);
      return `
    let _${v};
    Object.defineProperty(this, '${v}', {
      get: () => _${v},
      set: (val) => { if (!Number.isFinite(val)) throw new Error('Non‑finite ${v}'); _${v} = val; }
    });`;
    }).join('') : '';

    return `function Vector(${p('{var}', { join: ', ' })}) {
  ${setters}
  if (typeof arguments[0] === 'object') {
    const src = arguments[0];
    ${p('this.{var} = src.{var};', { indent: 4 })}
  } else {
    ${p('this.{var} = Number.isFinite({var}) ? {var} : 0;', { indent: 4 })}
  }
}
Vector.prototype.reset = function () { ${p('this.{var} = 0;', { join: ' ' })} };`;
  })();

  // --- Body ----------------------------------------------------------------
  const bodyCode = `function Body(${p('{var}', { join: ', ' })}) {
  this.isPinned = false;
  this.pos      = new Vector(${p('{var}', { join: ', ' })});
  this.force    = new Vector();
  this.velocity = new Vector();
  this.mass     = 1;
  this.springCount  = 0;
  this.springLength = 0;
}
Body.prototype.reset = function () {
  this.force.reset();
  this.springCount  = 0;
  this.springLength = 0;
};
Body.prototype.setPosition = function(${p('{var}', { join: ', ' })}) {
  ${p('this.pos.{var} = Number.isFinite({var}) ? {var} : 0;', { indent: 2 })}
};`;

  return `${vectorCode}\n${bodyCode}\nreturn { Body, Vector };`;
};

// -----------------------------------------------------------------------------
//  Drag & Spring force generators
// -----------------------------------------------------------------------------
export const generateCreateDragForceFunction = (dimension) =>
  new Function('options', generateCreateDragForceFunctionBody(dimension));

export const generateCreateDragForceFunctionBody = (dimension) => {
  const p = createPatternBuilder(dimension);
  return `
  if (!Number.isFinite(options.dragCoefficient))
    throw new Error('dragCoefficient must be finite');
  return {
    update(body) {
      ${p('body.force.{var} -= options.dragCoefficient * body.velocity.{var};', { indent: 6 })}
    }
  };`;
};

export const generateCreateSpringForceFunction = (dimension) =>
  new Function('options', 'random', generateCreateSpringForceFunctionBody(dimension));

export const generateCreateSpringForceFunctionBody = (dimension) => {
  const p = createPatternBuilder(dimension);
  return `
  if (!Number.isFinite(options.springCoefficient)) throw new Error('springCoefficient must be finite');
  if (!Number.isFinite(options.springLength))      throw new Error('springLength must be finite');

  return {
    update(spring) {
      const b1 = spring.from;
      const b2 = spring.to;
      const len = spring.length < 0 ? options.springLength : spring.length;
      ${p('let d{var} = b2.pos.{var} - b1.pos.{var};', { indent: 6 })}
      let r = Math.hypot(${p('d{var}', { join: ', ' })});
      if (r === 0) {
        ${p('d{var} = (random.nextDouble() - 0.5) / 50;', { indent: 8 })}
        r = Math.hypot(${p('d{var}', { join: ', ' })});
      }
      const delta = r - len;
      const k = (spring.coefficient > 0 ? spring.coefficient : options.springCoefficient) * delta / r;
      ${p('b1.force.{var} += k * d{var};', { indent: 6 })}
      b1.springCount  += 1;
      b1.springLength += r;
      ${p('b2.force.{var} -= k * d{var};', { indent: 6 })}
      b2.springCount  += 1;
      b2.springLength += r;
    }
  };`;
};

// -----------------------------------------------------------------------------
//  Integrator generator (Euler with optional adaptive dt)
// -----------------------------------------------------------------------------
export const generateIntegratorFunction = (dimension) =>
  new Function('bodies', 'timeStep', 'adaptiveTimeStepWeight', generateIntegratorFunctionBody(dimension));

export const generateIntegratorFunctionBody = (dimension) => {
  const p = createPatternBuilder(dimension);
  return `
  const n = bodies.length;
  if (!n) return 0;
  ${p('let d{var} = 0, t{var} = 0;', { indent: 2 })}
  for (let i = 0; i < n; ++i) {
    const body = bodies[i];
    if (body.isPinned) continue;
    let dt = timeStep;
    if (adaptiveTimeStepWeight && body.springCount)
      dt = adaptiveTimeStepWeight * body.springLength / body.springCount;
    const coeff = dt / body.mass;
    ${p('body.velocity.{var} += coeff * body.force.{var};', { indent: 4 })}
    ${p('const v{var} = body.velocity.{var};', { indent: 4 })}
    const v = Math.hypot(${p('v{var}', { join: ', ' })});
    if (v > 1) {
      const inv = 1 / v;
      ${p('body.velocity.{var} *= inv;', { indent: 6 })}
    }
    ${p('d{var} = dt * body.velocity.{var};', { indent: 4 })}
    ${p('body.pos.{var} += d{var};', { indent: 4 })}
    ${p('t{var} += Math.abs(d{var});', { indent: 4 })}
  }
  return (${p('t{var} * t{var}', { join: ' + ' })}) / n;`;
};

// -----------------------------------------------------------------------------
//  QuadTree generator (Barnes–Hut, k‑D generalisation)
// -----------------------------------------------------------------------------
export const generateQuadTreeFunction = (dimension) =>
  new Function(generateQuadTreeFunctionBody(dimension));

export const generateQuadTreeFunctionBody = (dimension) => {
  /* -------------------------------------------------------------------------
     Helper utilities declared **before** string interpolation ↓            
  ------------------------------------------------------------------------- */
  const quadCount = 2 ** dimension;
  const p = createPatternBuilder(dimension);

  const assignQuads = (indent, count) => Array.from({ length: count }, (_, i) => `${indent}quad${i} = null;`).join('\n');

  const assignInsertionQuadIndex = (indent) => {
    const pad = ' '.repeat(indent);
    return Array.from({ length: dimension }, (_, i) => {
      const v = getVariableName(i);
      return `${pad}if (${v} > max_${v}) {\n` +
             `${pad}  quadIdx += ${2 ** i};\n` +
             `${pad}  min_${v} = max_${v};\n` +
             `${pad}  max_${v} = node.max_${v};\n` +
             `${pad}}`;
    }).join('\n');
  };

  const runRecursiveOnChildren = () => {
    const pad = ' '.repeat(11);
    return Array.from({ length: quadCount }, (_, i) => `${pad}if (node.quad${i}) {\n` +
                                                     `${pad}  queue[pushIdx++] = node.quad${i};\n` +
                                                     `${pad}  queueLength++;\n` +
                                                     `${pad}}`).join('\n');
  };

  /* -------------------------------------------------------------------------
     Now build the giant template string that produces the factory function
  ------------------------------------------------------------------------- */
  return `
${getInsertStackCode()}
${getQuadNodeCode()}
${getUtilityFns()}
${getChildFns()}

function createQuadTree(options = {}, random) {
  let gravity = typeof options.gravity === 'number' ? options.gravity : -1;
  let theta   = typeof options.theta   === 'number' ? options.theta   : 0.8;
  const updateQueue = [];
  const insertStack = new InsertStack();
  const nodesCache  = [];
  let currentInCache = 0;
  let root = newNode();

  return { insertBodies, getRoot: () => root, updateBodyForce: update, options: opts };

  function opts(newOpts) {
    if (newOpts) {
      if (typeof newOpts.gravity === 'number') gravity = newOpts.gravity;
      if (typeof newOpts.theta   === 'number') theta   = newOpts.theta;
      return this;
    }
    return { gravity, theta };
  }

  function newNode() {
    let node = nodesCache[currentInCache];
    if (node) {
${assignQuads('      node.', quadCount)}
      node.body = null;
      node.mass = ${p('node.mass_{var} = ', { join: '' })}0;
      ${p('node.min_{var} = node.max_{var} = 0;', { indent: 6 })}
    } else {
      node = new QuadNode();
      nodesCache[currentInCache] = node;
    }
    currentInCache++;
    return node;
  }

  ${getUpdateFn()}
  ${getInsertBodiesFn()}
}

return createQuadTree;`;

  // -------------------------------------------------------------------------
  //  Template sub‑sections (helpers inside the returned string)               
  // -------------------------------------------------------------------------

  function getInsertStackCode() {
    return `
function InsertStack() { this.stack = []; this.popIdx = 0; }
InsertStack.prototype = {
  isEmpty()  { return this.popIdx === 0; },
  push(node, body) {
    const item = this.stack[this.popIdx] || (this.stack[this.popIdx] = {});
    item.node = node; item.body = body; this.popIdx++; },
  pop()      { return this.popIdx ? this.stack[--this.popIdx] : undefined; },
  reset()    { this.popIdx = 0; }
};`;
  }

  function getQuadNodeCode() {
    return `
function QuadNode() {
  this.body = null;
${assignQuads('  this.', quadCount)}
  this.mass = 0;
  ${p('this.mass_{var} = 0;', { indent: 2 })}
  ${p('this.min_{var} = 0; this.max_{var} = 0;', { indent: 2, join: '\n  ' })}
}`;
  }

  function getUtilityFns() {
    return `
function isSamePosition(p1, p2) {
  return ${p('Math.abs(p1.{var} - p2.{var}) < 1e-8', { join: ' && ' })};
}`;
  }

  function getChildFns() {
    const getChild = `function getChild(node, idx) {
${Array.from({ length: quadCount }, (_, i) => `  if (idx === ${i}) return node.quad${i};`).join('\n')}
  return null; }`;
    const setChild = `function setChild(node, idx, child) {
${Array.from({ length: quadCount }, (_, i) => `${i ? '  else ' : '  '}if (idx === ${i}) node.quad${i} = child;`).join('\n')} }`;
    return `${getChild}\n${setChild}`;
  }

  function getUpdateFn() {
    return `
function update(sourceBody) {
  const queue = updateQueue;
  let queueLength = 1, shiftIdx = 0, pushIdx = 1;
  queue[0] = root;
  ${p('let f{var} = 0;', { indent: 2 })}
  while (queueLength) {
    const node = queue[shiftIdx++];
    queueLength--;
    const body = node.body;
    const different = body && body !== sourceBody;
    ${p('let d{var};', { indent: 4 })}
    let r, v;
    if (different) {
      ${p('d{var} = body.pos.{var} - sourceBody.pos.{var};', { indent: 6 })}
      r = Math.hypot(${p('d{var}', { join: ', ' })});
      if (r === 0) { ${p('d{var} = (Math.random() - 0.5) / 50;', { indent: 8 })} r = Math.hypot(${p('d{var}', { join: ', ' })}); }
      v = gravity * body.mass * sourceBody.mass / (r ** 3);
      ${p('f{var} += v * d{var};', { indent: 6 })}
    } else if (node.body !== sourceBody) {
      ${p('d{var} = node.mass_{var} / node.mass - sourceBody.pos.{var};', { indent: 6 })}
      r = Math.hypot(${p('d{var}', { join: ', ' })});
      if (r === 0) { ${p('d{var} = (Math.random() - 0.5) / 50;', { indent: 8 })} r = Math.hypot(${p('d{var}', { join: ', ' })}); }
      if ((node.max_${getVariableName(0)} - node.min_${getVariableName(0)}) / r < theta) {
        v = gravity * node.mass * sourceBody.mass / (r ** 3);
        ${p('f{var} += v * d{var};', { indent: 8 })}
      } else {
${runRecursiveOnChildren()}
      }
    }
  }
  ${p('sourceBody.force.{var} += f{var};', { indent: 2 })}
}`;
  }

  function getInsertBodiesFn() {
    return `
function insertBodies(bodies) {
  ${p('let {var}min =  Infinity, {var}max = -Infinity;', { indent: 2 })}
  for (let i = 0; i < bodies.length; ++i) {
    const pos = bodies[i].pos;
    ${p('if (pos.{var} < {var}min) {var}min = pos.{var};', { indent: 4 })}
    ${p('if (pos.{var} > {var}max) {var}max = pos.{var};', { indent: 4 })}
  }
  let maxSideLength = 0;
  ${p('if ({var}max - {var}min > maxSideLength) maxSideLength = {var}max - {var}min;', { indent: 2 })}
  currentInCache = 0;
  root = newNode();
  ${p('root.min_{var} = {var}min;', { indent: 2 })}
  ${p('root.max_{var} = {var}min + maxSideLength;', { indent: 2 })}
  for (let i = bodies.length - 1; i >= 0; --i) insert(bodies[i], root);
}

function insert(newBody, startNode) {
  insertStack.reset(); insertStack.push(startNode, newBody);
  while (!insertStack.isEmpty()) {
    const { node, body } = insertStack.pop();
    if (!node.body) {
      ${p('const {var} = body.pos.{var};', { indent: 6 })}
      node.mass += body.mass;
      ${p('node.mass_{var} += body.mass * {var};', { indent: 6 })}
      let quadIdx = 0;
      ${p('let min_{var} = node.min_{var};', { indent: 6 })}
      ${p('let max_{var} = (min_{var} + node.max_{var}) / 2;', { indent: 6 })}
${assignInsertionQuadIndex(6)}
      let child = getChild(node, quadIdx);
      if (!child) {
        child = newNode();
        ${p('child.min_{var} = min_{var};', { indent: 8 })}
        ${p('child.max_{var} = max_{var};', { indent: 8 })}
        child.body = body;
        setChild(node, quadIdx, child);
      } else {
        insertStack.push(child, body);
      }
    } else {
      const oldBody = node.body;
      node.body = null;
      if (isSamePosition(oldBody.pos, body.pos)) {
        for (let retries = 3; retries-- && isSamePosition(oldBody.pos, body.pos);) {
          const off = Math.random();
          ${p('const d{var} = (node.max_{var} - node.min_{var}) * off;', { indent: 10 })}
          ${p('oldBody.pos.{var} = node.min_{var} + d{var};', { indent: 10 })}
        }
      }
      insertStack.push(node, oldBody);
      insertStack.push(node, body);
    }
  }
}`;
  }
};
