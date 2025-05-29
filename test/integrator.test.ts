import { generateCreateBodyFunction, generateIntegratorFunction } from '../lib/code-generators';

describe('Euler integrator', () => {
  const Body      = generateCreateBodyFunction(2, false);
  const integrator = generateIntegratorFunction(2);

  // single free body with force→velocity→position update
  const body = new Body(0, 0);
  body.force.x = 1;   // Fx = 1 N
  body.mass    = 1;   // kg

  it('moves body the correct distance (dt = 1)', () => {
    const move = integrator([body], 1, 0);  // dt = 1
    expect(move).toBeCloseTo(1);
    expect(body.pos.x).toBeCloseTo(1);
  });
});
