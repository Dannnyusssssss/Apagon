import type { Vec2 } from '../core/math';
import { isWall, type RoomGrid } from './rooms';

/** Small inset so a box resting exactly on a tile edge does not touch the next tile. */
const EDGE = 1e-6;

/**
 * Moves a square body (half-size `half`) by (dx, dy) against the room walls.
 * Axes are resolved separately so the body slides along walls.
 * Large moves are split into sub-steps of at most half a tile to avoid tunneling.
 */
export function moveBox(room: RoomGrid, pos: Vec2, half: number, dx: number, dy: number): void {
  const maxStep = room.tileSize / 2;
  const subSteps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
  const sx = dx / subSteps;
  const sy = dy / subSteps;
  for (let i = 0; i < subSteps; i++) {
    if (sx !== 0) pos.x = resolveX(room, pos.x + sx, pos.y, half, sx);
    if (sy !== 0) pos.y = resolveY(room, pos.x, pos.y + sy, half, sy);
  }
}

function resolveX(room: RoomGrid, x: number, y: number, half: number, dir: number): number {
  const t = room.tileSize;
  const rowTop = Math.floor((y - half + EDGE) / t);
  const rowBottom = Math.floor((y + half - EDGE) / t);
  if (dir > 0) {
    const col = Math.floor((x + half - EDGE) / t);
    for (let row = rowTop; row <= rowBottom; row++) {
      if (isWall(room, col, row)) return col * t - half;
    }
  } else {
    const col = Math.floor((x - half + EDGE) / t);
    for (let row = rowTop; row <= rowBottom; row++) {
      if (isWall(room, col, row)) return (col + 1) * t + half;
    }
  }
  return x;
}

function resolveY(room: RoomGrid, x: number, y: number, half: number, dir: number): number {
  const t = room.tileSize;
  const colLeft = Math.floor((x - half + EDGE) / t);
  const colRight = Math.floor((x + half - EDGE) / t);
  if (dir > 0) {
    const row = Math.floor((y + half - EDGE) / t);
    for (let col = colLeft; col <= colRight; col++) {
      if (isWall(room, col, row)) return row * t - half;
    }
  } else {
    const row = Math.floor((y - half + EDGE) / t);
    for (let col = colLeft; col <= colRight; col++) {
      if (isWall(room, col, row)) return (row + 1) * t + half;
    }
  }
  return y;
}
