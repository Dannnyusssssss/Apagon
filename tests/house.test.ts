import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { HOUSE } from '../src/data/rooms';
import {
  createDistanceField,
  distanceAt,
  UNREACHABLE,
  updateDistanceField,
} from '../src/game/pathfinding';
import { areaAt, parseRoom, type RoomGrid, type TileCoord } from '../src/game/rooms';

const room = parseRoom(HOUSE, BALANCE.world.tileSize);

function fieldFrom(col: number, row: number): ReturnType<typeof createDistanceField> {
  const field = createDistanceField(room);
  updateDistanceField(field, room, col, row);
  return field;
}

/** Floor tiles next to the door (the door itself is solid). */
function doorApproach(grid: RoomGrid): TileCoord[] {
  const { col, row } = grid.door;
  const around = [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ];
  const field = fieldFrom(grid.spawnCol, grid.spawnRow);
  return around.filter((t) => distanceAt(field, t.col, t.row) !== UNREACHABLE);
}

describe('house map data', () => {
  it('has three named rooms, three keys and spare batteries', () => {
    expect(room.areas.map((a) => a.id)).toEqual(['entrance', 'living', 'basement']);
    expect(room.keys.length).toBe(3);
    expect(room.batteries.length).toBeGreaterThanOrEqual(3);
    expect(room.enemySpawns.length).toBeGreaterThanOrEqual(2);
  });

  it('puts one key in each room and the start in the entrance', () => {
    const keyAreas = room.keys.map((k) => areaAt(room, k.col, k.row)).sort();
    expect(keyAreas).toEqual(['basement', 'entrance', 'living']);
    expect(areaAt(room, room.spawnCol, room.spawnRow)).toBe('entrance');
  });

  it('can reach every key, battery and the exit from the start', () => {
    const field = fieldFrom(room.spawnCol, room.spawnRow);
    for (const tile of [...room.keys, ...room.batteries, ...room.enemySpawns]) {
      expect(distanceAt(field, tile.col, tile.row)).not.toBe(UNREACHABLE);
    }
    expect(doorApproach(room).length).toBeGreaterThan(0);
  });

  it('starts the enemy far from the player', () => {
    const field = fieldFrom(room.spawnCol, room.spawnRow);
    for (const spawn of room.enemySpawns) {
      expect(distanceAt(field, spawn.col, spawn.row)).toBeGreaterThanOrEqual(15);
    }
  });

  it('has two ways into the basement, so the enemy can be led around a loop', () => {
    let openings = 0;
    for (let col = 0; col < room.cols; col++) {
      const above = areaAt(room, col, 8);
      const below = areaAt(room, col, 10);
      if (above && below && distanceAt(fieldFrom(col, 8), col, 10) === 2) openings++;
    }
    // Two openings of two tiles each.
    expect(openings).toBe(4);
  });

  it('lets a full run fit in the battery with the batteries on the map', () => {
    // Shortest tour: start -> each key (best order) -> door, walking tile by tile.
    const points: TileCoord[] = [{ col: room.spawnCol, row: room.spawnRow }, ...room.keys];
    const exit = doorApproach(room)[0];
    if (!exit) throw new Error('door has no approach');
    const fields = points.map((p) => fieldFrom(p.col, p.row));
    const dist = (from: number, to: TileCoord): number =>
      distanceAt(fields[from] ?? fieldFrom(0, 0), to.col, to.row);

    let best = Infinity;
    // Every visiting order of the three keys (points 1..3).
    const orders = [
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ];
    for (const order of orders) {
      let total = 0;
      let at = 0;
      for (const k of order) {
        const target = points[k];
        if (!target) throw new Error('missing key');
        total += dist(at, target);
        at = k;
      }
      total += dist(at, exit);
      best = Math.min(best, total);
    }

    const seconds = (best * room.tileSize) / BALANCE.player.speed;
    const charge = 1 + room.batteries.length * BALANCE.battery.rechargeAmount;
    // Walking the shortest tour with the light always on must leave plenty of margin.
    expect(seconds).toBeLessThan(BALANCE.battery.drainSeconds * charge * 0.5);
    // And it is not trivially short.
    expect(seconds).toBeGreaterThan(15);
  });
});
