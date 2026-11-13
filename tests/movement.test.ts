import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { createWorld, stepWorld, type StepInput } from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;
const SPEED = BALANCE.player.speed;

const OPEN_ROOM = {
  id: 'open',
  layout: [
    '############',
    '#.........E#',
    '#..........#',
    '#....P.....#',
    '#..........#',
    '#K.........#',
    '#D##########',
  ],
};

function input(axisX: number, axisY: number, toggleFlashlight = false): StepInput {
  return { axisX, axisY, toggleFlashlight, interact: false };
}

describe('movement system', () => {
  it('moves speed * step per fixed step', () => {
    const world = createWorld(OPEN_ROOM);
    const startX = world.player.x;
    stepWorld(world, input(1, 0), STEP);
    expect(world.player.x - startX).toBeCloseTo(SPEED * STEP, 9);
  });

  it('covers speed units in one second of steps', () => {
    const world = createWorld(OPEN_ROOM);
    const startX = world.player.x;
    for (let i = 0; i < 60; i++) stepWorld(world, input(-1, 0), STEP);
    expect(startX - world.player.x).toBeCloseTo(SPEED, 6);
  });

  it('is not faster on diagonals', () => {
    const world = createWorld(OPEN_ROOM);
    const { x, y } = world.player;
    stepWorld(world, input(1, 1), STEP);
    const moved = Math.hypot(world.player.x - x, world.player.y - y);
    expect(moved).toBeCloseTo(SPEED * STEP, 9);
  });

  it('keeps the previous position for interpolation', () => {
    const world = createWorld(OPEN_ROOM);
    const startY = world.player.y;
    stepWorld(world, input(0, 1), STEP);
    expect(world.player.prevY).toBe(startY);
    stepWorld(world, input(0, 0), STEP);
    expect(world.player.prevY).toBe(world.player.y);
  });

  it('faces the last direction it moved in, also when blocked or stopped', () => {
    const world = createWorld(OPEN_ROOM);
    expect([world.player.facingX, world.player.facingY]).toEqual([0, 1]);
    stepWorld(world, input(-1, 0), STEP);
    expect([world.player.facingX, world.player.facingY]).toEqual([-1, 0]);
    stepWorld(world, input(1, -1), STEP);
    expect(world.player.facingX).toBeCloseTo(Math.SQRT1_2, 9);
    expect(world.player.facingY).toBeCloseTo(-Math.SQRT1_2, 9);
    stepWorld(world, input(0, 0), STEP);
    expect(world.player.facingX).toBeCloseTo(Math.SQRT1_2, 9);
    // Pushing against a wall still turns the player.
    for (let i = 0; i < 120; i++) stepWorld(world, input(0, -1), STEP);
    expect([world.player.facingX, world.player.facingY]).toEqual([0, -1]);
  });

  it('spawns the player at the center of the P tile', () => {
    const world = createWorld(OPEN_ROOM);
    const t = BALANCE.world.tileSize;
    expect(world.player.x).toBe(5.5 * t);
    expect(world.player.y).toBe(3.5 * t);
  });
});

describe('flashlight system', () => {
  it('starts with the configured state and toggles on request', () => {
    const world = createWorld(OPEN_ROOM);
    expect(world.flashlight.on).toBe(BALANCE.flashlight.startsOn);
    stepWorld(world, input(0, 0, true), STEP);
    expect(world.flashlight.on).toBe(!BALANCE.flashlight.startsOn);
    stepWorld(world, input(0, 0, false), STEP);
    expect(world.flashlight.on).toBe(!BALANCE.flashlight.startsOn);
    // A press within the minimum interval is ignored (photosensitivity).
    stepWorld(world, input(0, 0, true), STEP);
    expect(world.flashlight.on).toBe(!BALANCE.flashlight.startsOn);
    const wait = Math.ceil(BALANCE.flashlight.minToggleInterval / STEP);
    for (let i = 0; i < wait; i++) stepWorld(world, input(0, 0, false), STEP);
    stepWorld(world, input(0, 0, true), STEP);
    expect(world.flashlight.on).toBe(BALANCE.flashlight.startsOn);
  });
});
