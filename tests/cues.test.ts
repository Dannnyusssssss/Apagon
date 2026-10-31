import { describe, expect, it } from 'vitest';
import {
  createCueOutput,
  createCueState,
  heartbeatInterval,
  heartbeatVolume,
  updateCues,
  type CueConfig,
} from '../src/audio/cues';
import { BALANCE } from '../src/data/balance';

const STEP = BALANCE.simulation.stepSeconds;
const CFG: CueConfig = BALANCE.audio;

function count(
  seconds: number,
  moving: boolean,
  near: number,
  lit: boolean,
): { steps: number; beats: number; flickers: number } {
  const state = createCueState();
  const out = createCueOutput();
  const result = { steps: 0, beats: 0, flickers: 0 };
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    updateCues(state, CFG, STEP, moving, near, lit, out);
    if (out.step) result.steps++;
    if (out.heartbeat) result.beats++;
    if (out.flicker) result.flickers++;
  }
  return result;
}

describe('sound cues', () => {
  it('plays footsteps at a steady rhythm only while moving', () => {
    const seconds = 10;
    const { steps } = count(seconds, true, 0, false);
    expect(steps).toBeGreaterThanOrEqual(Math.floor(seconds / CFG.stepInterval) - 1);
    expect(steps).toBeLessThanOrEqual(Math.ceil(seconds / CFG.stepInterval) + 1);
    expect(count(seconds, false, 0, false).steps).toBe(0);
  });

  it('has no heartbeat when the enemy is far', () => {
    expect(heartbeatInterval(0, CFG)).toBe(Infinity);
    expect(heartbeatVolume(0, CFG)).toBe(0);
    expect(count(5, false, CFG.heartbeatThreshold / 2, false).beats).toBe(0);
  });

  it('speeds up and gets louder as the enemy gets closer, within limits', () => {
    const far = heartbeatInterval(CFG.heartbeatThreshold, CFG);
    const close = heartbeatInterval(1, CFG);
    expect(far).toBeCloseTo(60 / CFG.heartbeatMinBpm, 9);
    expect(close).toBeCloseTo(60 / CFG.heartbeatMaxBpm, 9);
    expect(close).toBeLessThan(far);
    expect(heartbeatVolume(1, CFG)).toBeCloseTo(CFG.heartbeatMaxVolume, 9);
    expect(heartbeatVolume(1, CFG)).toBeLessThanOrEqual(BALANCE.audio.masterVolume);
    // Never more than 2 beats per second, even touching.
    expect(count(10, false, 1, false).beats).toBeLessThanOrEqual(21);
    expect(count(10, false, 1, false).beats).toBeGreaterThan(count(10, false, 0.3, false).beats);
  });

  it('limits how often the flicker sound plays', () => {
    const seconds = 6;
    const { flickers } = count(seconds, false, 0, true);
    expect(flickers).toBeGreaterThan(0);
    expect(flickers).toBeLessThanOrEqual(Math.ceil(seconds / CFG.flickerMinGap));
  });
});
