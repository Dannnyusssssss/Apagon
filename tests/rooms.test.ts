import { describe, expect, it } from 'vitest';
import { createCamera, followTarget } from '../src/core/camera';
import { TEST_ROOM } from '../src/data/rooms';
import { isWall, parseRoom } from '../src/game/rooms';

describe('parseRoom', () => {
  it('reads size and spawn', () => {
    const room = parseRoom({ id: 'r', layout: ['####', '#P.#', '####'] }, 10);
    expect(room.cols).toBe(4);
    expect(room.rows).toBe(3);
    expect(room.spawnCol).toBe(1);
    expect(room.spawnRow).toBe(1);
    expect(isWall(room, 2, 1)).toBe(false);
    expect(isWall(room, 0, 0)).toBe(true);
  });

  it('rejects malformed layouts', () => {
    expect(() => parseRoom({ id: 'r', layout: [] }, 10)).toThrow();
    expect(() => parseRoom({ id: 'r', layout: ['###', '#P', '###'] }, 10)).toThrow();
    expect(() => parseRoom({ id: 'r', layout: ['###', '#x#', '###'] }, 10)).toThrow();
    expect(() => parseRoom({ id: 'r', layout: ['###', '#.#', '###'] }, 10)).toThrow();
    expect(() => parseRoom({ id: 'r', layout: ['####', '#PP#', '####'] }, 10)).toThrow();
  });

  it('the test room is valid and closed by walls', () => {
    const room = parseRoom(TEST_ROOM, 48);
    for (let col = 0; col < room.cols; col++) {
      expect(isWall(room, col, 0)).toBe(true);
      expect(isWall(room, col, room.rows - 1)).toBe(true);
    }
    for (let row = 0; row < room.rows; row++) {
      expect(isWall(room, 0, row)).toBe(true);
      expect(isWall(room, room.cols - 1, row)).toBe(true);
    }
  });
});

describe('camera', () => {
  it('follows the target inside large worlds and clamps at the edges', () => {
    const cam = createCamera();
    followTarget(cam, 500, 500, 1000, 1000, 200, 200);
    expect(cam).toMatchObject({ x: 500, y: 500 });
    followTarget(cam, 10, 990, 1000, 1000, 200, 200);
    expect(cam).toMatchObject({ x: 100, y: 900 });
  });

  it('centers worlds smaller than the view', () => {
    const cam = createCamera();
    followTarget(cam, 10, 10, 100, 80, 400, 400);
    expect(cam).toMatchObject({ x: 50, y: 40 });
  });
});
