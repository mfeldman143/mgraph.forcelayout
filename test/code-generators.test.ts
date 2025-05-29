// test/code-generators.test.ts
import { describe, test, expect } from 'vitest';
import { 
  getVariableName,
  createPatternBuilder,
  generateBoundsFunction,
  generateCreateBodyFunction,
  generateCreateDragForceFunction,
  generateCreateSpringForceFunction,
  generateIntegratorFunction,
  generateQuadTreeFunction
} from '../lib/code-generators';

describe('Code Generators Module', () => {
  describe('getVariableName', () => {
    test('returns correct coordinate names', () => {
      expect(getVariableName(0)).toBe('x');
      expect(getVariableName(1)).toBe('y');
      expect(getVariableName(2)).toBe('z');
      expect(getVariableName(3)).toBe('c4');
      expect(getVariableName(4)).toBe('c5');
    });

    test('throws error on negative index', () => {
      expect(() => getVariableName(-1)).toThrow();
    });
  });

  describe('createPatternBuilder', () => {
    test('creates correct pattern for 2D', () => {
      const pattern = createPatternBuilder(2);
      expect(pattern('pos.{var}')).toBe('pos.x\npos.y');
      expect(pattern('pos.{var}', { join: ', ' })).toBe('pos.x, pos.y');
      expect(pattern('pos.{var}', { indent: 2 })).toBe('pos.x\n  pos.y');
    });

    test('creates correct pattern for 3D', () => {
      const pattern = createPatternBuilder(3);
      expect(pattern('pos.{var}', { join: ', ' })).toBe('pos.x, pos.y, pos.z');
    });

    test('throws error for invalid dimension', () => {
      expect(() => createPatternBuilder(0)).toThrow();
      expect(() => createPatternBuilder(-2)).toThrow();
    });
  });

  describe('generateBoundsFunction', () => {
    test('returns a function that computes bounds for 2D', () => {
      const boundsFunc = generateBoundsFunction(2);
      const random = { nextDouble: () => 0.5 };
      const bounds = boundsFunc([], { springLength: 10 }, random);
      
      expect(bounds.box).toBeDefined();
      expect(typeof bounds.update).toBe('function');
      expect(typeof bounds.reset).toBe('function');
      expect(typeof bounds.getBestNewPosition).toBe('function');
      
      const pos = bounds.getBestNewPosition([]);
      expect(pos.x).toBeDefined();
      expect(pos.y).toBeDefined();
    });
  });

  describe('generateCreateBodyFunction', () => {
    test('generates a Body class for 2D with correct default properties', () => {
      const Body = generateCreateBodyFunction(2, false);
      const body = new Body(1, 2);
      expect(body.pos).toBeDefined();
      expect(body.force).toBeDefined();
      expect(body.velocity).toBeDefined();
      expect(body.mass).toBe(1);
      expect(body.springCount).toBe(0);
      expect(body.springLength).toBe(0);
    });

    test('Body class uses debug setters when enabled', () => {
      const Body = generateCreateBodyFunction(2, true);
      const body = new Body(1, 2);
      expect(() => { body.pos.x = 'not a number'; }).toThrow();
      expect(() => { body.pos.y = 'not a number'; }).toThrow();
    });
  });

  describe('generateCreateDragForceFunction', () => {
    test('returns a valid drag force function for 2D', () => {
      const createDragForce = generateCreateDragForceFunction(2);
      const dragForce = createDragForce({ dragCoefficient: 0.9 });
      expect(typeof dragForce.update).toBe('function');

      const body = {
        force: { x: 0, y: 0 },
        velocity: { x: 1, y: 1 }
      };
      dragForce.update(body);
      expect(body.force.x).toBeCloseTo(-0.9);
      expect(body.force.y).toBeCloseTo(-0.9);
    });

    test('throws error if dragCoefficient is invalid', () => {
      const createDragForce = generateCreateDragForceFunction(2);
      expect(() => createDragForce({ dragCoefficient: NaN })).toThrow();
    });
  });

  describe('generateCreateSpringForceFunction', () => {
    test('returns a valid spring force function for 2D', () => {
      const createSpringForce = generateCreateSpringForceFunction(2);
      const random = { nextDouble: () => 0.5 };
      const springForce = createSpringForce({ springCoefficient: 0.8, springLength: 10 }, random);
      expect(typeof springForce.update).toBe('function');

      const body1 = { pos: { x: 0, y: 0 }, force: { x: 0, y: 0 }, springCount: 0, springLength: 0 };
      const body2 = { pos: { x: 5, y: 0 }, force: { x: 0, y: 0 }, springCount: 0, springLength: 0 };
      const spring = { from: body1, to: body2, length: 10, coefficient: 0.8 };
      springForce.update(spring);
      expect(body1.force.x).not.toBe(0);
      expect(body2.force.x).not.toBe(0);
    });

    test('throws error if springCoefficient is invalid', () => {
      const createSpringForce = generateCreateSpringForceFunction(2);
      const random = { nextDouble: () => 0.5 };
      expect(() => createSpringForce({ springCoefficient: Infinity, springLength: 10 }, random)).toThrow();
    });
  });

  describe('generateIntegratorFunction', () => {
    test('returns a valid integrator function for 2D', () => {
      const integrator = generateIntegratorFunction(2);
      expect(typeof integrator).toBe('function');
      const movement = integrator([], 0.5, 0);
      expect(movement).toBe(0);
    });
  });

  describe('generateQuadTreeFunction', () => {
    test('returns a valid quad tree instance for 2D', () => {
      const quadTreeFactory = generateQuadTreeFunction(2);
      const createQuadTreeFunc = quadTreeFactory();
      const quadTree = createQuadTreeFunc({}, { nextDouble: () => Math.random() }); // Pass options and random
      expect(typeof quadTree.insertBodies).toBe('function');
      expect(typeof quadTree.getRoot).toBe('function');
      expect(typeof quadTree.updateBodyForce).toBe('function');
      expect(typeof quadTree.options).toBe('function');
    });
  });
});
