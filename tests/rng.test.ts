import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt } from '../src/core/rng';

describe('seeded rng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    for (let i = 0; i < 50; i++) expect(nextFloat(a)).toBe(nextFloat(b));
  });

  it('gives different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    let same = 0;
    for (let i = 0; i < 20; i++) if (nextFloat(a) === nextFloat(b)) same++;
    expect(same).toBeLessThan(20);
  });

  it('stays inside its ranges', () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const f = nextFloat(rng);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = nextInt(rng, 3);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(3);
    }
  });
});
