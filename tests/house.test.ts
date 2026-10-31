import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { HOUSE } from '../src/data/rooms';
import {
  createDistanceField,
  distanceAt,
  UNREACHABLE,
  updateDistanceField,
} from '../src/game/pathfinding';
import { keysRequired } from '../src/game/items';
import { lightModeProfile } from '../src/game/lightModes';
import { areaAt, parseRoom, type RoomGrid, type TileCoord } from '../src/game/rooms';
import { createWorld, type World } from '../src/game/world';

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
  it('has three named rooms, three keys to find and spare battery spots', () => {
    expect(room.areas.map((a) => a.id)).toEqual(['entrance', 'living', 'basement']);
    expect(keysRequired(room)).toBe(3);
    expect(room.batteryCount).toBe(3);
    expect(room.batteries.length).toBeGreaterThan(room.batteryCount);
    expect(room.enemySpawns.length).toBeGreaterThanOrEqual(2);
  });

  it('has several key spots in every room and the start in the entrance', () => {
    for (const area of room.areas) {
      const spots = room.keys.filter((k) => areaAt(room, k.col, k.row) === area.id);
      expect(spots.length).toBeGreaterThanOrEqual(3);
    }
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

  it('places one key per room and the battery count, different between runs', () => {
    const layouts = new Set<string>();
    const usedSpots = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const w = world(seed);
      const keys = w.items.filter((i) => i.kind === 'key' && i.active);
      const batteries = w.items.filter((i) => i.kind === 'battery' && i.active);
      expect(keys.map((k) => k.area).sort()).toEqual(['basement', 'entrance', 'living']);
      expect(batteries.length).toBe(room.batteryCount);
      const placed = [...keys, ...batteries].map((i) => `${String(i.x)},${String(i.y)}`);
      expect(new Set(placed).size).toBe(placed.length);
      placed.forEach((p) => usedSpots.add(p));
      layouts.add(placed.join('|'));
    }
    expect(layouts.size).toBeGreaterThan(50);
    // Every marked spot shows up in some run.
    expect(usedSpots.size).toBe(room.keys.length + room.batteries.length);
  });

  it('repeats the same placement for the same seed', () => {
    const active = (w: World): string => w.items.map((i) => (i.active ? '1' : '0')).join('');
    expect(active(world(77))).toBe(active(world(77)));
  });

  it.each([
    ['cone', false],
    ['classic light', true],
  ])('lets every run fit in the battery, with margin (%s)', (_name, classicLight) => {
    const exit = doorApproach(room)[0];
    if (!exit) throw new Error('door has no approach');
    const T = room.tileSize;
    const battery = lightModeProfile(classicLight).battery;
    const charge = 1 + room.batteryCount * battery.rechargeAmount;
    const lightSeconds = battery.drainSeconds * charge;
    let shortest = Infinity;
    let longest = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const w = world(seed);
      const keys = w.items
        .filter((i) => i.kind === 'key' && i.active)
        .map((i) => ({ col: Math.floor(i.x / T), row: Math.floor(i.y / T) }));
      const seconds = (shortestTour(keys, exit) * T) / BALANCE.player.speed;
      shortest = Math.min(shortest, seconds);
      longest = Math.max(longest, seconds);
    }
    // Walking the shortest tour with the light always on leaves margin for detours.
    expect(longest).toBeLessThan(lightSeconds * 0.6);
    // And no run is trivially short (pure walking, without dodging the enemy).
    expect(shortest).toBeGreaterThan(12);
  });
});

function world(seed: number): World {
  return createWorld(HOUSE, { seed, reduceFlicker: false });
}

/** Tiles walked from the start through every key (best order) to the exit. */
function shortestTour(keys: readonly TileCoord[], exit: TileCoord): number {
  const start = { col: room.spawnCol, row: room.spawnRow };
  const points = [start, ...keys];
  const fields = points.map((p) => fieldFrom(p.col, p.row));
  const dist = (from: number, to: TileCoord): number =>
    distanceAt(fields[from] ?? fieldFrom(0, 0), to.col, to.row);
  let best = Infinity;
  const visit = (at: number, left: readonly number[], total: number): void => {
    if (left.length === 0) {
      best = Math.min(best, total + dist(at, exit));
      return;
    }
    for (const next of left) {
      const target = points[next];
      if (!target) continue;
      visit(
        next,
        left.filter((n) => n !== next),
        total + dist(at, target),
      );
    }
  };
  visit(
    0,
    keys.map((_, i) => i + 1),
    0,
  );
  return best;
}
