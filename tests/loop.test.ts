import { describe, expect, it } from 'vitest';
import { FixedStepClock } from '../src/core/loop';

const STEP = 1 / 60;

function clock(): FixedStepClock {
  return new FixedStepClock(STEP, 5, 0.25);
}

describe('FixedStepClock', () => {
  it('runs one step for one frame at 60 Hz', () => {
    const c = clock();
    c.advance(STEP);
    expect(c.steps).toBe(1);
  });

  it('runs exactly 60 steps over 60 frames at 60 Hz', () => {
    const c = clock();
    let total = 0;
    for (let i = 0; i < 60; i++) {
      c.advance(STEP);
      total += c.steps;
    }
    expect(total).toBe(60);
  });

  it('runs 60 steps per second at 144 Hz too', () => {
    const c = clock();
    let total = 0;
    for (let i = 0; i < 144; i++) {
      c.advance(1 / 144);
      total += c.steps;
    }
    expect(total).toBeGreaterThanOrEqual(59);
    expect(total).toBeLessThanOrEqual(60);
  });

  it('accumulates small deltas until a step is due', () => {
    const c = clock();
    c.advance(STEP * 0.4);
    expect(c.steps).toBe(0);
    c.advance(STEP * 0.4);
    expect(c.steps).toBe(0);
    c.advance(STEP * 0.4);
    expect(c.steps).toBe(1);
  });

  it('runs two steps for a frame twice as long', () => {
    const c = clock();
    c.advance(STEP * 2);
    expect(c.steps).toBe(2);
  });

  it('caps the steps of a long frame and drops the backlog', () => {
    const c = clock();
    c.advance(0.2);
    expect(c.steps).toBe(5);
    expect(c.accumulator).toBe(0);
    c.advance(0);
    expect(c.steps).toBe(0);
  });

  it('clamps huge deltas', () => {
    const c = clock();
    c.advance(10);
    expect(c.steps).toBe(5);
  });

  it('ignores negative, NaN and infinite deltas', () => {
    const c = clock();
    for (const delta of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      c.advance(delta);
      expect(c.steps).toBe(0);
    }
  });

  it('keeps alpha between 0 and 1 and reflects the leftover time', () => {
    const c = clock();
    c.advance(STEP * 1.5);
    expect(c.steps).toBe(1);
    expect(c.alpha).toBeCloseTo(0.5, 6);
    for (let i = 0; i < 100; i++) {
      c.advance((i % 7) * 0.003);
      expect(c.alpha).toBeGreaterThanOrEqual(0);
      expect(c.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same sequence of deltas', () => {
    const deltas = [0.01, 0.02, 0.005, 0.033, 0.016, 0.1, 0.001];
    const run = (): number[] => {
      const c = clock();
      return deltas.map((d) => {
        c.advance(d);
        return c.steps;
      });
    };
    expect(run()).toEqual(run());
  });

  it('reset clears pending time', () => {
    const c = clock();
    c.advance(STEP * 0.9);
    c.reset();
    c.advance(STEP * 0.5);
    expect(c.steps).toBe(0);
  });
});
