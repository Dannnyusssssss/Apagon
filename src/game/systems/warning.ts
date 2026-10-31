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
