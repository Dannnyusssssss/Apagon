import { describe, expect, it } from 'vitest';
import { Joystick } from '../src/core/joystick';
import { angleDelta, type Vec2 } from '../src/core/math';
import {
  isTooSoonAfterOpening,
  stickZone,
  touchControlsVisible,
  TouchSticks,
} from '../src/core/touch';
import { BALANCE } from '../src/data/balance';
import { TOUCH } from '../src/data/controls';
import type { RoomDef } from '../src/data/rooms';
import { TEXTS } from '../src/data/texts';
import { createWorld, stepWorld, type StepInput } from '../src/game/world';
import { promptText } from '../src/ui/prompts';
import { firstEnemy } from './helpers';

const WIDTH = 800;
const RADIUS = TOUCH.stickRadius;
const DEAD = RADIUS * TOUCH.stickDeadZone;

describe('Joystick', () => {
  it('stays still until the finger leaves the dead zone', () => {
    const stick = new Joystick();
    stick.start(1, 0, 0);
    expect(stick.active).toBe(true);
    stick.move(DEAD, 0);
    expect([stick.x, stick.y, stick.hasDirection]).toEqual([0, 0, false]);
    stick.move(DEAD + 1, 0);
    expect([stick.x, stick.y, stick.hasDirection]).toEqual([1, 0, true]);
  });

  it('gives full speed in any direction past the dead zone', () => {
    const stick = new Joystick();
    stick.start(1, 0, 0);
    for (const [x, y] of [
      [DEAD + 1, 0],
      [0, -RADIUS],
      [-30, 40],
      [300, 400],
    ] as const) {
      stick.move(x, y);
      expect(Math.hypot(stick.x, stick.y)).toBeCloseTo(1, 9);
      expect(Math.atan2(stick.y, stick.x)).toBeCloseTo(Math.atan2(y, x), 9);
    }
  });

  it('limits the knob to the radius, without moving the origin', () => {
    const stick = new Joystick();
    stick.start(1, 50, 50);
    stick.move(50 + 300, 50 + 400);
    expect(Math.hypot(stick.knobX, stick.knobY)).toBeCloseTo(RADIUS, 9);
    expect([stick.originX, stick.originY]).toEqual([50, 50]);
    stick.move(60, 50);
    expect([stick.knobX, stick.knobY]).toEqual([10, 0]);
  });

  it('remembers the last direction inside the dead zone until it is released', () => {
    const stick = new Joystick();
    stick.start(1, 0, 0);
    stick.move(0, 40);
    stick.move(0, 1);
    expect([stick.x, stick.y]).toEqual([0, 0]);
    expect([stick.lastX, stick.lastY]).toEqual([0, 1]);
    stick.release();
    expect(stick.active).toBe(false);
    expect([stick.lastX, stick.lastY, stick.knobX, stick.knobY]).toEqual([0, 0, 0, 0]);
    expect(stick.hasDirection).toBe(false);
  });

  it('ignores moves while free', () => {
    const stick = new Joystick();
    stick.move(100, 100);
    expect([stick.x, stick.y, stick.knobX]).toEqual([0, 0, 0]);
  });
});

describe('stickZone', () => {
  it('moves on the left half and aims on the right one', () => {
    expect(stickZone(0, WIDTH, false)).toBe('move');
    expect(stickZone(399, WIDTH, false)).toBe('move');
    expect(stickZone(400, WIDTH, false)).toBe('aim');
    expect(stickZone(799, WIDTH, false)).toBe('aim');
  });

  it('swaps the sides for left-handed players', () => {
    expect(stickZone(100, WIDTH, true)).toBe('aim');
    expect(stickZone(700, WIDTH, true)).toBe('move');
  });
});

describe('TouchSticks', () => {
  const out: Vec2 = { x: 0, y: 0 };

  it('tracks two fingers at once, each with its own stick', () => {
    const sticks = new TouchSticks();
    expect(sticks.down(11, 100, 300, WIDTH, false, true)).toBe('move');
    expect(sticks.down(22, 700, 300, WIDTH, false, true)).toBe('aim');
    expect(sticks.moveTo(22, 700, 200)).toBe('aim');
    expect(sticks.moveTo(11, 200, 300)).toBe('move');
    expect([sticks.move.x, sticks.move.y]).toEqual([1, 0]);
    expect([sticks.aim.x, sticks.aim.y]).toEqual([0, -1]);
  });

  it('lifting one finger leaves the other working', () => {
    const sticks = new TouchSticks();
    sticks.down(1, 100, 300, WIDTH, false, true);
    sticks.down(2, 700, 300, WIDTH, false, true);
    expect(sticks.up(2)).toBe('aim');
    expect(sticks.aim.active).toBe(false);
    expect(sticks.moveTo(1, 200, 300)).toBe('move');
    expect(sticks.move.x).toBe(1);
  });

  it('a second finger on a taken side does not steal the stick', () => {
    const sticks = new TouchSticks();
    sticks.down(1, 100, 300, WIDTH, false, true);
    sticks.moveTo(1, 200, 300);
    expect(sticks.down(2, 50, 50, WIDTH, false, true)).toBeNull();
    expect(sticks.move.pointerId).toBe(1);
    expect(sticks.moveTo(2, 0, 0)).toBeNull();
    expect(sticks.move.x).toBe(1);
    // Lifting the ignored finger changes nothing.
    expect(sticks.up(2)).toBeNull();
    expect(sticks.move.active).toBe(true);
  });

  it('a finger keeps its stick when it crosses to the other side', () => {
    const sticks = new TouchSticks();
    sticks.down(1, 390, 300, WIDTH, false, true);
    expect(sticks.moveTo(1, 700, 300)).toBe('move');
    expect(sticks.aim.active).toBe(false);
    expect(sticks.move.x).toBe(1);
  });

  it('ignores the aim side when aiming does not apply', () => {
    const sticks = new TouchSticks();
    expect(sticks.down(1, 700, 300, WIDTH, false, false)).toBeNull();
    expect(sticks.aim.active).toBe(false);
    // Moving still works.
    expect(sticks.down(2, 100, 300, WIDTH, false, false)).toBe('move');
  });

  it('a repeated id starts over instead of holding both sticks', () => {
    const sticks = new TouchSticks();
    sticks.down(1, 100, 300, WIDTH, false, true);
    expect(sticks.down(1, 700, 300, WIDTH, false, true)).toBe('aim');
    expect(sticks.move.active).toBe(false);
    expect(sticks.aim.pointerId).toBe(1);
  });

  it('forgets every finger when cleared, and their later moves do nothing', () => {
    const sticks = new TouchSticks();
    sticks.down(1, 100, 300, WIDTH, false, true);
    sticks.down(2, 700, 300, WIDTH, false, true);
    sticks.clear();
    expect(sticks.move.active || sticks.aim.active).toBe(false);
    expect(sticks.moveTo(1, 300, 300)).toBeNull();
    expect(sticks.up(2)).toBeNull();
  });

  it('applyMove replaces the keyboard axis only while the stick points somewhere', () => {
    const sticks = new TouchSticks();
    const axis: Vec2 = { x: 1, y: 0 };
    sticks.applyMove(axis);
    expect(axis).toEqual({ x: 1, y: 0 });
    sticks.down(1, 100, 300, WIDTH, false, true);
    sticks.applyMove(axis);
    expect(axis).toEqual({ x: 1, y: 0 });
    sticks.moveTo(1, 100, 200);
    sticks.applyMove(axis);
    expect(axis).toEqual({ x: 0, y: -1 });
  });

  it('aimPoint is null until the thumb leaves the dead zone', () => {
    const sticks = new TouchSticks();
    expect(sticks.aimPoint(10, 20, out)).toBeNull();
    sticks.down(1, 700, 300, WIDTH, false, true);
    expect(sticks.aimPoint(10, 20, out)).toBeNull();
    sticks.moveTo(1, 700, 340);
    expect(sticks.aimPoint(10, 20, out)).toEqual({ x: 10, y: 20 + TOUCH.aimReach });
  });

  it('aimPoint holds the direction at the center and ends when the thumb lifts', () => {
    const sticks = new TouchSticks();
    sticks.down(1, 700, 300, WIDTH, false, true);
    sticks.moveTo(1, 660, 300);
    sticks.moveTo(1, 700, 300);
    expect(sticks.aimPoint(0, 0, out)).toEqual({ x: -TOUCH.aimReach, y: 0 });
    sticks.up(1);
    expect(sticks.aimPoint(0, 0, out)).toBeNull();
  });

  it('aims outside the dead zone the game uses for the mouse', () => {
    expect(TOUCH.aimReach).toBeGreaterThan(BALANCE.flashlight.pointerDeadZone * 10);
  });
});

describe('aiming with the stick in the world', () => {
  const ROOM: RoomDef = {
    id: 'corridor',
    layout: [
      '######################',
      '#P..................K#',
      '#...................E#',
      '#D####################',
    ],
  };
  const STEP = BALANCE.simulation.stepSeconds;

  function setup(classicLight = false) {
    const w = createWorld(ROOM, { seed: 1, reduceFlicker: false, classicLight, godMode: true });
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

  /** Walks right with one stick, and points left with the other if `aiming`. */
  function play(world: ReturnType<typeof createWorld>, aiming: boolean, steps: number): void {
    const sticks = new TouchSticks();
    const axis: Vec2 = { x: 0, y: 0 };
    const point: Vec2 = { x: 0, y: 0 };
    sticks.down(1, 100, 300, WIDTH, false, true);
    sticks.moveTo(1, 200, 300);
    if (aiming) {
      sticks.down(2, 700, 300, WIDTH, false, true);
      sticks.moveTo(2, 600, 300);
    }
    const input: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };
    for (let i = 0; i < steps; i++) {
      axis.x = 0;
      axis.y = 0;
      sticks.applyMove(axis);
      input.axisX = axis.x;
      input.axisY = axis.y;
      input.aimAt = sticks.aimPoint(world.player.x, world.player.y, point);
      stepWorld(world, input, STEP);
    }
  }

  it('walks away while the beam holds the enemy behind', () => {
    const { w, enemy } = setup();
    const startX = w.player.x;
    play(w, true, 20);
    expect(enemy.lit).toBe(true);
    expect(w.player.x).toBeGreaterThan(startX);
    expect(Math.abs(angleDelta(w.flashlight.aim, Math.PI))).toBeLessThan(0.01);
  });

  it('moves at the same speed as the keyboard', () => {
    const { w } = setup();
    const keyboard = setup().w;
    play(w, false, 10);
    const input: StepInput = { axisX: 1, axisY: 0, toggleFlashlight: false, interact: false };
    for (let i = 0; i < 10; i++) stepWorld(keyboard, input, STEP);
    expect(w.player.x).toBeCloseTo(keyboard.player.x, 9);
  });

  it('without the aim stick the light follows the walk, as with the keyboard', () => {
    const { w, enemy } = setup();
    play(w, false, 30);
    expect(enemy.lit).toBe(false);
    expect(w.flashlight.aim).toBeCloseTo(0, 9);
  });
});

describe('touchControlsVisible', () => {
  it('follows the detection when automatic', () => {
    expect(touchControlsVisible('auto', false)).toBe(false);
    expect(touchControlsVisible('auto', true)).toBe(true);
  });

  it('is fixed when always or never', () => {
    expect(touchControlsVisible('always', false)).toBe(true);
    expect(touchControlsVisible('never', true)).toBe(false);
  });
});

describe('isTooSoonAfterOpening', () => {
  it('ignores a late tap, then accepts them', () => {
    expect(isTooSoonAfterOpening(1000, 1000)).toBe(true);
    expect(isTooSoonAfterOpening(1000 + TOUCH.endScreenGuardMs - 1, 1000)).toBe(true);
    expect(isTooSoonAfterOpening(1000 + TOUCH.endScreenGuardMs, 1000)).toBe(false);
  });
});

describe('promptText', () => {
  it('names the key on the keyboard and only the action with touch controls', () => {
    expect(promptText('pickKey', 0, 'door', false)).toBe(TEXTS.hud.pickKey);
    expect(promptText('pickKey', 0, 'door', true)).toBe(TEXTS.touch.prompts.pickKey);
    expect(promptText('pickBattery', 0, 'door', true)).toBe(TEXTS.touch.prompts.pickBattery);
    for (const prompt of Object.values(TEXTS.touch.prompts)) {
      expect(prompt).not.toMatch(/^E:/);
    }
  });

  it('names the exit of the level', () => {
    expect(promptText('openDoor', 0, 'door', true)).toBe(TEXTS.touch.prompts.openDoor);
    expect(promptText('openDoor', 0, 'gate', true)).toBe(TEXTS.touch.prompts.openGate);
    expect(promptText('openDoor', 0, 'gate', false)).toBe(TEXTS.hud.openGate);
  });

  it('counts the missing keys, and is empty with nothing at hand', () => {
    expect(promptText('doorLocked', 2, 'door', true)).toBe(TEXTS.hud.missingKeys(2));
    expect(promptText('none', 0, 'door', true)).toBe('');
  });
});
