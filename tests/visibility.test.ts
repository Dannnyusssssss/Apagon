import { describe, expect, it } from 'vitest';
import { isWall, parseRoom } from '../src/game/rooms';
import { castRay, castVisibility, hasLineOfSight, isLit } from '../src/game/visibility';

const T = 10;

// Interior wall at column 3, rows 1-3; the bottom row is open.
const ROOM = parseRoom(
  {
    id: 'vis',
    layout: ['########', '#P.#..E#', '#..#...#', '#..#...#', '#......#', '########'],
  },
  T,
);

describe('castRay', () => {
  it('stops at the first wall', () => {
    expect(castRay(ROOM, 15, 15, 1, 0, 100)).toBeCloseTo(15, 9);
    expect(castRay(ROOM, 15, 15, 0, -1, 100)).toBeCloseTo(5, 9);
  });

  it('returns the max distance when nothing is hit', () => {
    expect(castRay(ROOM, 15, 45, 1, 0, 20)).toBe(20);
  });

  it('returns 0 from inside a wall', () => {
    expect(castRay(ROOM, 35, 15, 1, 0, 100)).toBe(0);
  });
});

describe('hasLineOfSight', () => {
  it('is blocked by walls and clear in open space', () => {
    expect(hasLineOfSight(ROOM, 15, 15, 55, 15)).toBe(false);
    expect(hasLineOfSight(ROOM, 15, 45, 65, 45)).toBe(true);
    expect(hasLineOfSight(ROOM, 15, 15, 25, 35)).toBe(true);
  });
});

describe('isLit', () => {
  it('needs the light on, the point in range and no wall in between', () => {
    expect(isLit(ROOM, true, 15, 45, 100, 65, 45)).toBe(true);
    expect(isLit(ROOM, false, 15, 45, 100, 65, 45)).toBe(false);
    expect(isLit(ROOM, true, 15, 45, 30, 65, 45)).toBe(false);
    expect(isLit(ROOM, true, 15, 15, 100, 55, 15)).toBe(false);
  });
});

describe('castVisibility', () => {
  it('reaches the radius in open space and stops near walls elsewhere', () => {
    const out = new Float32Array(64 * 2);
    const penetration = 2;
    castVisibility(ROOM, 15, 15, 1000, penetration, out);
    for (let i = 0; i < out.length; i += 2) {
      const x = out[i] ?? 0;
      const y = out[i + 1] ?? 0;
      const distance = Math.hypot(x - 15, y - 15);
      // Every vertex is just past a wall surface: inside a wall tile, within the penetration.
      expect(isWall(ROOM, Math.floor(x / T), Math.floor(y / T))).toBe(true);
      expect(distance).toBeLessThan(1000);
    }

    const small = new Float32Array(16 * 2);
    castVisibility(ROOM, 15, 45, 3, penetration, small);
    for (let i = 0; i < small.length; i += 2) {
      expect(Math.hypot((small[i] ?? 0) - 15, (small[i + 1] ?? 0) - 45)).toBeCloseTo(3, 4);
    }
  });

  it('does not light the far side of a wall', () => {
    const out = new Float32Array(360 * 2);
    castVisibility(ROOM, 15, 15, 1000, 2, out);
    for (let i = 0; i < out.length; i += 2) {
      // No vertex reaches the room on the other side of the interior wall (x > 40, y < 40).
      const x = out[i] ?? 0;
      const y = out[i + 1] ?? 0;
      expect(x > 40 && y < 40).toBe(false);
    }
  });
});
