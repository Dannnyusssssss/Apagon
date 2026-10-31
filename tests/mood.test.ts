import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { playerMood } from '../src/game/mood';
import type { RoomDef } from '../src/data/rooms';
import { createWorld, stepWorld, type StepInput } from '../src/game/world';

const CFG = BALANCE.mood;
const STEP = BALANCE.simulation.stepSeconds;

describe('player mood', () => {
  it('is calm with a good battery and nothing near', () => {
    expect(playerMood(1, 0, CFG)).toBe('calm');
    expect(playerMood(CFG.worriedBattery + 0.01, CFG.worriedNear - 0.01, CFG)).toBe('calm');
  });

  it('gets worried with half the battery or the enemy near', () => {
    expect(playerMood(CFG.worriedBattery, 0, CFG)).toBe('worried');
    expect(playerMood(1, CFG.worriedNear, CFG)).toBe('worried');
  });

  it('gets scared with low or no battery, or the enemy very close', () => {
    expect(playerMood(CFG.scaredBattery, 0, CFG)).toBe('scared');
    expect(playerMood(0, 0, CFG)).toBe('scared');
    expect(playerMood(1, CFG.scaredNear, CFG)).toBe('scared');
  });

  it('uses the same thresholds as the low-battery warning', () => {
    expect(CFG.scaredBattery).toBe(BALANCE.battery.lowThreshold);
  });

  it('is updated by the world every step', () => {
    const room: RoomDef = {
      id: 'mood',
      layout: ['##########', '#P......E#', '#.......K#', '#D########'],
    };
    const w = createWorld(room, { seed: 1, reduceFlicker: false });
    const idle: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };
    stepWorld(w, idle, STEP);
    expect(w.mood).toBe('calm');
    w.flashlight.battery = 0.1;
    stepWorld(w, idle, STEP);
    expect(w.mood).toBe('scared');
  });
});
