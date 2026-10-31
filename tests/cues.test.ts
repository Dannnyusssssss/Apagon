import { describe, expect, it } from 'vitest';
import {
  createCueOutput,
  createCueState,
  heartbeatInterval,
  crackleInterval,
  heartbeatVolume,
  lowBatteryLevel,
  updateCues,
  type CueConfig,
} from '../src/audio/cues';
import { BALANCE } from '../src/data/balance';

const STEP = BALANCE.simulation.stepSeconds;
const CFG: CueConfig = BALANCE.audio;
const CFG_AUDIO = BALANCE.audio;

function count(
  seconds: number,
  moving: boolean,
  near: number,
  lit: boolean,
  battery = 0,
): { steps: number; beats: number; flickers: number; crackles: number } {
  const state = createCueState();
  const out = createCueOutput();
  const result = { steps: 0, beats: 0, flickers: 0, crackles: 0 };
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    updateCues(state, CFG, STEP, moving, near, lit, battery, out);
    if (out.step) result.steps++;
    if (out.heartbeat) result.beats++;
    if (out.flicker) result.flickers++;
    if (out.crackle) result.crackles++;
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

  it('raises the low-battery level smoothly from the threshold to empty', () => {
    const low = CFG_AUDIO.lowBatteryThreshold;
    expect(lowBatteryLevel(1, low)).toBe(0);
    expect(lowBatteryLevel(low + 0.01, low)).toBe(0);
    expect(lowBatteryLevel(low, low)).toBe(0);
    expect(lowBatteryLevel(low / 2, low)).toBeCloseTo(0.5, 9);
    expect(lowBatteryLevel(0, low)).toBe(1);
    expect(lowBatteryLevel(-1, low)).toBe(1);
    let previous = 0;
    for (let b = low; b >= 0; b -= 0.001) {
      const v = lowBatteryLevel(b, low);
      expect(v).toBeGreaterThanOrEqual(previous);
      expect(v - previous).toBeLessThan(0.01);
      previous = v;
    }
    // The hum stays below the master volume.
    expect(CFG_AUDIO.lowBatteryMaxVolume).toBeLessThanOrEqual(CFG_AUDIO.masterVolume);
  });

  it('crackles only with low battery, faster as it runs out', () => {
    expect(crackleInterval(0, CFG.crackleSlow, CFG.crackleFast)).toBe(Infinity);
    expect(crackleInterval(1, CFG.crackleSlow, CFG.crackleFast)).toBeCloseTo(CFG.crackleFast, 9);
    expect(count(10, false, 0, false, 0).crackles).toBe(0);
    const some = count(10, false, 0, false, 0.2).crackles;
    const many = count(10, false, 0, false, 1).crackles;
    expect(some).toBeGreaterThan(0);
    expect(many).toBeGreaterThan(some);
    expect(many).toBeLessThanOrEqual(Math.ceil(10 / CFG.crackleFast) + 1);
  });
});
