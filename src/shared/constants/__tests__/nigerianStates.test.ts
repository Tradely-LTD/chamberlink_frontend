import { NIGERIAN_STATES } from '../nigerianStates';

describe('NIGERIAN_STATES', () => {
  it('has exactly 37 entries (36 states + FCT)', () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
  });

  it('has no duplicate entries', () => {
    expect(new Set(NIGERIAN_STATES).size).toBe(NIGERIAN_STATES.length);
  });

  it('includes the Federal Capital Territory and a sample of well-known states', () => {
    expect(NIGERIAN_STATES).toContain('Federal Capital Territory');
    expect(NIGERIAN_STATES).toContain('Lagos');
    expect(NIGERIAN_STATES).toContain('Plateau');
    expect(NIGERIAN_STATES).toContain('Rivers');
    expect(NIGERIAN_STATES).toContain('Kano');
  });
});
