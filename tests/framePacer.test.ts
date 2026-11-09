import { describe, expect, it } from 'vitest';
import { drawDivisor, FramePacer } from '../src/core/framePacer';

/** Feeds `frames` animation frames at `hz`, returns how many were drawn. */
function run(pacer: FramePacer, hz: number, frames: number, start = 0): number {
  let drawn = 0;
  for (let i = 0; i < frames; i++) if (pacer.shouldDraw(start + (i * 1000) / hz)) drawn++;
  return drawn;
}

describe('drawDivisor', () => {
  it.each([
    [30, 1],
    [59.94, 1],
    [60, 1],
    [75, 1],
    [90, 1],
    [119.88, 2],
    [120, 2],
    [144, 2],
    [165, 2],
    [180, 3],
    [240, 4],
    [360, 6],
  ])('%d Hz waits for %d refresh(es)', (hz, divisor) => {
    expect(drawDivisor(hz, 60)).toBe(divisor);
  });

  it('never draws under the target on any common monitor', () => {
    for (const hz of [60, 75, 90, 100, 120, 144, 165, 180, 240, 360]) {
      expect(hz / drawDivisor(hz, 60)).toBeGreaterThanOrEqual(60);
    }
  });

  it('falls back to every frame on invalid values', () => {
    for (const bad of [0, -60, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(drawDivisor(bad, 60)).toBe(1);
    }
    expect(drawDivisor(144, 0)).toBe(1);
  });
});

describe('FramePacer', () => {
  it('draws every frame until it has measured the monitor', () => {
    const pacer = new FramePacer(60, 60);
    expect(run(pacer, 144, 60)).toBe(60);
    expect(pacer.divisor).toBe(1);
  });

  it('settles on 72 frames per second at 144 Hz, every other refresh', () => {
    const pacer = new FramePacer(60, 60);
    run(pacer, 144, 61);
    expect(pacer.divisor).toBe(2);
    let drawn = 0;
    for (let i = 0; i < 144; i++) if (pacer.shouldDraw(1000 + (i * 1000) / 144)) drawn++;
    expect(drawn).toBe(72);
  });

  it('draws every frame at 60 Hz', () => {
    const pacer = new FramePacer(60, 60);
    expect(run(pacer, 60, 300)).toBe(300);
    expect(pacer.divisor).toBe(1);
  });

  it('follows the window to a monitor with another refresh rate', () => {
    const pacer = new FramePacer(60, 60);
    run(pacer, 144, 61);
    expect(pacer.divisor).toBe(2);
    run(pacer, 60, 121, 1000);
    expect(pacer.divisor).toBe(1);
    run(pacer, 144, 121, 5000);
    expect(pacer.divisor).toBe(2);
  });

  it('is not fooled by some slow frames: it looks at the short gaps', () => {
    const pacer = new FramePacer(60, 60);
    let time = 0;
    for (let i = 0; i < 61; i++) {
      time += i % 3 === 0 ? 40 : 1000 / 144;
      pacer.shouldDraw(time);
    }
    expect(pacer.divisor).toBe(2);
  });

  it('ignores long gaps, like a hidden tab', () => {
    const pacer = new FramePacer(60, 4);
    run(pacer, 144, 5);
    expect(pacer.divisor).toBe(2);
    let time = 100_000;
    for (let i = 0; i < 8; i++) {
      time += 5000;
      pacer.shouldDraw(time);
    }
    expect(pacer.divisor).toBe(2);
  });

  it('never stops drawing, even with a repeated timestamp', () => {
    const pacer = new FramePacer(60, 4);
    let drawn = 0;
    for (let i = 0; i < 20; i++) if (pacer.shouldDraw(1000)) drawn++;
    expect(drawn).toBe(20);
  });
});
