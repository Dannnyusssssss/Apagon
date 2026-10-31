import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { RoomDef } from '../src/data/rooms';
import { lightModeProfile } from '../src/game/lightModes';
import {
  createWorld,
  resetWorld,
  setLightMode,
  stepWorld,
  type StepInput,
  type World,
} from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;
const IDLE: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };

const CORRIDOR: RoomDef = {
  id: 'corridor',
  layout: ['#############', '#P.........K#', '#..........E#', '#D###########'],
};

/** Player in the middle of the corridor, facing and aiming right, enemy ready to move. */
function setup(classicLight: boolean, enemyOffsetX: number): World {
  const w = createWorld(CORRIDOR, { seed: 1, reduceFlicker: false, classicLight });
  const { player, enemy, flashlight } = w;
  player.x = player.prevX = 300;
  player.y = player.prevY = 72;
  player.facingX = 1;
  player.facingY = 0;
  flashlight.aim = flashlight.prevAim = 0;
  flashlight.on = true;
  enemy.x = enemy.prevX = 300 + enemyOffsetX;
  enemy.y = enemy.prevY = 72;
  enemy.startTimer = 0;
  return w;
}

describe('cone light in the world', () => {
  it('stops the enemy in front of the beam', () => {
    const w = setup(false, 100);
    stepWorld(w, IDLE, STEP);
    expect(w.enemy.lit).toBe(true);
    expect(w.enemy.x).toBe(400);
  });

  it('does not stop the enemy behind the player, even inside the halo', () => {
    const behind = -40;
    expect(Math.abs(behind)).toBeLessThan(BALANCE.flashlight.haloRadius);
    const w = setup(false, behind);
    stepWorld(w, IDLE, STEP);
    expect(w.enemy.lit).toBe(false);
    expect(w.enemy.x).toBeGreaterThan(300 + behind);
  });

  it('stops the enemy behind the player with the classic light', () => {
    const w = setup(true, -40);
    stepWorld(w, IDLE, STEP);
    expect(w.enemy.lit).toBe(true);
    expect(w.enemy.x).toBe(260);
  });

  it('lights the enemy once the beam turns toward it', () => {
    const w = setup(false, -100);
    w.player.facingX = -1;
    let litAt = -1;
    for (let i = 0; i < 30 && litAt < 0; i++) {
      w.enemy.startTimer = 0;
      stepWorld(w, IDLE, STEP);
      if (w.enemy.lit) litAt = i;
    }
    // It takes a few steps to turn (it does not snap), then the enemy is lit.
    expect(litAt).toBeGreaterThan(5);
    expect(litAt).toBeLessThan(25);
  });
});

describe('light mode difficulty', () => {
  it('uses the 4.1 values with the classic light and the rebalanced ones with the cone', () => {
    const classic = lightModeProfile(true);
    const cone = lightModeProfile(false);
    expect(classic.enemySpeed).toBe(BALANCE.enemy.speed);
    expect(classic.battery.drainSeconds).toBe(BALANCE.battery.drainSeconds);
    expect(classic.enemy.lightAdaptSeconds).toBe(BALANCE.enemy.lightAdaptSeconds);
    expect(cone.enemySpeed).toBe(BALANCE.lightModes.cone.enemySpeed);
    expect(cone.battery.drainSeconds).toBe(BALANCE.lightModes.cone.drainSeconds);
    expect(cone.enemy.lightAdaptSeconds).toBe(BALANCE.lightModes.cone.lightAdaptSeconds);
  });

  it('keeps the enemy slower than the player with the light on, in both modes', () => {
    for (const classic of [true, false]) {
      expect(lightModeProfile(classic).enemySpeed).toBeLessThan(BALANCE.player.speed);
    }
  });

  it('applies the enemy speed at once when the mode changes, and keeps it on reset', () => {
    const w = createWorld(CORRIDOR, { seed: 1, reduceFlicker: false });
    expect(w.settings.classicLight).toBe(false);
    expect(w.enemy.speed).toBe(BALANCE.lightModes.cone.enemySpeed);
    setLightMode(w, true);
    expect(w.enemy.speed).toBe(BALANCE.enemy.speed);
    resetWorld(w);
    expect(w.settings.classicLight).toBe(true);
    expect(w.enemy.speed).toBe(BALANCE.enemy.speed);
  });

  it('drains the battery at the rate of each mode', () => {
    for (const classic of [true, false]) {
      const w = setup(classic, 250);
      w.enemy.startTimer = 999;
      for (let i = 0; i < 60; i++) stepWorld(w, IDLE, STEP);
      const drain = lightModeProfile(classic).battery.drainSeconds;
      expect(w.flashlight.battery).toBeCloseTo(1 - 1 / drain, 6);
    }
  });
});
