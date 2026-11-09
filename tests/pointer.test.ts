import { describe, expect, it } from 'vitest';
import { createCamera, followTarget, screenToWorld } from '../src/core/camera';
import { angleDelta, type Vec2 } from '../src/core/math';
import { PointerAim } from '../src/core/pointer';
import { BALANCE } from '../src/data/balance';
import type { RoomDef } from '../src/data/rooms';
import { createFlashlight } from '../src/game/flashlight';
import { createPlayer } from '../src/game/player';
import { aimSystem } from '../src/game/systems/flashlight';
import { createWorld, setLightMode, stepWorld, type StepInput } from '../src/game/world';
import { firstEnemy } from './helpers';

const STEP = BALANCE.simulation.stepSeconds;
const RATE = BALANCE.flashlight.pointerTurnRate;
const DEAD_ZONE = BALANCE.flashlight.pointerDeadZone;

const CORRIDOR: RoomDef = {
  id: 'corridor',
  layout: [
    '######################',
    '#P..................K#',
    '#...................E#',
    '#D####################',
  ],
};

function aiming(x: number, y: number): StepInput {
  return { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false, aimAt: { x, y } };
}

describe('PointerAim', () => {
  it('starts inactive, so the keyboard alone plays as always', () => {
    expect(new PointerAim().active).toBe(false);
  });

  it('follows the mouse on a menu, without starting to aim', () => {
    const pointer = new PointerAim();
    pointer.move(100, 50, false);
    expect([pointer.x, pointer.y]).toEqual([100, 50]);
    expect(pointer.active).toBe(false);
  });

  it('starts to aim with a move during play and stays on', () => {
    const pointer = new PointerAim();
    pointer.move(1, 2, true);
    expect(pointer.active).toBe(true);
    pointer.move(3, 4, false);
    expect(pointer.active).toBe(true);
  });
});

describe('screenToWorld', () => {
  const out: Vec2 = { x: 0, y: 0 };

  it('finds the camera center at the center of the view', () => {
    const camera = { x: 300, y: 200, scale: 2 };
    expect(screenToWorld(camera, 400, 300, 800, 600, out)).toEqual({ x: 300, y: 200 });
  });

  it('accounts for the scale', () => {
    const camera = { x: 300, y: 200, scale: 2 };
    expect(screenToWorld(camera, 500, 100, 800, 600, out)).toEqual({ x: 350, y: 100 });
  });

  it('stays right when the camera stops at the edge of the map', () => {
    const camera = createCamera();
    camera.scale = 1;
    followTarget(camera, 10, 10, 2000, 2000, 800, 600);
    // The player is not at the center of the screen here, and the mapping still holds.
    expect(screenToWorld(camera, 10, 10, 800, 600, out)).toEqual({ x: 10, y: 10 });
  });
});

describe('aimSystem with the mouse', () => {
  it('turns toward the point, not where the player faces', () => {
    const player = createPlayer(100, 100, 14, 180);
    player.facingX = 1;
    player.facingY = 0;
    const light = createFlashlight(true, 0);
    for (let i = 0; i < 30; i++) aimSystem(light, player, RATE, STEP, { x: 0, y: 100 }, DEAD_ZONE);
    expect(Math.abs(angleDelta(light.aim, Math.PI))).toBeLessThan(1e-9);
  });

  it('turns twice as fast as with the keyboard, never jumping', () => {
    expect(RATE).toBeCloseTo(BALANCE.flashlight.turnRate * 2, 9);
    const player = createPlayer(0, 0, 14, 180);
    const light = createFlashlight(true, 0);
    aimSystem(light, player, RATE, STEP, { x: -100, y: 0 }, DEAD_ZONE);
    expect(Math.abs(angleDelta(light.prevAim, light.aim))).toBeLessThanOrEqual(RATE * STEP + 1e-9);
  });

  it('holds still with the mouse on top of the player', () => {
    const player = createPlayer(100, 100, 14, 180);
    const light = createFlashlight(true, 1);
    aimSystem(light, player, RATE, STEP, { x: 105, y: 103 }, DEAD_ZONE);
    expect(light.aim).toBe(1);
    expect(light.prevAim).toBe(1);
  });

  it('without a point it follows the walking direction, as always', () => {
    const player = createPlayer(0, 0, 14, 180);
    player.facingX = 0;
    player.facingY = 1;
    const light = createFlashlight(true, Math.PI / 2);
    aimSystem(light, player, BALANCE.flashlight.turnRate, STEP);
    expect(light.aim).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe('aiming with the mouse in the world', () => {
  /** Player in the corridor walking right, enemy behind on the left, ready to move. */
  function setup(classicLight = false) {
    const w = createWorld(CORRIDOR, { seed: 1, reduceFlicker: false, classicLight, godMode: true });
    const enemy = firstEnemy(w);
    w.player.x = w.player.prevX = 500;
    w.player.y = w.player.prevY = 72;
    w.player.facingX = 1;
    w.player.facingY = 0;
    w.flashlight.aim = w.flashlight.prevAim = 0;
    enemy.x = enemy.prevX = 400;
    enemy.y = enemy.prevY = 72;
    enemy.startTimer = 0;
    return { w, enemy };
  }

  it('lets the player walk away while the beam holds the enemy behind', () => {
    const { w, enemy } = setup();
    const input = aiming(enemy.x, enemy.y);
    input.axisX = 1;
    for (let i = 0; i < 20; i++) stepWorld(w, input, STEP);
    expect(enemy.lit).toBe(true);
    expect(w.pointerAiming).toBe(true);
    const x = enemy.x;
    const playerX = w.player.x;
    for (let i = 0; i < 20; i++) stepWorld(w, input, STEP);
    expect(enemy.x).toBe(x);
    expect(w.player.x).toBeGreaterThan(playerX);
    // The player still faces the way it walks.
    expect(w.player.facingX).toBe(1);
  });

  it('without the mouse the enemy behind is not stopped, as always', () => {
    const { w, enemy } = setup();
    const x = enemy.x;
    const input: StepInput = { axisX: 1, axisY: 0, toggleFlashlight: false, interact: false };
    for (let i = 0; i < 20; i++) stepWorld(w, input, STEP);
    expect(enemy.lit).toBe(false);
    expect(enemy.x).toBeGreaterThan(x);
    expect(w.pointerAiming).toBe(false);
  });

  it('does nothing with the classic light', () => {
    const { w } = setup(true);
    const before = w.flashlight.aim;
    const input = aiming(0, 72);
    for (let i = 0; i < 20; i++) stepWorld(w, input, STEP);
    expect(w.flashlight.aim).toBe(before);
    expect(w.pointerAiming).toBe(false);
  });

  it('stops or starts following the mouse when the light mode changes', () => {
    const { w } = setup();
    const input = aiming(0, 72);
    stepWorld(w, input, STEP);
    expect(w.pointerAiming).toBe(true);
    setLightMode(w, true);
    stepWorld(w, input, STEP);
    expect(w.pointerAiming).toBe(false);
  });

  it('does not change how fast the enemy is', () => {
    const { w, enemy } = setup();
    expect(enemy.speed).toBe(BALANCE.lightModes.cone.enemySpeed);
    stepWorld(w, aiming(enemy.x, enemy.y), STEP);
    expect(enemy.speed).toBe(BALANCE.lightModes.cone.enemySpeed);
  });
});
