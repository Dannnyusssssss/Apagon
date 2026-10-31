import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { RoomDef } from '../src/data/rooms';
import { createWorld, resetWorld, stepWorld, type StepInput, type World } from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;
const T = BALANCE.world.tileSize;

// Keys at (2,1) and (4,1), a battery at (6,1), door at (8,1) on the right wall.
// The enemy starts far away, behind a wall, and the tests are short.
const ROOM: RoomDef = {
  id: 'objective',
  layout: ['#########', '#PK.K.B.D', '#.......#', '#######.#', '#E......#', '#########'],
};

const IDLE: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };
const PRESS_E: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: true };

function world(): World {
  return createWorld(ROOM, { seed: 1, reduceFlicker: false });
}

/** Puts the player at the center of a tile and runs one idle step to update prompts. */
function standOn(w: World, col: number, row: number): void {
  w.player.x = (col + 0.5) * T;
  w.player.y = (row + 0.5) * T;
  stepWorld(w, IDLE, STEP);
}

describe('keys and interaction', () => {
  it('needs the player in reach and E pressed', () => {
    const w = world();
    standOn(w, 4, 2);
    expect(w.interact.prompt).toBe('none');
    stepWorld(w, PRESS_E, STEP);
    expect(w.inventory.keys).toBe(0);

    standOn(w, 2, 1);
    expect(w.interact.prompt).toBe('pickKey');
    stepWorld(w, IDLE, STEP);
    expect(w.inventory.keys).toBe(0);
    stepWorld(w, PRESS_E, STEP);
    expect(w.inventory.keys).toBe(1);
  });

  it('picks each key only once', () => {
    const w = world();
    standOn(w, 2, 1);
    stepWorld(w, PRESS_E, STEP);
    stepWorld(w, PRESS_E, STEP);
    expect(w.inventory.keys).toBe(1);
    expect(w.items.filter((i) => i.taken).length).toBe(1);
  });

  it('picks the closest item when several are in reach', () => {
    const w = world();
    w.player.x = 3.8 * T;
    w.player.y = 1.5 * T;
    stepWorld(w, PRESS_E, STEP);
    const taken = w.items.find((i) => i.taken);
    expect(taken?.x).toBe(4.5 * T);
  });

  it('recharges the battery with a battery pickup', () => {
    const w = world();
    w.flashlight.battery = 0.1;
    standOn(w, 6, 1);
    expect(w.interact.prompt).toBe('pickBattery');
    stepWorld(w, PRESS_E, STEP);
    expect(w.flashlight.battery).toBeGreaterThan(0.1 + BALANCE.battery.rechargeAmount - 0.01);
  });
});

describe('exit door', () => {
  it('stays locked until every key is collected', () => {
    const w = world();
    standOn(w, 7, 1);
    expect(w.interact.prompt).toBe('doorLocked');
    stepWorld(w, PRESS_E, STEP);
    expect(w.status).toBe('playing');
  });

  it('is solid for the player', () => {
    const w = world();
    standOn(w, 7, 1);
    const right: StepInput = { axisX: 1, axisY: 0, toggleFlashlight: false, interact: false };
    for (let i = 0; i < 60; i++) stepWorld(w, right, STEP);
    expect(w.player.x).toBeLessThanOrEqual(8 * T - w.player.radius);
  });

  it('opens with all keys and wins the run', () => {
    const w = world();
    standOn(w, 2, 1);
    stepWorld(w, PRESS_E, STEP);
    standOn(w, 4, 1);
    stepWorld(w, PRESS_E, STEP);
    standOn(w, 7, 1);
    expect(w.interact.prompt).toBe('openDoor');
    const before = w.elapsedSeconds;
    stepWorld(w, PRESS_E, STEP);
    expect(w.status).toBe('won');
    expect(w.elapsedSeconds).toBeCloseTo(before + STEP, 9);
    // Frozen after winning.
    stepWorld(w, IDLE, STEP);
    expect(w.elapsedSeconds).toBeCloseTo(before + STEP, 9);
  });

  it('retry restores keys, items, battery and timer', () => {
    const w = world();
    standOn(w, 2, 1);
    stepWorld(w, PRESS_E, STEP);
    w.flashlight.battery = 0.2;
    resetWorld(w);
    expect(w.inventory.keys).toBe(0);
    expect(w.items.every((i) => !i.taken)).toBe(true);
    expect(w.flashlight.battery).toBe(1);
    expect(w.elapsedSeconds).toBe(0);
    expect(w.status).toBe('playing');
  });
});

describe('battery in the world', () => {
  it('drains with the light on during play', () => {
    const w = world();
    w.flashlight.on = true;
    w.enemy.startTimer = 1e9; // keep the enemy out of this long test
    const steps = Math.round(BALANCE.battery.drainSeconds / 2 / STEP);
    for (let i = 0; i < steps; i++) stepWorld(w, IDLE, STEP);
    expect(w.flashlight.battery).toBeCloseTo(0.5, 2);
  });
});

describe('enemy near signal', () => {
  it('grows as the enemy gets closer', () => {
    const w = world();
    w.enemy.x = w.player.x + BALANCE.warning.enemyNearDistance + 10;
    w.enemy.y = w.player.y;
    stepWorld(w, IDLE, STEP);
    expect(w.enemyNear).toBe(0);
    w.enemy.x = w.player.x + BALANCE.warning.enemyNearDistance / 2;
    w.enemy.startTimer = 10;
    stepWorld(w, IDLE, STEP);
    expect(w.enemyNear).toBeCloseTo(0.5, 6);
  });
});
