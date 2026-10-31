import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { RoomDef } from '../src/data/rooms';
import { clearEvents } from '../src/game/events';
import { createWorld, stepWorld, type StepInput, type World } from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;
const T = BALANCE.world.tileSize;

const ROOM: RoomDef = {
  id: 'events',
  layout: ['##########', '#P.KB....D', '#........#', '#.......E#', '##########'],
};

function input(partial: Partial<StepInput> = {}): StepInput {
  return { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false, ...partial };
}

function world(godMode = false): World {
  const w = createWorld(ROOM, { seed: 1, reduceFlicker: false, godMode });
  w.enemy.startTimer = 1e9;
  return w;
}

describe('world events (for sound)', () => {
  it('report movement and light toggles', () => {
    const w = world();
    stepWorld(w, input({ axisX: 1 }), STEP);
    expect(w.events.moving).toBe(true);
    clearEvents(w.events);
    stepWorld(w, input({ toggleFlashlight: true }), STEP);
    expect(w.events.moving).toBe(false);
    expect(w.events.lightToggled).toBe(1);
  });

  it('report pickups and the locked door', () => {
    const w = world();
    w.player.x = 3.5 * T;
    stepWorld(w, input({ interact: true }), STEP);
    expect(w.events.keyPicked).toBe(1);
    w.player.x = 4.5 * T;
    stepWorld(w, input({ interact: true }), STEP);
    expect(w.events.batteryPicked).toBe(1);
    w.player.x = 8.5 * T;
    stepWorld(w, input({ interact: true }), STEP);
    expect(w.events.doorOpened).toBe(1);
    expect(w.status).toBe('won');
  });

  it('report a locked door when keys are missing', () => {
    const w = world();
    w.player.x = 8.5 * T;
    stepWorld(w, input({ interact: true }), STEP);
    expect(w.events.doorLocked).toBe(1);
    expect(w.status).toBe('playing');
  });

  it('report the enemy entering the light once, and an empty battery', () => {
    const w = world();
    w.flashlight.on = true;
    w.enemy.x = w.player.x + 3 * T;
    w.enemy.y = w.player.y;
    stepWorld(w, input(), STEP);
    stepWorld(w, input(), STEP);
    expect(w.events.enemyLit).toBe(1);

    w.flashlight.battery = 0.00001;
    stepWorld(w, input(), STEP);
    expect(w.events.batteryEmptied).toBe(1);
    expect(w.flashlight.on).toBe(false);
  });

  it('report the catch, except in god mode', () => {
    const w = world();
    w.enemy.x = w.player.x;
    w.enemy.y = w.player.y;
    stepWorld(w, input(), STEP);
    expect(w.events.caught).toBe(1);
    expect(w.status).toBe('lost');

    const god = world(true);
    god.enemy.x = god.player.x;
    god.enemy.y = god.player.y;
    stepWorld(god, input(), STEP);
    expect(god.events.caught).toBe(0);
    expect(god.status).toBe('playing');
  });
});
