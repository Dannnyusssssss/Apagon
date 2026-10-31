import type { Enemy } from '../enemy';
import type { Player } from '../player';

/** True when the enemy is close enough to reach the player. */
export function catchSystem(player: Player, enemy: Enemy, catchDistance: number): boolean {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  return dx * dx + dy * dy <= catchDistance * catchDistance;
}
