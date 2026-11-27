import { describe, expect, it } from 'vitest';
import { angleDelta } from '../src/core/math';
import { BALANCE } from '../src/data/balance';
import { HOUSE } from '../src/data/rooms';
import { createFlashlight } from '../src/game/flashlight';
import { createPlayer } from '../src/game/player';
import { aimSystem } from '../src/game/systems/flashlight';
import { createWorld, resetWorld, stepWorld } from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;
const RATE = BALANCE.flashlight.turnRate;

describe('flashlight aim', () => {
  it('turns 540 degrees per second', () => {
    expect(RATE).toBeCloseTo((540 * Math.PI) / 180, 9);
  });

  it('turns from right to left in about a third of a second, never jumping', () => {
    const player = createPlayer(0, 0, 14, 180);
    player.facingX = -1;
    player.facingY = 0;
    const light = createFlashlight(true, 0);
    let steps = 0;
    while (Math.abs(angleDelta(light.aim, Math.PI)) > 1e-9 && steps < 100) {
      aimSystem(light, player, RATE, STEP);
      expect(Math.abs(angleDelta(light.prevAim, light.aim))).toBeLessThanOrEqual(
        RATE * STEP + 1e-9,
      );
      steps++;
    }
    expect(steps * STEP).toBeCloseTo(1 / 3, 1);
  });

  it('stays put while the player keeps facing the same way', () => {
    const player = createPlayer(0, 0, 14, 180);
    player.facingX = 0;
    player.facingY = 1;
    const light = createFlashlight(true, Math.PI / 2);
    aimSystem(light, player, RATE, STEP);
    expect(light.aim).toBeCloseTo(Math.PI / 2, 9);
    expect(light.prevAim).toBeCloseTo(Math.PI / 2, 9);
  });

  it('points down, where the player faces, at the start of a run', () => {
    const world = createWorld(HOUSE, { seed: 3, reduceFlicker: false });
    world.flashlight.aim = 0;
    world.flashlight.prevAim = 1;
    resetWorld(world);
    expect(world.flashlight.aim).toBeCloseTo(Math.PI / 2, 9);
    expect(world.flashlight.prevAim).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe('turn sensitivity', () => {
  /** Degrees the beam turns in one step toward the opposite side, with this scale. */
  function turnInOneStep(turnScale: number | undefined): number {
    const world = createWorld(HOUSE, {
      seed: 3,
      reduceFlicker: false,
      ...(turnScale === undefined ? {} : { turnScale }),
    });
    resetWorld(world);
    world.player.facingX = 0;
    world.player.facingY = -1;
    const before = world.flashlight.aim;
    stepWorld(world, { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false }, STEP);
    return (Math.abs(angleDelta(before, world.flashlight.aim)) * 180) / Math.PI;
  }

  it('is normal by default', () => {
    expect(turnInOneStep(undefined)).toBeCloseTo((RATE * STEP * 180) / Math.PI, 6);
  });

  it('scales how fast the beam turns, and only that', () => {
    const normal = turnInOneStep(1);
    expect(turnInOneStep(0.5)).toBeCloseTo(normal * 0.5, 6);
    expect(turnInOneStep(1.5)).toBeCloseTo(normal * 1.5, 6);
  });
});
