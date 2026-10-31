import type { Vec2 } from '../../core/math';
import type { Enemy } from '../enemy';
import type { Player } from '../player';

/**
 * How close the enemy is, from 0 (at `nearDistance` or farther) to 1 (touching).
 * Drives the visual "enemy near" signal, so the game is playable without sound.
 */
export function enemyNearSystem(player: Player, enemy: Enemy, nearDistance: number): number {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.min(1, Math.max(0, 1 - distance / nearDistance));
}

/**
 * Turns `dir` (a unit vector) toward the enemy, at most `turnRate` radians per second,
 * so the directional shade glides instead of jumping sides when the enemy passes close.
 * When the enemy is exactly on the player the direction is kept.
 */
export function enemyDirectionSystem(
  player: Player,
  enemy: Enemy,
  dir: Vec2,
  turnRate: number,
  stepSeconds: number,
): void {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  if (dx === 0 && dy === 0) return;
  const current = Math.atan2(dir.y, dir.x);
  let delta = Math.atan2(dy, dx) - current;
  if (delta > Math.PI) delta -= Math.PI * 2;
  else if (delta < -Math.PI) delta += Math.PI * 2;
  const maxTurn = turnRate * stepSeconds;
  const angle = current + Math.max(-maxTurn, Math.min(maxTurn, delta));
  dir.x = Math.cos(angle);
  dir.y = Math.sin(angle);
}

/** Points `dir` straight at the enemy (start of a run). */
export function snapEnemyDirection(player: Player, enemy: Enemy, dir: Vec2): void {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return;
  dir.x = dx / length;
  dir.y = dy / length;
}
