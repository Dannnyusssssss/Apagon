import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import {
  drainBattery,
  isBatteryLow,
  lightRadius,
  rechargeBattery,
  type BatteryConfig,
} from '../src/game/battery';
import { createFlashlight, toggleFlashlight } from '../src/game/flashlight';

const STEP = BALANCE.simulation.stepSeconds;
const CFG: BatteryConfig = {
  drainSeconds: 10,
  minRadiusFraction: 0.5,
  rechargeAmount: 0.4,
  lowThreshold: 0.25,
};

function drainFor(
  seconds: number,
  light = createFlashlight(true),
): ReturnType<typeof createFlashlight> {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) drainBattery(light, CFG, STEP);
  return light;
}

describe('battery', () => {
  it('drains only while the light is on', () => {
    expect(drainFor(5).battery).toBeCloseTo(0.5, 6);
    const off = createFlashlight(false);
    drainFor(5, off);
    expect(off.battery).toBe(1);
  });

  it('turns the light off when empty and keeps it off', () => {
    const light = drainFor(11);
    expect(light.battery).toBe(0);
    expect(light.on).toBe(false);
    toggleFlashlight(light);
    expect(light.on).toBe(false);
  });

  it('recharges with a pickup, capped at full', () => {
    const light = drainFor(11);
    rechargeBattery(light, CFG.rechargeAmount);
    expect(light.battery).toBeCloseTo(0.4, 9);
    toggleFlashlight(light);
    expect(light.on).toBe(true);
    rechargeBattery(light, 0.4);
    rechargeBattery(light, 0.4);
    expect(light.battery).toBe(1);
  });

  it('shrinks the light radius with the charge', () => {
    expect(lightRadius(1, 200, 0.5)).toBe(200);
    expect(lightRadius(0.5, 200, 0.5)).toBe(150);
    expect(lightRadius(0, 200, 0.5)).toBe(100);
    expect(lightRadius(2, 200, 0.5)).toBe(200);
    expect(lightRadius(-1, 200, 0.5)).toBe(100);
  });

  it('reports low battery at the threshold', () => {
    expect(isBatteryLow(0.26, 0.25)).toBe(false);
    expect(isBatteryLow(0.25, 0.25)).toBe(true);
    expect(isBatteryLow(0, 0.25)).toBe(true);
  });
});
