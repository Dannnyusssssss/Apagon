import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { createFlashlight, resetFlashlight } from '../src/game/flashlight';
import { flashlightSystem } from '../src/game/systems/flashlight';

const STEP = BALANCE.simulation.stepSeconds;
const CFG = BALANCE.flashlight;

/** Runs the switch for `seconds`, asking to toggle on the steps `press` says; returns the switch times. */
function run(
  seconds: number,
  press: (step: number) => boolean,
  light = createFlashlight(true),
): number[] {
  const switches: number[] = [];
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const wasOn = light.on;
    flashlightSystem(light, press(i), CFG, STEP);
    if (light.on !== wasOn) switches.push(i * STEP);
  }
  return switches;
}

describe('light switch (photosensitivity)', () => {
  it('keeps the limits in the balance data', () => {
    expect(CFG.toggleFadeSeconds).toBeCloseTo(0.15);
    expect(CFG.minToggleInterval).toBeCloseTo(0.3);
  });

  it('switches at once on a single press', () => {
    const light = createFlashlight(true);
    flashlightSystem(light, true, CFG, STEP);
    expect(light.on).toBe(false);
  });

  it('ignores presses closer than the minimum interval', () => {
    const switches = run(1, () => true);
    for (let i = 1; i < switches.length; i++) {
      expect((switches[i] ?? 0) - (switches[i - 1] ?? 0)).toBeGreaterThanOrEqual(
        CFG.minToggleInterval - 1e-9,
      );
    }
  });

  it('allows at most 6 switches (3 flashes) in any second, even pressing every step', () => {
    const switches = run(3, () => true);
    for (const start of switches) {
      const inWindow = switches.filter((t) => t >= start && t < start + 1).length;
      expect(inWindow).toBeLessThanOrEqual(6);
    }
    // With 0.3 s between switches there are about 3 per second, well under the limit.
    expect(switches.length).toBeLessThanOrEqual(Math.ceil(3 / CFG.minToggleInterval));
  });

  it('accepts a press again once the interval has passed', () => {
    const second = Math.ceil(CFG.minToggleInterval / STEP) + 1;
    const switches = run(1, (i) => i === 0 || i === second);
    expect(switches).toHaveLength(2);
  });

  it('fades the picture over the fade time instead of jumping', () => {
    const light = createFlashlight(true);
    flashlightSystem(light, true, CFG, STEP);
    expect(light.on).toBe(false);
    expect(light.onAmount).toBeGreaterThan(0.8);
    expect(light.onAmount).toBeLessThan(1);
    const fadeSteps = Math.ceil(CFG.toggleFadeSeconds / STEP);
    for (let i = 1; i < fadeSteps - 1; i++) flashlightSystem(light, false, CFG, STEP);
    expect(light.onAmount).toBeGreaterThan(0);
    for (let i = 0; i < 2; i++) flashlightSystem(light, false, CFG, STEP);
    expect(light.onAmount).toBe(0);
  });

  it('fades in the same way when switched on', () => {
    const light = createFlashlight(false);
    expect(light.onAmount).toBe(0);
    flashlightSystem(light, true, CFG, STEP);
    expect(light.on).toBe(true);
    expect(light.onAmount).toBeLessThan(0.2);
    run(CFG.toggleFadeSeconds + STEP, () => false, light);
    expect(light.onAmount).toBe(1);
  });

  it('fades out too when the battery turns the light off', () => {
    const light = createFlashlight(true);
    light.on = false;
    flashlightSystem(light, false, CFG, STEP);
    expect(light.onAmount).toBeGreaterThan(0);
    expect(light.onAmount).toBeLessThan(1);
  });

  it('does not start the interval when an empty battery keeps the light off', () => {
    const light = createFlashlight(false);
    light.battery = 0;
    flashlightSystem(light, true, CFG, STEP);
    expect(light.on).toBe(false);
    expect(light.toggleCooldown).toBe(0);
  });

  it('starts each level with the light fully shown and no interval pending', () => {
    const light = createFlashlight(true);
    flashlightSystem(light, true, CFG, STEP);
    resetFlashlight(light, true);
    expect(light.onAmount).toBe(1);
    expect(light.toggleCooldown).toBe(0);
  });
});
