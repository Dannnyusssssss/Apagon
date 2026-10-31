import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { createFlashlight } from '../src/game/flashlight';
import { flickerSystem } from '../src/game/systems/flicker';

const STEP = BALANCE.simulation.stepSeconds;
const CFG = BALANCE.flicker;
/** Photosensitivity limit: at most 3 flashes per second. */
const MAX_PER_SECOND = 3;

function simulate(seconds: number, triggered: (t: number) => boolean, reduce = false): number[] {
  const light = createFlashlight(true);
  const strengths: number[] = [];
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    flickerSystem(light, triggered(i * STEP), reduce, CFG, STEP);
    strengths.push(light.strength);
  }
  return strengths;
}

function countDips(values: number[]): number {
  let dips = 0;
  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1] ?? 1;
    const cur = values[i] ?? 1;
    const next = values[i + 1] ?? 1;
    if (cur < prev && cur <= next && cur < 1) dips++;
  }
  return dips;
}

describe('flashlight flicker', () => {
  it('is configured at or below 3 waves per second', () => {
    expect(CFG.frequencyHz).toBeLessThanOrEqual(MAX_PER_SECOND);
    expect(CFG.minStrength).toBeGreaterThan(0);
  });

  it('never dips more than 3 times per second', () => {
    const seconds = 10;
    const strengths = simulate(seconds, () => true);
    expect(countDips(strengths)).toBeGreaterThan(0);
    expect(countDips(strengths)).toBeLessThanOrEqual(MAX_PER_SECOND * seconds);
    // Also per one-second window.
    const perSecond = Math.round(1 / STEP);
    for (let start = 0; start + perSecond <= strengths.length; start += perSecond) {
      expect(countDips(strengths.slice(start, start + perSecond + 1))).toBeLessThanOrEqual(
        MAX_PER_SECOND,
      );
    }
  });

  it('changes smoothly and never goes below the minimum (no blackout)', () => {
    const strengths = simulate(5, (t) => t < 2 || (t > 3 && t < 3.3));
    let previous = 1;
    for (const s of strengths) {
      expect(s).toBeGreaterThanOrEqual(CFG.minStrength - 1e-9);
      expect(s).toBeLessThanOrEqual(1);
      expect(Math.abs(s - previous)).toBeLessThan(0.05);
      previous = s;
    }
  });

  it('settles back to full strength after the hold', () => {
    const strengths = simulate(4, (t) => t < 1);
    expect(strengths[strengths.length - 1]).toBe(1);
  });

  it('stays steady with "reduce flicker"', () => {
    const strengths = simulate(5, () => true, true);
    for (const s of strengths) expect(s).toBe(1);
  });
});
