/**
 * A modern implementation of code generators for mgraph.forcelayout.
 * This module consolidates the original eight files:
 *   - getVariableName.ts
 *   - createPatternBuilder.ts
 *   - generateBounds.ts
 *   - generateCreateBody.ts
 *   - generateCreateDragForce.ts
 *   - generateCreateSpringForce.ts
 *   - generateIntegrator.ts
 *   - generateQuadTree.ts
 *
 * Enhancements include:
 *  - TypeScript type definitions.
 *  - Input validation for the dimension parameter.
 *  - Extended placeholder support: both `{var}` and `{i}`.
 *  - Additional error handling.
 */
/* -------------------- Utility Functions -------------------- */
/**
 * Returns a coordinate name for a given dimension index.
 */
export function getVariableName(index) {
    if (!Number.isInteger(index) || index < 0) {
        throw new Error("Index must be a non-negative integer");
    }
    if (index === 0)
        return 'x';
    if (index === 1)
        return 'y';
    if (index === 2)
        return 'z';
    return 'c' + (index + 1);
}
/**
 * Returns a pattern builder function for a given dimension.
 * It replaces `{var}` with the coordinate name (e.g. x, y, z, etc.) and `{i}` with the index.
 */
export function createPatternBuilder(dimension) {
    if (!Number.isInteger(dimension) || dimension < 1) {
        throw new Error("Dimension must be a positive integer");
    }
    return function pattern(template, config = {}) {
        const indent = config.indent ? ' '.repeat(config.indent) : '';
        const join = config.join ?? '\n';
        const parts = [];
        for (let i = 0; i < dimension; i++) {
            const variableName = getVariableName(i);
            let str = template.replace(/{var}/g, variableName).replace(/{i}/g, i.toString());
            const prefix = i === 0 ? '' : indent;
            parts.push(prefix + str);
        }
        return parts.join(join);
    };
}
/* -------------------- BOUNDS GENERATION -------------------- */
/**
 * Generates and returns a function that computes bounds.
 */
export function generateBoundsFunction(dimension) {
    const code = generateBoundsFunctionBody(dimension);
    try {
        return new Function('bodies', 'settings', 'random', code);
    }
    catch (e) {
        throw new Error("Error generating bounds function: " + e);
    }
}
/**
 * Returns the source code for the bounds function.
 */
export function generateBoundsFunctionBody(dimension) {
    const pattern = createPatternBuilder(dimension);
    // Generate an object literal with comma-separated properties.
    return `
const boundingBox = {
  ${pattern('min_{var}: 0', { join: ',\n' })},
  ${pattern('max_{var}: 0', { join: ',\n' })}
};

return {
  box: boundingBox,
  update: updateBoundingBox,
  reset: resetBoundingBox,
  
  getBestNewPosition(neighbors) {
    ${pattern('let base_{var} = 0', { join: ';\n' })}
    if (neighbors.length) {
      for (const neighbor of neighbors) {
        const neighborPos = neighbor.pos;
        ${pattern('base_{var} += neighborPos.{var}', { indent: 8 })}
      }
      ${pattern('base_{var} /= neighbors.length', { indent: 6 })}
    } else {
      ${pattern('base_{var} = (boundingBox.min_{var} + boundingBox.max_{var}) / 2', { indent: 6 })}
    }
    const { springLength } = settings;
    return {
      ${pattern('{var}: base_{var} + (random.nextDouble() - 0.5) * springLength', { indent: 6, join: ',\n' })}
    };
  }
};

function updateBoundingBox() {
  if (bodies.length === 0) return;
  ${pattern('let max_{var} = -Infinity;', { indent: 2 })}
  ${pattern('let min_{var} = Infinity;', { indent: 2 })}
  for (const body of bodies) {
    const pos = body.pos;
    ${pattern('if (pos.{var} < min_{var}) min_{var} = pos.{var};', { indent: 4 })}
    ${pattern('if (pos.{var} > max_{var}) max_{var} = pos.{var};', { indent: 4 })}
  }
  ${pattern('boundingBox.min_{var} = min_{var};', { indent: 2 })}
  ${pattern('boundingBox.max_{var} = max_{var};', { indent: 2 })}
}

function resetBoundingBox() {
  ${pattern('boundingBox.min_{var} = boundingBox.max_{var} = 0;', { indent: 2 })}
}
`;
}
/* -------------------- BODY & VECTOR GENERATION -------------------- */
/**
 * Generates and returns a Body class.
 */
export function generateCreateBodyFunction(dimension, debugSetters = false) {
    const code = generateCreateBodyFunctionBody(dimension, debugSetters);
    try {
        const generated = new Function(code)();
        if (!generated.Body) {
            throw new Error("Generated code did not return a Body class");
        }
        return generated.Body;
    }
    catch (e) {
        throw new Error("Error generating Body class: " + e);
    }
}
/**
 * Returns the source code for the Body and Vector classes.
 */
export function generateCreateBodyFunctionBody(dimension, debugSetters = false) {
    return `
${getVectorCode(dimension, debugSetters)}
${getBodyCode(dimension)}
return { Body, Vector };
`;
}
/**
 * Returns the source code for the Body class.
 * Now, Body exposes getters and setters for each coordinate (delegating to this.pos),
 * so that assignments like body.x = 'not a number' go through the Vector setters.
 */
function getBodyCode(dimension) {
    const pattern = createPatternBuilder(dimension);
    const variableList = pattern('{var}', { join: ', ' });
    return `
class Body {
  constructor(${variableList}) {
    this.isPinned = false;
    this.pos = new Vector(${variableList});
    this.force = new Vector(${variableList});
    this.velocity = new Vector(${variableList});
    this.mass = 1;
    this.springCount = 0;
    this.springLength = 0;
  }
  reset() {
    this.force.reset();
    this.springCount = 0;
    this.springLength = 0;
  }
  setPosition(${variableList}) {
    ${pattern('this.pos.{var} = {var} ?? 0;', { indent: 4 })}
  }
  ${pattern('get {var}() { return this.pos.{var}; }', { indent: 2 })}
  ${pattern('set {var}(val) { this.pos.{var} = val; }', { indent: 2 })}
}
`;
}
/**
 * Returns the source code for the Vector class.
 * When debugSetters is true, it defines getters and setters using Object.defineProperty.
 */
function getVectorCode(dimension, debugSetters) {
    const pattern = createPatternBuilder(dimension);
    const variableList = pattern('{var}', { join: ', ' });
    if (debugSetters) {
        // Use Object.defineProperty so that non-number assignments trigger an error.
        let code = `class Vector {
  constructor(${variableList}) {
    if (typeof arguments[0] === 'object') {
      const v = arguments[0];
      ${pattern('this._{var} = v.{var};', { indent: 6 })}
    } else {
      ${pattern('this._{var} = typeof {var} === "number" ? {var} : 0;', { indent: 6 })}
    }
`;
        for (let i = 0; i < dimension; i++) {
            const varName = getVariableName(i);
            code += `
    Object.defineProperty(this, '${varName}', {
      get() { return this._${varName}; },
      set(val) {
        if (!Number.isFinite(val)) throw new Error('Cannot set non-number to ${varName}');
        this._${varName} = val;
      },
      configurable: true,
      enumerable: true
    });
`;
        }
        code += `
  }
  reset() {
    ${pattern('this.{var} = 0;', { indent: 4 })}
  }
}
`;
        return code;
    }
    else {
        return `class Vector {
  constructor(${variableList}) {
    if (typeof arguments[0] === 'object') {
      const v = arguments[0];
      ${pattern('this.{var} = v.{var};', { indent: 4 })}
    } else {
      ${pattern('this.{var} = typeof {var} === "number" ? {var} : 0;', { indent: 4 })}
    }
  }
  reset() {
    ${pattern('this.{var} = 0;', { indent: 2 })}
  }
}`;
    }
}
/* -------------------- DRAG FORCE GENERATION -------------------- */
/**
 * Generates a function for drag force.
 */
export function generateCreateDragForceFunction(dimension) {
    const code = generateCreateDragForceFunctionBody(dimension);
    try {
        return new Function('options', code);
    }
    catch (e) {
        throw new Error("Error generating drag force function: " + e);
    }
}
/**
 * Returns the source code for drag force generation.
 */
export function generateCreateDragForceFunctionBody(dimension) {
    const pattern = createPatternBuilder(dimension);
    return `
if (!Number.isFinite(options.dragCoefficient)) {
  throw new Error('dragCoefficient must be a finite number');
}
return {
  update(body) {
    ${pattern('body.force.{var} -= options.dragCoefficient * body.velocity.{var};', { indent: 4 })}
  }
};
`;
}
/* -------------------- SPRING FORCE GENERATION -------------------- */
/**
 * Generates a function for spring force.
 */
export function generateCreateSpringForceFunction(dimension) {
    const code = generateCreateSpringForceFunctionBody(dimension);
    try {
        return new Function('options', 'random', code);
    }
    catch (e) {
        throw new Error("Error generating spring force function: " + e);
    }
}
/**
 * Returns the source code for spring force generation.
 */
export function generateCreateSpringForceFunctionBody(dimension) {
    const pattern = createPatternBuilder(dimension);
    return `
if (!Number.isFinite(options.springCoefficient)) {
  throw new Error('Spring coefficient must be a finite number');
}
if (!Number.isFinite(options.springLength)) {
  throw new Error('Spring length must be a finite number');
}
return {
  update(spring) {
    const { from: body1, to: body2 } = spring;
    const length = spring.length < 0 ? options.springLength : spring.length;
    ${pattern('const d{var} = body2.pos.{var} - body1.pos.{var};', { indent: 4 })}
    let r = Math.sqrt(${pattern('d{var} * d{var}', { join: ' + ' })});
    if (r === 0) {
      ${pattern('d{var} = (random.nextDouble() - 0.5) / 50;', { indent: 6 })}
      r = Math.sqrt(${pattern('d{var} * d{var}', { join: ' + ' })});
    }
    const d = r - length;
    const coefficient = ((spring.coefficient > 0) ? spring.coefficient : options.springCoefficient) * d / r;
    ${pattern('body1.force.{var} += coefficient * d{var};', { indent: 4 })}
    body1.springCount++;
    body1.springLength += r;
    ${pattern('body2.force.{var} -= coefficient * d{var};', { indent: 4 })}
    body2.springCount++;
    body2.springLength += r;
  }
};
`;
}
/* -------------------- INTEGRATOR GENERATION -------------------- */
/**
 * Generates a function for integrating forces.
 */
export function generateIntegratorFunction(dimension) {
    const code = generateIntegratorFunctionBody(dimension);
    try {
        return new Function('bodies', 'timeStep', 'adaptiveTimeStepWeight', code);
    }
    catch (e) {
        throw new Error("Error generating integrator function: " + e);
    }
}
/**
 * Returns the source code for the integrator function.
 */
export function generateIntegratorFunctionBody(dimension) {
    const pattern = createPatternBuilder(dimension);
    return `
if (bodies.length === 0) return 0;
${pattern('let d{var} = 0, t{var} = 0;', { indent: 2 })}
for (const body of bodies) {
  if (body.isPinned) continue;
  let step = timeStep;
  if (adaptiveTimeStepWeight && body.springCount) {
    step = adaptiveTimeStepWeight * body.springLength / body.springCount;
  }
  const coeff = step / body.mass;
  ${pattern('body.velocity.{var} += coeff * body.force.{var};', { indent: 2 })}
  ${pattern('const v{var} = body.velocity.{var};', { indent: 2 })}
  const velocity = Math.sqrt(${pattern('v{var} * v{var}', { join: ' + ' })});
  if (velocity > 1) {
    ${pattern('body.velocity.{var} = v{var} / velocity;', { indent: 4 })}
  }
  ${pattern('d{var} = step * body.velocity.{var};', { indent: 2 })}
  ${pattern('body.pos.{var} += d{var};', { indent: 2 })}
  ${pattern('t{var} += Math.abs(d{var});', { indent: 2 })}
}
return (${pattern('t{var} * t{var}', { join: ' + ' })}) / bodies.length;
`;
}
/* -------------------- QUADTREE GENERATION -------------------- */
/**
 * Generates a quad tree function for the given dimension.
 */
export function generateQuadTreeFunction(dimension) {
    const code = generateQuadTreeFunctionBody(dimension);
    try {
        return new Function(code)();
    }
    catch (e) {
        throw new Error("Error generating quad tree function: " + e);
    }
}
/**
 * Returns the source code for quad tree generation.
 * A return statement at the end calls createQuadTree so that a valid instance is returned.
 */
export function generateQuadTreeFunctionBody(dimension) {
    const pattern = createPatternBuilder(dimension);
    const quadCount = Math.pow(2, dimension);
    return `
${getInsertStackCode()}
${getQuadNodeCode(dimension)}
${getPositionComparisonCode(dimension)}
${getChildOperationsCode(dimension)}

function createQuadTree(options = {}, random) {
  const settings = {
    gravity: typeof options.gravity === 'number' ? options.gravity : -1,
    theta: typeof options.theta === 'number' ? options.theta : 0.8
  };
  const updateQueue = [];
  const insertStack = new InsertStack();
  const nodesCache = [];
  let currentInCache = 0;
  let root = newNode();
  
  return {
    insertBodies,
    getRoot: () => root,
    updateBodyForce: update,
    options: handleOptions
  };
  
  function handleOptions(newOptions) {
    if (!newOptions) return { ...settings };
    if (typeof newOptions.gravity === 'number') settings.gravity = newOptions.gravity;
    if (typeof newOptions.theta === 'number') settings.theta = newOptions.theta;
    return this;
  }
  
  function newNode() {
    let node = nodesCache[currentInCache];
    if (node) {
      resetNode(node);
    } else {
      node = new QuadNode();
      nodesCache[currentInCache] = node;
    }
    currentInCache++;
    return node;
  }
  
  function resetNode(node) {
    ${pattern('node.quad{var} = null;', { indent: 4 })}
    node.body = null;
    node.mass = ${pattern('node.mass_{var} = ', { join: '' })}0;
    ${pattern('node.min_{var} = node.max_{var} = ', { join: '' })}0;
  }
  
  function update(sourceBody) {
    const queue = [];
    ${pattern('let f{var} = 0;', { indent: 4 })}
    let queueLength = 1;
    let shiftIdx = 0;
    let pushIdx = 1;
    queue[0] = root;
  
    while (queueLength) {
      const node = queue[shiftIdx++];
      queueLength--;
      const body = node.body;
      if (!body || body === sourceBody) continue;
      ${pattern('const d{var} = body.pos.{var} - sourceBody.pos.{var};', { indent: 6 })}
      let r = Math.sqrt(${pattern('d{var} * d{var}', { join: ' + ' })});
      if (r === 0) {
        ${pattern('d{var} = (random.nextDouble() - 0.5) / 50;', { indent: 8 })}
        r = Math.sqrt(${pattern('d{var} * d{var}', { join: ' + ' })});
      }
      const v = settings.gravity * body.mass * sourceBody.mass / (r * r * r);
      ${pattern('f{var} += v * d{var};', { indent: 6 })}
      for (let i = 0; i < ${quadCount}; i++) {
        const child = node[\`quad\${i}\`];
        if (child) {
          queue[pushIdx++] = child;
          queueLength++;
        }
      }
    }
    ${pattern('sourceBody.force.{var} += f{var};', { indent: 4 })}
  }
  
  function insertBodies(bodies) {
    if (!bodies.length) return;
    ${pattern('let {var}min = Number.MAX_VALUE;', { indent: 2 })}
    ${pattern('let {var}max = Number.MIN_VALUE;', { indent: 2 })}
    for (const body of bodies) {
      const pos = body.pos;
      ${pattern('if (pos.{var} < {var}min) {var}min = pos.{var};', { indent: 4 })}
      ${pattern('if (pos.{var} > {var}max) {var}max = pos.{var};', { indent: 4 })}
    }
    let maxSideLength = -Infinity;
    ${pattern('if ({var}max - {var}min > maxSideLength) maxSideLength = {var}max - {var}min;', { indent: 2 })}
    currentInCache = 0;
    root = newNode();
    ${pattern('root.min_{var} = {var}min;', { indent: 2 })}
    ${pattern('root.max_{var} = {var}min + maxSideLength;', { indent: 2 })}
    for (let i = bodies.length - 1; i >= 0; i--) {
      if (i === bodies.length - 1) {
        root.body = bodies[i];
      } else {
        insert(bodies[i]);
      }
    }
  
    function insert(newBody) {
      insertStack.reset();
      insertStack.push(root, newBody);
      while (!insertStack.isEmpty()) {
        const { node, body } = insertStack.pop();
        if (!node.body) {
          ${pattern('const {var} = body.pos.{var};', { indent: 8 })}
          node.mass += body.mass;
          ${pattern('node.mass_{var} += body.mass * {var};', { indent: 8 })}
          let quadIdx = 0;
          ${pattern('let min_{var} = node.min_{var};', { indent: 8 })}
          ${pattern('let max_{var} = (min_{var} + node.max_{var}) / 2;', { indent: 8 })}
          ${pattern(`
          if ({var} > max_{var}) {
            quadIdx += Math.pow(2, {i});
            min_{var} = max_{var};
            max_{var} = node.max_{var};
          }`, { indent: 8 })}
          let child = getChild(node, quadIdx);
          if (!child) {
            child = newNode();
            ${pattern('child.min_{var} = min_{var};', { indent: 10 })}
            ${pattern('child.max_{var} = max_{var};', { indent: 10 })}
            child.body = body;
            setChild(node, quadIdx, child);
          } else {
            insertStack.push(child, body);
          }
        } else {
          const oldBody = node.body;
          node.body = null;
          if (isSamePosition(oldBody.pos, body.pos)) {
            let retriesCount = 3;
            do {
              const offset = random.nextDouble();
              ${pattern('const d{var} = (node.max_{var} - node.min_{var}) * offset;', { indent: 12 })}
              ${pattern('oldBody.pos.{var} = node.min_{var} + d{var};', { indent: 12 })}
              retriesCount--;
            } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));
  
            if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
              return;
            }
          }
          insertStack.push(node, oldBody);
          insertStack.push(node, body);
        }
      }
    }
  }
}

return createQuadTree({}, { nextDouble: () => Math.random() });
`;
}
/* -------------------- QUADTREE HELPER FUNCTIONS -------------------- */
/**
 * Returns the source code for the QuadNode class.
 * (All TypeScript annotations have been removed so that the generated code is valid JavaScript.)
 */
function getQuadNodeCode(dimension) {
    const pattern = createPatternBuilder(dimension);
    const quadCount = Math.pow(2, dimension);
    return `
class QuadNode {
  constructor() {
    this.body = null;
    this.mass = 0;
    ${pattern('this.mass_{var} = 0;', { indent: 4 })}
    ${pattern('this.min_{var} = 0;', { indent: 4 })}
    ${pattern('this.max_{var} = 0;', { indent: 4 })}
    ${Array.from({ length: quadCount }, (_, i) => `this.quad${i} = null;`).join('\n    ')}
  }
}
`;
}
/**
 * Returns the source code for comparing positions.
 */
function getPositionComparisonCode(dimension) {
    const pattern = createPatternBuilder(dimension);
    return `
function isSamePosition(point1, point2) {
  ${pattern('const d{var} = Math.abs(point1.{var} - point2.{var});', { indent: 2 })}
  return ${pattern('d{var} < 1e-8', { join: ' && ' })};
}
`;
}
/**
 * Returns the source code for child operations (getChild and setChild).
 */
function getChildOperationsCode(dimension) {
    const quadCount = Math.pow(2, dimension);
    let lines = [];
    lines.push(`function getChild(node, idx) {`);
    for (let i = 0; i < quadCount; i++) {
        lines.push(`  if (idx === ${i}) return node.quad${i};`);
    }
    lines.push(`  return null;`);
    lines.push(`}`);
    lines.push(`function setChild(node, idx, child) {`);
    for (let i = 0; i < quadCount; i++) {
        if (i === 0) {
            lines.push(`  if (idx === ${i}) node.quad${i} = child;`);
        }
        else {
            lines.push(`  else if (idx === ${i}) node.quad${i} = child;`);
        }
    }
    lines.push(`}`);
    return lines.join('\n');
}
/**
 * Returns the source code for the InsertStack helper classes.
 */
function getInsertStackCode() {
    return `
class InsertStackElement {
  constructor(node, body) {
    this.node = node;
    this.body = body;
  }
}

class InsertStack {
  constructor() {
    this._stack = [];
    this._popIdx = 0;
  }
  isEmpty() {
    return this._popIdx === 0;
  }
  push(node, body) {
    if (this._popIdx >= this._stack.length) {
      this._stack.push(new InsertStackElement(node, body));
    } else {
      const item = this._stack[this._popIdx];
      item.node = node;
      item.body = body;
    }
    this._popIdx++;
  }
  pop() {
    return this._popIdx > 0 ? this._stack[--this._popIdx] : undefined;
  }
  reset() {
    this._popIdx = 0;
  }
}
`;
}
/* -------------------- Export QuadTree Helper Functions -------------------- */
export { getInsertStackCode, getQuadNodeCode, getPositionComparisonCode, getChildOperationsCode };
