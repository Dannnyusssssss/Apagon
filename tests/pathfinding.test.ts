import { describe, expect, it } from 'vitest';
import {
  createDistanceField,
  distanceAt,
  UNREACHABLE,
  updateDistanceField,
} from '../src/game/pathfinding';
import { parseRoom } from '../src/game/rooms';

const ROOM = parseRoom(
  {
    id: 'path',
    layout: [
      '#########',
      '#P..#..E#',
      '#.K.#...#',
      '#.......#',
      '####.####',
      '#..#.#..#',
      '#D#######',
    ],
  },
  10,
);

describe('distance field', () => {
  it('counts 4-neighbour steps and goes around walls', () => {
    const field = createDistanceField(ROOM);
    updateDistanceField(field, ROOM, 1, 1);
    expect(distanceAt(field, 1, 1)).toBe(0);
    expect(distanceAt(field, 3, 1)).toBe(2);
    // From (1,1) to (5,1): down to row 3, across, and up again.
    expect(distanceAt(field, 5, 1)).toBe(8);
    expect(distanceAt(field, 4, 5)).toBe(7);
  });

  it('marks walls and sealed areas as unreachable', () => {
    const field = createDistanceField(ROOM);
    updateDistanceField(field, ROOM, 1, 1);
    expect(distanceAt(field, 4, 1)).toBe(UNREACHABLE);
    expect(distanceAt(field, 1, 5)).toBe(UNREACHABLE);
    expect(distanceAt(field, -1, 0)).toBe(UNREACHABLE);
  });

  it('follows a new origin', () => {
    const field = createDistanceField(ROOM);
    updateDistanceField(field, ROOM, 1, 1);
    updateDistanceField(field, ROOM, 7, 1);
    expect(distanceAt(field, 7, 1)).toBe(0);
    expect(distanceAt(field, 1, 1)).toBe(10);
  });
});
