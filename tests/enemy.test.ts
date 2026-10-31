import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { RoomDef } from '../src/data/rooms';
import { createWorld, stepWorld, type StepInput, type World } from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;
const START_STEPS = Math.ceil(BALANCE.enemy.startDelaySeconds / STEP) + 1;
const FREEZE_STEPS = Math.round(BALANCE.enemy.freezeAfterLightSeconds / STEP);
const LIT_RADIUS = BALANCE.flashlight.radius * BALANCE.visibility.litRadiusFraction;
const SEED = 7;

const IDLE: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };

const CORRIDOR: RoomDef = {
  id: 'corridor',
  layout: ['#############', '#P.........K#', '#..........E#', '#D###########'],
};

// The enemy has to walk around the wall through the bottom row.
const AROUND: RoomDef = {
  id: 'around',
  layout: ['#########', '#P..#..E#', '#...#...#', '#...#...#', '#..K....#', '#D#######'],
};

function world(room: RoomDef, lightOn: boolean): World {
  const w = createWorld(room, { seed: SEED, reduceFlicker: false });
  w.flashlight.on = lightOn;
  return w;
}

/** Keeps the battery full, so the light radius stays fixed while testing the chase. */
function run(w: World, steps: number): void {
  for (let i = 0; i < steps; i++) {
    w.flashlight.battery = 1;
    stepWorld(w, IDLE, STEP);
  }
}

function distance(w: World): number {
  return Math.hypot(w.enemy.x - w.player.x, w.enemy.y - w.player.y);
}

describe('enemy chase', () => {
  it('waits before moving at the start of a run', () => {
    const w = world(CORRIDOR, false);
    const { x, y } = w.enemy;
    run(w, START_STEPS - 2);
    expect(w.enemy.x).toBe(x);
    expect(w.enemy.y).toBe(y);
    run(w, 3);
    expect(w.enemy.x).toBeLessThan(x);
  });

  it('moves toward the player at its speed while in the dark', () => {
    const w = world(CORRIDOR, false);
    run(w, START_STEPS);
    const before = distance(w);
    run(w, 30);
    expect(before - distance(w)).toBeCloseTo(BALANCE.enemy.speed * STEP * 30, 0);
  });

  it('goes around walls and reaches the player', () => {
    const w = world(AROUND, false);
    let steps = 0;
    while (w.status === 'playing' && steps < 60 * 15) {
      stepWorld(w, IDLE, STEP);
      steps++;
    }
    expect(w.status).toBe('lost');
  });

  it('is not stopped by light that a wall blocks', () => {
    const w = world(AROUND, true);
    run(w, START_STEPS);
    // In range of the light, but behind the wall.
    const t = BALANCE.world.tileSize;
    w.enemy.x = 5.5 * t;
    w.enemy.y = 1.5 * t;
    expect(distance(w)).toBeLessThan(LIT_RADIUS);
    const { x, y } = w.enemy;
    run(w, 10);
    expect(w.enemy.lit).toBe(false);
    expect(w.enemy.x !== x || w.enemy.y !== y).toBe(true);
  });
});

describe('enemy and light', () => {
  it('stands still while lit and never reaches the player', () => {
    const w = world(CORRIDOR, true);
    run(w, 60 * 20);
    expect(w.status).toBe('playing');
    expect(w.enemy.lit).toBe(true);
    // It stops at the edge of the lit radius, give or take one step.
    expect(distance(w)).toBeGreaterThan(LIT_RADIUS - BALANCE.enemy.speed * STEP * 2);
    const { x, y } = w.enemy;
    run(w, 60);
    expect(w.enemy.x).toBe(x);
    expect(w.enemy.y).toBe(y);
  });

  it('keeps still for a moment after leaving the light, then chases again', () => {
    const w = world(CORRIDOR, true);
    run(w, 60 * 10);
    expect(w.enemy.lit).toBe(true);
    w.flashlight.on = false;
    const x = w.enemy.x;
    run(w, FREEZE_STEPS);
    expect(w.enemy.lit).toBe(false);
    expect(w.enemy.x).toBe(x);
    run(w, 3);
    expect(w.enemy.x).toBeLessThan(x);
  });

  it('starts again from the full freeze time if lit during the freeze', () => {
    const w = world(CORRIDOR, true);
    run(w, 60 * 10);
    w.flashlight.on = false;
    run(w, FREEZE_STEPS - 5);
    w.flashlight.on = true;
    run(w, 1);
    w.flashlight.on = false;
    const x = w.enemy.x;
    run(w, FREEZE_STEPS);
    expect(w.enemy.x).toBe(x);
  });
});

describe('enemy start', () => {
  const THREE_STARTS: RoomDef = {
    id: 'starts',
    layout: ['#########', '#E.....E#', '#...P...#', '#E.....K#', '#D#######'],
  };

  it('is the same for the same seed', () => {
    const a = createWorld(THREE_STARTS, { seed: 42, reduceFlicker: false });
    const b = createWorld(THREE_STARTS, { seed: 42, reduceFlicker: false });
    expect(a.enemy.x).toBe(b.enemy.x);
    expect(a.enemy.y).toBe(b.enemy.y);
  });

  it('uses every marked start across seeds', () => {
    const starts = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      const w = createWorld(THREE_STARTS, { seed, reduceFlicker: false });
      starts.add(`${String(w.enemy.x)},${String(w.enemy.y)}`);
    }
    expect(starts.size).toBe(3);
  });
});
