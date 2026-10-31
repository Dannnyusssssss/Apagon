import type { Vec2 } from '../../core/math';
import { moveBox } from '../collision';
import type { Enemy } from '../enemy';
import { distanceAt, UNREACHABLE, type DistanceField } from '../pathfinding';
import type { Player } from '../player';
import type { RoomGrid } from '../rooms';
import { hasLineOfSight } from '../visibility';

/** Fraction of the body half-size used for the side rays of the clear-path check. */
const SIDE_RAY_FRACTION = 0.95;

const target: Vec2 = { x: 0, y: 0 };
const position: Vec2 = { x: 0, y: 0 };

/**
 * Moves the enemy one fixed step toward the player.
 * It stands still while lit, and for `freezeAfterLight` seconds after leaving the light.
 */
export function enemySystem(
  room: RoomGrid,
  field: DistanceField,
  enemy: Enemy,
  player: Player,
  freezeAfterLight: number,
  stepSeconds: number,
): void {
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;

  if (enemy.startTimer > 0) {
    enemy.startTimer = Math.max(0, enemy.startTimer - stepSeconds);
    return;
  }
  if (enemy.lit) {
    enemy.freezeTimer = freezeAfterLight;
    return;
  }
  if (enemy.freezeTimer > 0) {
    enemy.freezeTimer = Math.max(0, enemy.freezeTimer - stepSeconds);
    return;
  }
  if (!chooseTarget(room, field, enemy, player, target)) return;

  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return;
  const step = Math.min(enemy.speed * stepSeconds, distance);

  position.x = enemy.x;
  position.y = enemy.y;
  moveBox(room, position, enemy.radius, (dx / distance) * step, (dy / distance) * step);
  enemy.x = position.x;
  enemy.y = position.y;
}

/**
 * Picks where to walk: straight at the player when the way is clear,
 * otherwise the center of the neighbour tile that is closest to the player.
 * Returns false when the player cannot be reached.
 */
function chooseTarget(
  room: RoomGrid,
  field: DistanceField,
  enemy: Enemy,
  player: Player,
  out: Vec2,
): boolean {
  if (hasClearPath(room, enemy.x, enemy.y, player.x, player.y, enemy.radius)) {
    out.x = player.x;
    out.y = player.y;
    return true;
  }

  const t = room.tileSize;
  const col = Math.floor(enemy.x / t);
  const row = Math.floor(enemy.y / t);
  const here = distanceAt(field, col, row);
  if (here === UNREACHABLE) return false;
  if (here === 0) {
    out.x = player.x;
    out.y = player.y;
    return true;
  }

  let bestCol = col;
  let bestRow = row;
  let best = here;
  for (let i = 0; i < 4; i++) {
    const c = col + (i === 0 ? 1 : i === 1 ? -1 : 0);
    const r = row + (i === 2 ? 1 : i === 3 ? -1 : 0);
    const d = distanceAt(field, c, r);
    if (d !== UNREACHABLE && d < best) {
      best = d;
      bestCol = c;
      bestRow = r;
    }
  }
  if (best === here) return false;
  out.x = (bestCol + 0.5) * t;
  out.y = (bestRow + 0.5) * t;
  return true;
}

/** True when a body of half-size `half` can walk in a straight line between the points. */
function hasClearPath(
  room: RoomGrid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  half: number,
): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return true;
  const side = half * SIDE_RAY_FRACTION;
  const nx = (-dy / distance) * side;
  const ny = (dx / distance) * side;
  return (
    hasLineOfSight(room, fromX, fromY, toX, toY) &&
    hasLineOfSight(room, fromX + nx, fromY + ny, toX + nx, toY + ny) &&
    hasLineOfSight(room, fromX - nx, fromY - ny, toX - nx, toY - ny)
  );
}
