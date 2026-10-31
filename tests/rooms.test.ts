import { describe, expect, it } from 'vitest';
import { createCamera, followTarget } from '../src/core/camera';
import { HOUSE } from '../src/data/rooms';
import { areaAt, isWall, parseRoom, tileAt, TILE_DOOR } from '../src/game/rooms';

describe('parseRoom', () => {
  it('reads size, spawn, items and door', () => {
    const room = parseRoom({ id: 'r', layout: ['######', '#PKBE#', '#D####'] }, 10);
    expect(room.cols).toBe(6);
    expect(room.rows).toBe(3);
    expect(room.spawnCol).toBe(1);
    expect(room.spawnRow).toBe(1);
    expect(isWall(room, 0, 0)).toBe(true);
    for (let col = 1; col <= 4; col++) expect(isWall(room, col, 1)).toBe(false);
    expect(room.enemySpawns).toEqual([{ col: 4, row: 1 }]);
    expect(room.keys).toEqual([{ col: 2, row: 1 }]);
    expect(room.batteries).toEqual([{ col: 3, row: 1 }]);
    expect(room.door).toEqual({ col: 1, row: 2 });
  });

  it('treats the door as solid', () => {
    const room = parseRoom({ id: 'r', layout: ['#####', '#PKE#', '#D###'] }, 10);
    expect(isWall(room, 1, 2)).toBe(true);
    expect(tileAt(room, 1, 2)).toBe(TILE_DOOR);
  });

  it('reads every enemy spawn', () => {
    const room = parseRoom({ id: 'r', layout: ['######', '#EPKE#', '#D####'] }, 10);
    expect(room.enemySpawns).toEqual([
      { col: 1, row: 1 },
      { col: 4, row: 1 },
    ]);
  });

  it('reads named areas and rejects areas outside the map', () => {
    const layout = ['######', '#PK.E#', '#D####'];
    const room = parseRoom(
      { id: 'r', layout, areas: [{ id: 'a', col: 1, row: 1, cols: 2, rows: 1 }] },
      10,
    );
    expect(areaAt(room, 1, 1)).toBe('a');
    expect(areaAt(room, 3, 1)).toBeNull();
    expect(() =>
      parseRoom({ id: 'r', layout, areas: [{ id: 'b', col: 4, row: 1, cols: 3, rows: 1 }] }, 10),
    ).toThrow();
  });

  it('rejects malformed layouts', () => {
    const bad = (layout: string[]) => () => parseRoom({ id: 'r', layout }, 10);
    expect(bad([])).toThrow();
    expect(bad(['#####', '#PKE', '#D###'])).toThrow(); // uneven width
    expect(bad(['#####', '#PKx#', '#D###'])).toThrow(); // unknown tile
    expect(bad(['#####', '#.KE#', '#D###'])).toThrow(); // no spawn
    expect(bad(['######', '#PPKE#', '#D####'])).toThrow(); // two spawns
    expect(bad(['#####', '#P.K#', '#D###'])).toThrow(); // no enemy start
    expect(bad(['#####', '#P.E#', '#D###'])).toThrow(); // no key
    expect(bad(['#####', '#PKE#', '#####'])).toThrow(); // no door
    expect(bad(['#####', '#PKE#', '#DD##'])).toThrow(); // two doors
    expect(bad(['#####', '#PKE#', '#####', 'D####'])).toThrow(); // door out of reach
  });

  it('the test room is valid and closed by walls', () => {
    const room = parseRoom(HOUSE, 48);
    expect(room.keys.length).toBe(3);
    expect(room.batteries.length).toBeGreaterThan(0);
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
