import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../src/core/math';
import { moveBox } from '../src/game/collision';
import { isWall, parseRoom } from '../src/game/rooms';

const T = 48;
const HALF = 14;

// Spawn tile center is (72, 72). Single interior wall at col 2, row 2.
const room = parseRoom(
  {
    id: 'collision',
    layout: ['#####', '#P.K#', '#.#.#', '#..E#', '#D###'],
  },
  T,
);

function at(x: number, y: number): Vec2 {
  return { x, y };
}

describe('moveBox', () => {
  it('moves freely over floor', () => {
    const pos = at(72, 72);
    moveBox(room, pos, HALF, 10, 0);
    expect(pos).toEqual({ x: 82, y: 72 });
  });

  it('stops flush against a wall on the right', () => {
    const pos = at(72, 72);
    moveBox(room, pos, HALF, 200, 0);
    expect(pos.x).toBe(4 * T - HALF);
  });

  it('stops flush against a wall on the left', () => {
    const pos = at(72, 72);
    moveBox(room, pos, HALF, -100, 0);
    expect(pos.x).toBe(T + HALF);
  });

  it('stops flush against walls above and below', () => {
    const up = at(72, 72);
    moveBox(room, up, HALF, 0, -100);
    expect(up.y).toBe(T + HALF);

    const down = at(72, 168);
    moveBox(room, down, HALF, 0, 100);
    expect(down.y).toBe(4 * T - HALF);
  });

  it('slides along a wall when moving diagonally into it', () => {
    const pos = at(72, 72);
    moveBox(room, pos, HALF, 50, -50);
    expect(pos.x).toBeCloseTo(122, 9);
    expect(pos.y).toBe(T + HALF);
  });

  it('is stopped by an interior wall at a corner', () => {
    const pos = at(72, 72);
    moveBox(room, pos, HALF, 30, 30);
    expect(pos.x).toBe(102);
    expect(pos.y).toBe(2 * T - HALF);
  });

  it('does not tunnel through a one-tile wall at high speed', () => {
    const pos = at(72, 120);
    moveBox(room, pos, HALF, 1000, 0);
    expect(pos.x).toBe(2 * T - HALF);
  });

  it('can rest exactly against a wall and still move away', () => {
    const pos = at(T + HALF, 72);
    moveBox(room, pos, HALF, 0, 20);
    expect(pos).toEqual({ x: T + HALF, y: 92 });
    moveBox(room, pos, HALF, 5, 0);
    expect(pos.x).toBe(T + HALF + 5);
  });

  it('never leaves the room bounds', () => {
    const pos = at(72, 72);
    moveBox(room, pos, HALF, -5000, -5000);
    expect(pos.x).toBeGreaterThanOrEqual(T + HALF);
    expect(pos.y).toBeGreaterThanOrEqual(T + HALF);
  });
});

describe('isWall', () => {
  it('treats tiles outside the grid as walls', () => {
    expect(isWall(room, -1, 1)).toBe(true);
    expect(isWall(room, 1, -1)).toBe(true);
    expect(isWall(room, 5, 1)).toBe(true);
    expect(isWall(room, 1, 5)).toBe(true);
    expect(isWall(room, 1, 1)).toBe(false);
  });
});
