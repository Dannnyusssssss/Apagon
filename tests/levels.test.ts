import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { levelAt, LEVEL_COUNT, LEVELS, type LevelDef } from '../src/data/levels';
import { TEXTS } from '../src/data/texts';
import { hasAllKeys, keysRequired } from '../src/game/items';
import { lightModeProfile } from '../src/game/lightModes';
import {
  createDistanceField,
  distanceAt,
  UNREACHABLE,
  updateDistanceField,
  type DistanceField,
} from '../src/game/pathfinding';
import {
  areaAt,
  parseRoom,
  tileAt,
  TILE_ROCK,
  TILE_TREE,
  isWall,
  type RoomGrid,
} from '../src/game/rooms';
import { createLevelWorld, stepWorld, type StepInput, type World } from '../src/game/world';
import { hasLineOfSight } from '../src/game/visibility';

const T = BALANCE.world.tileSize;
const STEP = BALANCE.simulation.stepSeconds;
/** Distance at which the simulated player runs from an enemy. */
const RUN_FROM_ENEMY_TILES = 3;
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const MODES = [
  ['cone', false],
  ['classic light', true],
] as const;

function gridOf(level: LevelDef): RoomGrid {
  return parseRoom(level.room, T);
}

function fieldFrom(room: RoomGrid, col: number, row: number): DistanceField {
  const field = createDistanceField(room);
  updateDistanceField(field, room, col, row);
  return field;
}

/** The floor tile next to the exit. */
function exitApproach(room: RoomGrid): { col: number; row: number } {
  const { col, row } = room.door;
  const around = [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ];
  const approach = around.find((t) => !isWall(room, t.col, t.row));
  if (!approach) throw new Error('The exit has no floor next to it');
  return approach;
}

describe('level list', () => {
  it('has the three levels in order, with the house first', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['house', 'deep', 'forest']);
    expect(LEVEL_COUNT).toBe(3);
  });

  it('always returns a valid level', () => {
    expect(levelAt(0).id).toBe('house');
    expect(levelAt(2).id).toBe('forest');
    expect(levelAt(-1).id).toBe('house');
    expect(levelAt(99).id).toBe('forest');
  });

  it('has more than one enemy only in the last level', () => {
    expect(LEVELS.map((l) => l.enemyCount ?? BALANCE.levels.enemyCount)).toEqual([1, 1, 2]);
  });

  it('makes the second level faster, with fewer batteries and less light', () => {
    const [house, deep] = LEVELS;
    if (!house || !deep) throw new Error('missing levels');
    expect(deep.enemySpeedFactor).toBeGreaterThan(1);
    expect(deep.batterySecondsFactor).toBeLessThan(1);
    expect(gridOf(deep).batteryCount).toBeLessThan(gridOf(house).batteryCount);
  });

  it('gives the forest a gate, trees and rocks', () => {
    const forest = levelAt(2);
    expect(forest.exit).toBe('gate');
    const room = gridOf(forest);
    let trees = 0;
    let rocks = 0;
    for (let row = 0; row < room.rows; row++) {
      for (let col = 0; col < room.cols; col++) {
        if (tileAt(room, col, row) === TILE_TREE) trees++;
        if (tileAt(room, col, row) === TILE_ROCK) rocks++;
      }
    }
    expect(trees).toBeGreaterThan(50);
    expect(rocks).toBeGreaterThan(5);
  });

  it('blocks bodies and light with trees and rocks, like walls', () => {
    const room = parseRoom(
      { id: 'solid', layout: ['#######', '#P.T.K#', '#E.R..#', '#D#####'] },
      T,
    );
    expect(isWall(room, 3, 1)).toBe(true);
    expect(isWall(room, 3, 2)).toBe(true);
    const y1 = 1.5 * T;
    const y2 = 2.5 * T;
    expect(hasLineOfSight(room, 2.5 * T, y1, 4.5 * T, y1)).toBe(false);
    expect(hasLineOfSight(room, 2.5 * T, y2, 4.5 * T, y2)).toBe(false);
  });

  it('has a name and an intro for every level', () => {
    for (const level of LEVELS) {
      expect(TEXTS.levels[level.id].name.length).toBeGreaterThan(0);
      expect(TEXTS.levels[level.id].intro.length).toBeGreaterThan(0);
    }
  });

  it('never lets the drawn light go through a whole solid tile', () => {
    for (const level of LEVELS) {
      expect(level.lightPenetration ?? 0).toBeLessThan(T);
    }
  });

  it('has different colors in every level', () => {
    const floors = new Set(LEVELS.map((l) => l.palette.floor));
    const walls = new Set(LEVELS.map((l) => l.palette.wall));
    expect(floors.size).toBe(LEVEL_COUNT);
    expect(walls.size).toBe(LEVEL_COUNT);
  });
});

describe.each(LEVELS.map((level) => [level.id, level] as const))('level %s', (_id, level) => {
  const room = gridOf(level);
  const required = keysRequired(room);
  const enemyCount = level.enemyCount ?? BALANCE.levels.enemyCount;

  it('has three keys, spare key spots and spare battery spots', () => {
    expect(required).toBe(3);
    for (const area of room.areas) {
      const spots = room.keys.filter((k) => areaAt(room, k.col, k.row) === area.id);
      expect(spots.length).toBeGreaterThanOrEqual(3);
    }
    expect(room.batteries.length).toBeGreaterThan(room.batteryCount);
    expect(room.enemySpawns.length).toBeGreaterThan(enemyCount);
  });

  it('can reach every floor tile from the start', () => {
    const field = fieldFrom(room, room.spawnCol, room.spawnRow);
    for (let row = 0; row < room.rows; row++) {
      for (let col = 0; col < room.cols; col++) {
        if (!isWall(room, col, row)) expect(distanceAt(field, col, row)).not.toBe(UNREACHABLE);
      }
    }
    const exit = exitApproach(room);
    expect(distanceAt(field, exit.col, exit.row)).not.toBe(UNREACHABLE);
  });

  it('is closed on every side, except for the exit', () => {
    for (let col = 0; col < room.cols; col++) {
      expect(isWall(room, col, 0)).toBe(true);
      expect(isWall(room, col, room.rows - 1)).toBe(true);
    }
    for (let row = 0; row < room.rows; row++) {
      expect(isWall(room, 0, row)).toBe(true);
      expect(isWall(room, room.cols - 1, row)).toBe(true);
    }
  });

  it('starts every enemy far from the player, and apart from each other', () => {
    const field = fieldFrom(room, room.spawnCol, room.spawnRow);
    for (const spawn of room.enemySpawns) {
      expect(distanceAt(field, spawn.col, spawn.row)).toBeGreaterThanOrEqual(15);
    }
    if (enemyCount > 1) {
      for (const a of room.enemySpawns) {
        const fromA = fieldFrom(room, a.col, a.row);
        for (const b of room.enemySpawns) {
          if (a !== b) expect(distanceAt(fromA, b.col, b.row)).toBeGreaterThanOrEqual(10);
        }
      }
    }
  });

  it('has more than one way around, so the enemy can be led in a loop', () => {
    // Blocking the shortest route to the exit still leaves another way.
    const exit = exitApproach(room);
    const field = fieldFrom(room, exit.col, exit.row);
    const blocked = new Uint8Array(room.tiles);
    let { spawnCol: col, spawnRow: row } = room;
    let distance = distanceAt(field, col, row);
    const halfway = Math.floor(distance / 2);
    while (distance > halfway) {
      const next = [
        [col + 1, row],
        [col - 1, row],
        [col, row + 1],
        [col, row - 1],
      ].find(([c, r]) => distanceAt(field, c ?? 0, r ?? 0) === distance - 1);
      if (!next) throw new Error('No way down the distance map');
      col = next[0] ?? 0;
      row = next[1] ?? 0;
      distance--;
    }
    blocked[row * room.cols + col] = 1;
    const detour: RoomGrid = { ...room, tiles: blocked };
    const after = fieldFrom(detour, room.spawnCol, room.spawnRow);
    expect(distanceAt(after, exit.col, exit.row)).not.toBe(UNREACHABLE);
  });

  it.each(MODES)('keeps the enemy slower than the player with the light on (%s)', (_n, classic) => {
    const speed = lightModeProfile(classic).enemySpeed * (level.enemySpeedFactor ?? 1);
    expect(speed).toBeLessThan(BALANCE.player.speed);
  });

  it.each(MODES)('fits every run in the battery, with margin (%s)', (_name, classicLight) => {
    const battery = lightModeProfile(classicLight).battery;
    const seconds = battery.drainSeconds * (level.batterySecondsFactor ?? 1);
    const lightSeconds = seconds * (1 + room.batteryCount * battery.rechargeAmount);
    const exit = exitApproach(room);
    let longest = 0;
    let shortest = Infinity;
    for (let seed = 1; seed <= 40; seed++) {
      const w = createLevelWorld(level, { seed, reduceFlicker: false, classicLight });
      const keys = w.items
        .filter((i) => i.kind === 'key' && i.active)
        .map((i) => ({ col: Math.floor(i.x / T), row: Math.floor(i.y / T) }));
      const tiles = shortestTour(room, keys, exit);
      const walk = (tiles * T) / BALANCE.player.speed;
      longest = Math.max(longest, walk);
      shortest = Math.min(shortest, walk);
    }
    // Walking the shortest tour with the light always on leaves margin for detours.
    expect(longest).toBeLessThan(lightSeconds * 0.6);
    // And no run is trivially short.
    expect(shortest).toBeGreaterThan(10);
  });

  it.each(MODES)(
    'is finished by walking it in the real game, no enemy touch (%s)',
    (_n, classic) => {
      for (let seed = 1; seed <= 5; seed++) {
        const w = createLevelWorld(level, {
          seed,
          reduceFlicker: false,
          classicLight: classic,
          godMode: true,
        });
        playRoute(w);
        expect(w.status).toBe('won');
        expect(hasAllKeys(w.inventory)).toBe(true);
      }
    },
  );

  it.each(MODES)('can be won with the enemies chasing (%s)', (_n, classic) => {
    let wins = 0;
    const seeds = 40;
    for (let seed = 1; seed <= seeds; seed++) {
      const w = createLevelWorld(level, { seed, reduceFlicker: false, classicLight: classic });
      playRoute(w);
      if (w.status === 'won') wins++;
    }
    expect(wins).toBeGreaterThan(0);
  });

  it('repeats the same placement for the same seed', () => {
    const active = (seed: number): string =>
      createLevelWorld(level, { seed, reduceFlicker: false })
        .items.map((i) => (i.active ? '1' : '0'))
        .join('');
    expect(active(21)).toBe(active(21));
  });
});

/** Tiles walked from the start through every key (best order) to the exit. */
function shortestTour(
  room: RoomGrid,
  keys: readonly { col: number; row: number }[],
  exit: { col: number; row: number },
): number {
  const points = [{ col: room.spawnCol, row: room.spawnRow }, ...keys];
  const fields = points.map((p) => fieldFrom(room, p.col, p.row));
  let best = Infinity;
  const visit = (at: number, left: readonly number[], total: number): void => {
    const field = fields[at];
    if (!field) return;
    if (left.length === 0) {
      best = Math.min(best, total + distanceAt(field, exit.col, exit.row));
      return;
    }
    for (const next of left) {
      const target = points[next];
      if (!target) continue;
      visit(
        next,
        left.filter((n) => n !== next),
        total + distanceAt(field, target.col, target.row),
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

/**
 * A simple player: walks to the nearest key still missing and then to the exit, with the
 * light on and pressing the interact key all along. When an unlit enemy gets close it steps
 * to the neighbour tile farthest from it, as a person running away would. It plans no route.
 * Stops when the run ends, or after a limit that any real route stays well under.
 */
function playRoute(world: World): void {
  const { room, player } = world;
  const input: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: true };
  const exit = exitApproach(room);
  const fieldCache = new Map<string, DistanceField>();
  const fieldTo = (col: number, row: number): DistanceField => {
    const key = `${String(col)},${String(row)}`;
    let field = fieldCache.get(key);
    if (!field) {
      field = fieldFrom(room, col, row);
      fieldCache.set(key, field);
    }
    return field;
  };

  const limit = 60 * 300;
  for (let i = 0; i < limit && world.status === 'playing'; i++) {
    const col = Math.floor(player.x / T);
    const row = Math.floor(player.y / T);
    let target = exit;
    if (!hasAllKeys(world.inventory)) {
      let nearest = Infinity;
      const here = fieldTo(col, row);
      for (const item of world.items) {
        if (item.kind !== 'key' || !item.active || item.taken) continue;
        const c = Math.floor(item.x / T);
        const r = Math.floor(item.y / T);
        const d = distanceAt(here, c, r);
        if (d < nearest) {
          nearest = d;
          target = { col: c, row: r };
        }
      }
    }
    const field = fieldTo(target.col, target.row);
    let goalX = (col + 0.5) * T;
    let goalY = (row + 0.5) * T;
    const distance = distanceAt(field, col, row);
    for (const [dc, dr] of NEIGHBOURS) {
      if (distanceAt(field, col + dc, row + dr) === distance - 1) {
        goalX = (col + dc + 0.5) * T;
        goalY = (row + dr + 0.5) * T;
        break;
      }
    }
    if (distance === 0 && target === exit) {
      goalX = (room.door.col + 0.5) * T;
      goalY = (room.door.row + 0.5) * T;
    }
    const threat = world.nearestEnemy;
    const threatDistance = Math.hypot(threat.x - player.x, threat.y - player.y);
    if (!world.settings.godMode && threatDistance < RUN_FROM_ENEMY_TILES * T && !threat.lit) {
      let farthest = -1;
      for (const [dc, dr] of NEIGHBOURS) {
        if (isWall(room, col + dc, row + dr)) continue;
        const x = (col + dc + 0.5) * T;
        const y = (row + dr + 0.5) * T;
        const away = Math.hypot(threat.x - x, threat.y - y);
        if (away > farthest) {
          farthest = away;
          goalX = x;
          goalY = y;
        }
      }
    }
    const dx = goalX - player.x;
    const dy = goalY - player.y;
    const length = Math.hypot(dx, dy);
    input.axisX = length > 1 ? dx / length : 0;
    input.axisY = length > 1 ? dy / length : 0;
    stepWorld(world, input, STEP);
  }
}
