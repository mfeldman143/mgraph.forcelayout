// code-generators.test.ts
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

describe('Code‑generators helpers', () => {
  /* ----------------------------------------------------------------------- */
  describe('getVariableName()', () => {
    it('maps indices → coordinates', () => {
      expect(getVariableName(0)).toBe('x');
      expect(getVariableName(1)).toBe('y');
      expect(getVariableName(2)).toBe('z');
      expect(getVariableName(3)).toBe('c4');  // ← legacy +1 offset
      expect(getVariableName(4)).toBe('c5');
    });

    it('throws on negative index', () => {
      expect(() => getVariableName(-1)).toThrow();
    });
  });

  /* ----------------------------------------------------------------------- */
  describe('createPatternBuilder()', () => {
    const p2 = createPatternBuilder(2);
    const p3 = createPatternBuilder(3);

    it('creates patterns for any join / indent', () => {
      expect(p2('pos.{var}')).toBe('pos.x\npos.y');
      expect(p2('pos.{var}', { join: ', ' })).toBe('pos.x, pos.y');
      expect(p2('pos.{var}', { indent: 2 })).toBe('pos.x\n  pos.y');
      expect(p3('pos.{var}', { join: ', ' })).toBe('pos.x, pos.y, pos.z');
    });

    it('rejects invalid dimensions', () => {
      expect(() => createPatternBuilder(0)).toThrow();
      expect(() => createPatternBuilder(-2)).toThrow();
    });
  });

  /* ----------------------------------------------------------------------- */
  describe('generated runtime helpers', () => {
    const RND = { nextDouble: () => 0.42 };

    it('Bounds‑function returns bbox & helpers', () => {
      const boundsFn = generateBoundsFunction(2);
      const bounds   = boundsFn([], { springLength: 10 }, RND);
      expect(bounds.box).toBeDefined();
      expect(typeof bounds.update).toBe('function');
      expect(typeof bounds.reset).toBe('function');
      expect(typeof bounds.getBestNewPosition).toBe('function');
    });

    it('Body factory builds valid bodies', () => {
      const Body = generateCreateBodyFunction(2, false);
      const b    = new Body(1, 2);
      expect(b.pos.x).toBe(1);
      expect(b.pos.y).toBe(2);
      expect(b.mass).toBe(1);
    });

    it('debug setters guard Vector coords', () => {
      const Body = generateCreateBodyFunction(2, true);
      const b    = new Body(1, 2);
      // @ts‑expect‑error deliberate misuse
      expect(() => { b.pos.x = 'NaN'; }).toThrow();
    });

    it('Drag‑force updates body.force', () => {
      const makeDrag = generateCreateDragForceFunction(2);
      const drag     = makeDrag({ dragCoefficient: 0.5 });
      const body     = { force: { x: 0, y: 0 }, velocity: { x: 1, y: -2 } };
      drag.update(body);
      expect(body.force).toEqual({ x: -0.5, y: 1 });
    });

    it('Spring‑force pulls two bodies together', () => {
      const makeSpring = generateCreateSpringForceFunction(2);
      const springF    = makeSpring({ springCoefficient: 1, springLength: 0 }, RND);
      const b1 = { pos: { x: 0, y: 0 }, force: { x: 0, y: 0 }, springCount: 0, springLength: 0 };
      const b2 = { pos: { x: 10, y: 0 }, force: { x: 0, y: 0 }, springCount: 0, springLength: 0 };
      springF.update({ from: b1, to: b2, length: 0, coefficient: 1 });
      expect(b1.force.x).toBeGreaterThan(0);
      expect(b2.force.x).toBeLessThan(0);
    });

    it('Integrator returns 0 movement for empty body array', () => {
      const integ = generateIntegratorFunction(2);
      expect(integ([], 0.5, 0)).toBe(0);
    });

    it('Quad‑tree factory returns insertBodies()', () => {
      const qtFactory = generateQuadTreeFunction(2)();
      const qt        = qtFactory({}, RND);
      expect(typeof qt.insertBodies).toBe('function');
    });
  });
});
