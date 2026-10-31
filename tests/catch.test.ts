import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { RoomDef } from '../src/data/rooms';
import { createWorld, resetWorld, stepWorld, type StepInput } from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;

const ROOM: RoomDef = {
  id: 'catch',
  layout: ['##########', '#P......E#', '#.......K#', '#D########'],
};

const IDLE: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };
const RIGHT: StepInput = { axisX: 1, axisY: 0, toggleFlashlight: false, interact: false };

describe('defeat', () => {
  it('happens when the enemy reaches the player', () => {
    const w = createWorld(ROOM, { seed: 3, reduceFlicker: false });
    w.flashlight.on = false;
    w.enemy.x = w.player.x + BALANCE.enemy.catchDistance + 5;
    w.enemy.y = w.player.y;
    stepWorld(w, IDLE, STEP);
    expect(w.status).toBe('playing');

    w.enemy.x = w.player.x + BALANCE.enemy.catchDistance - 1;
    stepWorld(w, IDLE, STEP);
    expect(w.status).toBe('lost');
  });

  it('freezes the world once lost', () => {
    const w = createWorld(ROOM, { seed: 3, reduceFlicker: false });
    w.enemy.x = w.player.x;
    w.enemy.y = w.player.y;
    stepWorld(w, IDLE, STEP);
    expect(w.status).toBe('lost');
    const { x } = w.player;
    for (let i = 0; i < 30; i++) stepWorld(w, RIGHT, STEP);
    expect(w.player.x).toBe(x);
    expect(w.player.prevX).toBe(x);
  });

  it('retry puts everything back at the start', () => {
    const w = createWorld(ROOM, { seed: 3, reduceFlicker: false });
    const startX = w.player.x;
    const startY = w.player.y;
    for (let i = 0; i < 20; i++) stepWorld(w, RIGHT, STEP);
    w.flashlight.on = !BALANCE.flashlight.startsOn;
    w.enemy.x = w.player.x;
    w.enemy.y = w.player.y;
    stepWorld(w, IDLE, STEP);
    expect(w.status).toBe('lost');

    resetWorld(w);
    expect(w.status).toBe('playing');
    expect(w.player.x).toBe(startX);
    expect(w.player.y).toBe(startY);
    expect(w.flashlight.on).toBe(BALANCE.flashlight.startsOn);
    expect(w.flashlight.strength).toBe(1);
    expect(w.enemy.x).toBe(8.5 * BALANCE.world.tileSize);
    expect(w.enemy.startTimer).toBe(BALANCE.enemy.startDelaySeconds);
    stepWorld(w, IDLE, STEP);
    expect(w.status).toBe('playing');
  });
});
