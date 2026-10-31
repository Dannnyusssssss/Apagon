import { describe, expect, it } from 'vitest';
import { angleDelta, lerpAngle, turnToward } from '../src/core/math';

const DEG = Math.PI / 180;

describe('angleDelta', () => {
  it('gives the signed short way between two angles', () => {
    expect(angleDelta(0, 90 * DEG)).toBeCloseTo(90 * DEG, 9);
    expect(angleDelta(90 * DEG, 0)).toBeCloseTo(-90 * DEG, 9);
    expect(angleDelta(0, 0)).toBe(0);
  });

  it('goes across the -PI/PI seam instead of the long way', () => {
    expect(angleDelta(170 * DEG, -170 * DEG)).toBeCloseTo(20 * DEG, 9);
    expect(angleDelta(-170 * DEG, 170 * DEG)).toBeCloseTo(-20 * DEG, 9);
    expect(angleDelta(0, 4 * Math.PI + 10 * DEG)).toBeCloseTo(10 * DEG, 9);
  });

  it('always stays within -PI..PI', () => {
    for (let a = -10; a <= 10; a += 0.7) {
      for (let b = -10; b <= 10; b += 0.9) {
        const d = angleDelta(a, b);
        expect(Math.abs(d)).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });
});

describe('turnToward', () => {
  it('turns at most the max step, the short way', () => {
    expect(turnToward(0, 90 * DEG, 10 * DEG)).toBeCloseTo(10 * DEG, 9);
    expect(turnToward(0, -90 * DEG, 10 * DEG)).toBeCloseTo(-10 * DEG, 9);
    expect(turnToward(170 * DEG, -170 * DEG, 5 * DEG)).toBeCloseTo(175 * DEG, 9);
  });

  it('lands exactly on the target when it is close enough', () => {
    expect(turnToward(0, 3 * DEG, 10 * DEG)).toBeCloseTo(3 * DEG, 9);
  });
});

describe('lerpAngle', () => {
  it('interpolates the short way round', () => {
    expect(lerpAngle(0, 90 * DEG, 0.5)).toBeCloseTo(45 * DEG, 9);
    expect(lerpAngle(170 * DEG, -170 * DEG, 0.5)).toBeCloseTo(180 * DEG, 9);
    expect(lerpAngle(10 * DEG, 20 * DEG, 0)).toBeCloseTo(10 * DEG, 9);
  });
});
