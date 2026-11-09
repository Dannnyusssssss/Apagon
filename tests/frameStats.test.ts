import { describe, expect, it } from 'vitest';
import { FrameStats } from '../src/core/frameStats';

function playing(stats: FrameStats, gaps: readonly number[], start = 0): number {
  let time = start;
  stats.frame(time, true);
  for (const gap of gaps) {
    time += gap;
    stats.frame(time, true);
  }
  return time;
}

describe('FrameStats', () => {
  it('counts only frames over the limit', () => {
    const stats = new FrameStats(50, 5000);
    playing(stats, [16, 16, 50, 51, 16, 200]);
    expect(stats.longFrames).toBe(2);
    expect(stats.worstMs).toBe(200);
  });

  it('has nothing to report on the first frame', () => {
    const stats = new FrameStats(50, 5000);
    stats.frame(123_456, true);
    expect(stats.longFrames).toBe(0);
    expect(stats.worstMs).toBe(0);
  });

  it('does not count the time on a menu or in pause as a stall', () => {
    const stats = new FrameStats(50, 5000);
    const time = playing(stats, [16, 16]);
    stats.frame(time + 30_000, false);
    stats.frame(time + 60_000, true);
    stats.frame(time + 60_016, true);
    expect(stats.longFrames).toBe(0);
    expect(stats.worstMs).toBe(16);
  });

  it('lets an old worst frame go after its window, but keeps the count', () => {
    const stats = new FrameStats(50, 1000);
    let time = playing(stats, [300]);
    expect(stats.worstMs).toBe(300);
    // Two full windows of normal frames.
    for (let i = 0; i < 130; i++) {
      time += 16;
      stats.frame(time, true);
    }
    expect(stats.worstMs).toBeLessThan(300);
    expect(stats.longFrames).toBe(1);
  });
});
