import { describe, expect, it } from 'vitest';
import { isWall, parseRoom } from '../src/game/rooms';
import {
  castCone,
  castRay,
  castVisibility,
  hasLineOfSight,
  isInCone,
  isLit,
  isLitCone,
} from '../src/game/visibility';

const T = 10;

// Interior wall at column 3, rows 1-3; the bottom row is open.
const ROOM = parseRoom(
  {
    id: 'vis',
    layout: ['########', '#P.#..E#', '#.K#...#', '#..#...#', '#......#', '#D######'],
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

const DEG = Math.PI / 180;
const HALF = 35 * DEG;

describe('isInCone', () => {
  it('accepts what is ahead and rejects what is behind or to the side', () => {
    expect(isInCone(10, 0, 0, HALF)).toBe(true);
    expect(isInCone(-10, 0, 0, HALF)).toBe(false);
    expect(isInCone(0, 10, 0, HALF)).toBe(false);
    expect(isInCone(0, 10, Math.PI / 2, HALF)).toBe(true);
  });

  it('includes the exact edge and rejects just outside, on both sides', () => {
    for (const side of [1, -1]) {
      const edge = side * 34.999 * DEG;
      const out = side * 35.5 * DEG;
      expect(isInCone(Math.cos(edge), Math.sin(edge), 0, HALF)).toBe(true);
      expect(isInCone(Math.cos(out), Math.sin(out), 0, HALF)).toBe(false);
    }
  });

  it('works across the -PI/PI seam', () => {
    // Aiming left: points slightly above and below the left are both inside.
    expect(isInCone(-10, 1, Math.PI, HALF)).toBe(true);
    expect(isInCone(-10, -1, -Math.PI, HALF)).toBe(true);
  });
});

describe('isLitCone', () => {
  it('needs the light on, the point ahead, in range and no wall in between', () => {
    // From the open bottom row, aiming right.
    expect(isLitCone(ROOM, true, 35, 45, 30, 0, HALF, 55, 45)).toBe(true);
    expect(isLitCone(ROOM, false, 35, 45, 30, 0, HALF, 55, 45)).toBe(false);
    expect(isLitCone(ROOM, true, 35, 45, 30, 0, HALF, 15, 45)).toBe(false);
    expect(isLitCone(ROOM, true, 35, 45, 15, 0, HALF, 55, 45)).toBe(false);
    expect(isLitCone(ROOM, true, 15, 15, 60, 0, HALF, 55, 15)).toBe(false);
  });
});

describe('castCone', () => {
  it('starts at the origin and spreads the rays only over the arc', () => {
    const out = new Float32Array(10 * 2);
    const half = 45 * DEG;
    castCone(ROOM, 35, 45, 30, 0, half, 2, out);
    expect(out[0]).toBe(35);
    expect(out[1]).toBe(45);
    for (let i = 1; i < 10; i++) {
      const dx = (out[i * 2] ?? 0) - 35;
      const dy = (out[i * 2 + 1] ?? 0) - 45;
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(30 + 1e-4);
      expect(Math.abs(Math.atan2(dy, dx))).toBeLessThanOrEqual(half + 1e-6);
    }
    // The first and last rays sit on the edges of the arc.
    expect(Math.atan2((out[3] ?? 0) - 45, (out[2] ?? 0) - 35)).toBeCloseTo(-half, 5);
    expect(Math.atan2((out[19] ?? 0) - 45, (out[18] ?? 0) - 35)).toBeCloseTo(half, 5);
  });

  it('stops rays at walls, entering them a little', () => {
    const out = new Float32Array(10 * 2);
    // Aiming up into the wall above (it ends at y = 40); 9 rays, the middle one straight up.
    castCone(ROOM, 35, 45, 30, -Math.PI / 2, 45 * DEG, 2, out);
    expect(out[10]).toBeCloseTo(35, 4);
    expect(out[11]).toBeCloseTo(38, 4);
  });
});
