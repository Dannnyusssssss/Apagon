import type { AreaDef, RoomDef } from '../data/rooms';

export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
/** The exit door: solid for bodies and light, like a wall. */
export const TILE_DOOR = 2;

export interface TileCoord {
  readonly col: number;
  readonly row: number;
}

export interface RoomGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tileSize: number;
  readonly tiles: Uint8Array;
  /** Player start, in tile coordinates. */
  readonly spawnCol: number;
  readonly spawnRow: number;
  /** Possible enemy starts, in tile coordinates. At least one. */
  readonly enemySpawns: readonly TileCoord[];
  /** Keys to collect, in tile coordinates. At least one. */
  readonly keys: readonly TileCoord[];
  /** Battery pickups, in tile coordinates. */
  readonly batteries: readonly TileCoord[];
  /** The single exit door, next to at least one floor tile. */
  readonly door: TileCoord;
  /** Named rooms of the map (may be empty). */
  readonly areas: readonly AreaDef[];
}

/** Builds a tile grid from a text layout. Throws on malformed data. */
export function parseRoom(def: RoomDef, tileSize: number): RoomGrid {
  const rows = def.layout.length;
  const cols = def.layout[0]?.length ?? 0;
  if (rows === 0 || cols === 0) throw new Error(`Room "${def.id}" is empty`);

  const tiles = new Uint8Array(cols * rows);
  let spawn: TileCoord | null = null;
  let door: TileCoord | null = null;
  const enemySpawns: TileCoord[] = [];
  const keys: TileCoord[] = [];
  const batteries: TileCoord[] = [];

  for (let row = 0; row < rows; row++) {
    const line = def.layout[row] ?? '';
    if (line.length !== cols) throw new Error(`Room "${def.id}" row ${row} has wrong width`);
    for (let col = 0; col < cols; col++) {
      const ch = line[col];
      const here = { col, row };
      tiles[row * cols + col] = ch === '#' ? TILE_WALL : ch === 'D' ? TILE_DOOR : TILE_FLOOR;
      switch (ch) {
        case '#':
        case '.':
          break;
        case 'P':
          if (spawn) throw new Error(`Room "${def.id}" has more than one spawn`);
          spawn = here;
          break;
        case 'D':
          if (door) throw new Error(`Room "${def.id}" has more than one door`);
          door = here;
          break;
        case 'E':
          enemySpawns.push(here);
          break;
        case 'K':
          keys.push(here);
          break;
        case 'B':
          batteries.push(here);
          break;
        default:
          throw new Error(`Room "${def.id}" has unknown tile "${String(ch)}"`);
      }
    }
  }

  const start = spawn;
  const exit = door;
  if (!start) throw new Error(`Room "${def.id}" has no spawn`);
  if (enemySpawns.length === 0) throw new Error(`Room "${def.id}" has no enemy spawn`);
  if (keys.length === 0) throw new Error(`Room "${def.id}" has no key`);
  if (!exit) throw new Error(`Room "${def.id}" has no door`);

  const room: RoomGrid = {
    cols,
    rows,
    tileSize,
    tiles,
    spawnCol: start.col,
    spawnRow: start.row,
    enemySpawns,
    keys,
    batteries,
    door: exit,
    areas: def.areas ?? [],
  };
  for (const area of room.areas) {
    const inside =
      area.col >= 0 &&
      area.row >= 0 &&
      area.cols > 0 &&
      area.rows > 0 &&
      area.col + area.cols <= cols &&
      area.row + area.rows <= rows;
    if (!inside) throw new Error(`Room "${def.id}" area "${area.id}" is outside the map`);
  }
  if (!hasFloorNeighbour(room, exit)) throw new Error(`Room "${def.id}" door cannot be reached`);
  return room;
}

function hasFloorNeighbour(room: RoomGrid, tile: TileCoord): boolean {
  return (
    !isWall(room, tile.col + 1, tile.row) ||
    !isWall(room, tile.col - 1, tile.row) ||
    !isWall(room, tile.col, tile.row + 1) ||
    !isWall(room, tile.col, tile.row - 1)
  );
}

/** Id of the area that contains the tile, or null. */
export function areaAt(room: RoomGrid, col: number, row: number): string | null {
  for (const area of room.areas) {
    if (
      col >= area.col &&
      col < area.col + area.cols &&
      row >= area.row &&
      row < area.row + area.rows
    ) {
      return area.id;
    }
  }
  return null;
}

/** Returns the tile type; anything outside the grid counts as wall. */
export function tileAt(room: RoomGrid, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= room.cols || row >= room.rows) return TILE_WALL;
  return room.tiles[row * room.cols + col] ?? TILE_WALL;
}

/** True for anything solid: walls, the door and everything outside the grid. */
export function isWall(room: RoomGrid, col: number, row: number): boolean {
  return tileAt(room, col, row) !== TILE_FLOOR;
}

export function roomWidth(room: RoomGrid): number {
  return room.cols * room.tileSize;
}

export function roomHeight(room: RoomGrid): number {
  return room.rows * room.tileSize;
}
