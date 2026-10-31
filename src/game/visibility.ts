import { angleDelta } from '../core/math';
import { isWall, type RoomGrid } from './rooms';

/**
 * Walks the grid along a ray (unit direction) and returns the distance to the
 * first wall tile, or `maxDistance` if no wall is hit before it.
 * Returns 0 when the origin is inside a wall.
 */
export function castRay(
  room: RoomGrid,
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  maxDistance: number,
): number {
  const t = room.tileSize;
  let col = Math.floor(originX / t);
  let row = Math.floor(originY / t);
  if (isWall(room, col, row)) return 0;

  const stepCol = dirX > 0 ? 1 : -1;
  const stepRow = dirY > 0 ? 1 : -1;
  const deltaX = dirX !== 0 ? Math.abs(t / dirX) : Infinity;
  const deltaY = dirY !== 0 ? Math.abs(t / dirY) : Infinity;
  let nextX = dirX !== 0 ? ((dirX > 0 ? col + 1 : col) * t - originX) / dirX : Infinity;
  let nextY = dirY !== 0 ? ((dirY > 0 ? row + 1 : row) * t - originY) / dirY : Infinity;

  // Outside the grid counts as wall, so the walk always ends.
  for (;;) {
    let distance: number;
    if (nextX < nextY) {
      distance = nextX;
      nextX += deltaX;
      col += stepCol;
    } else {
      distance = nextY;
      nextY += deltaY;
      row += stepRow;
    }
    if (distance >= maxDistance) return maxDistance;
    if (isWall(room, col, row)) return distance;
  }
}

/** True when no wall lies between the two points. */
export function hasLineOfSight(
  room: RoomGrid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0)
    return !isWall(room, Math.floor(fromX / room.tileSize), Math.floor(fromY / room.tileSize));
  return castRay(room, fromX, fromY, dx / distance, dy / distance, distance) >= distance;
}

/**
 * True when the point is touched by the flashlight: the light is on, the point
 * is within `litRadius` of the light and no wall is in between.
 */
export function isLit(
  room: RoomGrid,
  lightOn: boolean,
  lightX: number,
  lightY: number,
  litRadius: number,
  pointX: number,
  pointY: number,
): boolean {
  if (!lightOn) return false;
  const dx = pointX - lightX;
  const dy = pointY - lightY;
  if (dx * dx + dy * dy > litRadius * litRadius) return false;
  return hasLineOfSight(room, lightX, lightY, pointX, pointY);
}

/**
 * Builds the light polygon around (originX, originY) into `out` as x, y pairs
 * (one vertex per ray, `out.length / 2` rays evenly spread over a full turn).
 * Rays stop at walls, entering them by `wallPenetration` so wall faces are lit.
 */
export function castVisibility(
  room: RoomGrid,
  originX: number,
  originY: number,
  radius: number,
  wallPenetration: number,
  out: Float32Array,
): void {
  const rays = out.length >> 1;
  const angleStep = (Math.PI * 2) / rays;
  for (let i = 0; i < rays; i++) {
    const angle = i * angleStep;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    let distance = castRay(room, originX, originY, dirX, dirY, radius);
    if (distance < radius) distance = Math.min(radius, distance + wallPenetration);
    out[i * 2] = originX + dirX * distance;
    out[i * 2 + 1] = originY + dirY * distance;
  }
}

/** True when the direction (dx, dy) is within `halfAngle` of `aim` (edges included). */
export function isInCone(dx: number, dy: number, aim: number, halfAngle: number): boolean {
  if (dx === 0 && dy === 0) return true;
  return Math.abs(angleDelta(aim, Math.atan2(dy, dx))) <= halfAngle;
}

/**
 * Cone mode: true when the point is inside the beam. The light is on, the point is
 * within `litRadius`, within `halfAngle` of `aim`, and no wall is in between.
 */
export function isLitCone(
  room: RoomGrid,
  lightOn: boolean,
  lightX: number,
  lightY: number,
  litRadius: number,
  aim: number,
  halfAngle: number,
  pointX: number,
  pointY: number,
): boolean {
  if (!lightOn) return false;
  const dx = pointX - lightX;
  const dy = pointY - lightY;
  if (dx * dx + dy * dy > litRadius * litRadius) return false;
  if (!isInCone(dx, dy, aim, halfAngle)) return false;
  return hasLineOfSight(room, lightX, lightY, pointX, pointY);
}

/**
 * Builds the cone light polygon into `out` as x, y pairs: the origin first, then one
 * vertex per ray spread evenly over the arc `aim - halfSpan` .. `aim + halfSpan`.
 * Rays stop at walls, entering them by `wallPenetration` so wall faces are lit.
 */
export function castCone(
  room: RoomGrid,
  originX: number,
  originY: number,
  radius: number,
  aim: number,
  halfSpan: number,
  wallPenetration: number,
  out: Float32Array,
): void {
  out[0] = originX;
  out[1] = originY;
  const rays = (out.length >> 1) - 1;
  const angleStep = rays > 1 ? (halfSpan * 2) / (rays - 1) : 0;
  for (let i = 0; i < rays; i++) {
    const angle = aim - halfSpan + i * angleStep;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    let distance = castRay(room, originX, originY, dirX, dirY, radius);
    if (distance < radius) distance = Math.min(radius, distance + wallPenetration);
    out[(i + 1) * 2] = originX + dirX * distance;
    out[(i + 1) * 2 + 1] = originY + dirY * distance;
  }
}
