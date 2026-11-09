import type { Vec2 } from '../../core/math';
import { moveBox } from '../collision';
import type { Enemy } from '../enemy';
import type { Player } from '../player';
import type { RoomGrid } from '../rooms';

export interface SeparationConfig {
  /** Enemies closer than this drift apart. */
  readonly separationDistance: number;
  /** Strongest drift, when they touch. Lower than their speed: a nudge, not a wall. */
  readonly separationSpeed: number;
}

const position: Vec2 = { x: 0, y: 0 };

/** An enemy held by the light or still waiting to start never moves. */
function canDrift(enemy: Enemy): boolean {
  return !enemy.lit && enemy.freezeTimer <= 0 && enemy.startTimer <= 0;
}

function distanceToPlayerSquared(enemy: Enemy, player: Player): number {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  return dx * dx + dy * dy;
}

/**
 * Keeps enemies from merging into one, since they all follow the same distance map.
 * Only the one farther from the player gives way: the front one is never pushed
 * toward the player, so this cannot make an enemy faster than it should be.
 */
export function separationSystem(
  room: RoomGrid,
  enemies: readonly Enemy[],
  player: Player,
  config: SeparationConfig,
  stepSeconds: number,
): void {
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= config.separationDistance) continue;

      const aGivesWay = distanceToPlayerSquared(a, player) > distanceToPlayerSquared(b, player);
      const mover = aGivesWay ? a : b;
      if (!canDrift(mover)) continue;

      // Exactly on top of each other: any fixed direction keeps the result repeatable.
      const awayX = distance === 0 ? 1 : (aGivesWay ? dx : -dx) / distance;
      const awayY = distance === 0 ? 0 : (aGivesWay ? dy : -dy) / distance;
      const push =
        config.separationSpeed * (1 - distance / config.separationDistance) * stepSeconds;
      position.x = mover.x;
      position.y = mover.y;
      moveBox(room, position, mover.radius, awayX * push, awayY * push);
      mover.x = position.x;
      mover.y = position.y;
    }
  }
}
