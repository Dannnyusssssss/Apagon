import { describe, expect, it } from 'vitest';
import { InputState } from '../src/core/input';
import { limitToUnit } from '../src/core/math';

const axis = { x: 0, y: 0 };

describe('InputState', () => {
  it('maps WASD and arrows to the movement axis', () => {
    const input = new InputState();
    input.keyDown('KeyD', false);
    input.keyDown('ArrowUp', false);
    expect(input.readAxis(axis)).toEqual({ x: 1, y: -1 });
    input.keyUp('KeyD');
    input.keyUp('ArrowUp');
    input.keyDown('ArrowLeft', false);
    input.keyDown('KeyS', false);
    expect(input.readAxis(axis)).toEqual({ x: -1, y: 1 });
  });

  it('cancels opposite directions', () => {
    const input = new InputState();
    input.keyDown('KeyA', false);
    input.keyDown('KeyD', false);
    expect(input.readAxis(axis).x).toBe(0);
  });

  it('requests one flashlight toggle per press, ignoring key repeat', () => {
    const input = new InputState();
    input.keyDown('KeyF', false);
    input.keyDown('KeyF', true);
    input.keyDown('KeyF', true);
    expect(input.consumeToggle()).toBe(true);
    expect(input.consumeToggle()).toBe(false);
    input.keyUp('KeyF');
    input.keyDown('ShiftLeft', false);
    expect(input.consumeToggle()).toBe(true);
  });

  it('prevents the default action only for arrows and space', () => {
    const input = new InputState();
    expect(input.keyDown('ArrowDown', false)).toBe(true);
    expect(input.keyDown('Space', false)).toBe(true);
    expect(input.keyDown('KeyW', false)).toBe(false);
    expect(input.keyDown('Tab', false)).toBe(false);
    expect(input.keyDown('Escape', false)).toBe(false);
    expect(input.keyDown('KeyF', false)).toBe(false);
  });

  it('clear releases every key and pending toggle', () => {
    const input = new InputState();
    input.keyDown('KeyW', false);
    input.keyDown('KeyF', false);
    input.clear();
    expect(input.readAxis(axis)).toEqual({ x: 0, y: 0 });
    expect(input.consumeToggle()).toBe(false);
  });
});

describe('limitToUnit', () => {
  it('normalizes diagonals and leaves short vectors alone', () => {
    const out = { x: 0, y: 0 };
    limitToUnit(1, 1, out);
    expect(Math.hypot(out.x, out.y)).toBeCloseTo(1, 9);
    limitToUnit(0.5, 0, out);
    expect(out).toEqual({ x: 0.5, y: 0 });
  });
});
