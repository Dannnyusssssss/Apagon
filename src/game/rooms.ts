import type { RoomDef } from '../data/rooms';

export const TILE_FLOOR = 0;
export const TILE_WALL = 1;

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
}

/** Builds a tile grid from a text layout. Throws on malformed data. */
export function parseRoom(def: RoomDef, tileSize: number): RoomGrid {
  const rows = def.layout.length;
  const cols = def.layout[0]?.length ?? 0;
  if (rows === 0 || cols === 0) throw new Error(`Room "${def.id}" is empty`);

  const tiles = new Uint8Array(cols * rows);
  let spawnCol = -1;
  let spawnRow = -1;
  const enemySpawns: TileCoord[] = [];

  def.layout.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`Room "${def.id}" row ${row} has wrong width`);
    for (let col = 0; col < cols; col++) {
      const ch = line[col];
      if (ch === '#') {
        tiles[row * cols + col] = TILE_WALL;
      } else if (ch === '.' || ch === 'P' || ch === 'E') {
        tiles[row * cols + col] = TILE_FLOOR;
        if (ch === 'E') enemySpawns.push({ col, row });
        if (ch === 'P') {
          if (spawnCol >= 0) throw new Error(`Room "${def.id}" has more than one spawn`);
          spawnCol = col;
          spawnRow = row;
        }
      } else {
        throw new Error(`Room "${def.id}" has unknown tile "${String(ch)}"`);
      }
    }
  });

  if (spawnCol < 0) throw new Error(`Room "${def.id}" has no spawn`);
  if (enemySpawns.length === 0) throw new Error(`Room "${def.id}" has no enemy spawn`);
  return { cols, rows, tileSize, tiles, spawnCol, spawnRow, enemySpawns };
}

/** Anything outside the grid counts as wall. */
export function isWall(room: RoomGrid, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= room.cols || row >= room.rows) return true;
  return room.tiles[row * room.cols + col] === TILE_WALL;
}

export function roomWidth(room: RoomGrid): number {
  return room.cols * room.tileSize;
}

export function roomHeight(room: RoomGrid): number {
  return room.rows * room.tileSize;
}
