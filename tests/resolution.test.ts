import { describe, expect, it } from 'vitest';
import { renderScale } from '../src/core/resolution';

const scale = (dpr: number, w: number, h: number): number => renderScale(dpr, w, h, 1.5, 3_200_000);

describe('renderScale', () => {
  it('caps a very dense screen', () => {
    expect(scale(2.5, 1536, 864)).toBe(1.5);
    expect(scale(3, 400, 800)).toBe(1.5);
  });

  it('keeps a normal screen as it is', () => {
    expect(scale(1, 1920, 1080)).toBe(1);
    expect(scale(1.25, 1536, 864)).toBe(1.25);
    expect(scale(1.5, 1280, 720)).toBe(1.5);
  });

  it('never goes above what the screen has', () => {
    expect(scale(0.75, 800, 600)).toBe(0.75);
  });

  it('limits the total pixels of a large window', () => {
    const large = scale(1, 3840, 2160);
    expect(large).toBeLessThan(1);
    expect(3840 * 2160 * large * large).toBeCloseTo(3_200_000, 0);
    const dense = scale(2, 2560, 1440);
    expect(2560 * 1440 * dense * dense).toBeCloseTo(3_200_000, 0);
  });

  it('treats invalid values as 1 and survives an empty window', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(scale(bad, 800, 600)).toBe(1);
    }
    expect(scale(2, 0, 0)).toBe(1.5);
    expect(scale(2, Number.NaN, 600)).toBe(1.5);
  });
});
