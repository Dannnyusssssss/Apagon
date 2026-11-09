import type { Enemy } from '../src/game/enemy';
import type { World } from '../src/game/world';

/** The first enemy of a world; every world has at least one. */
export function firstEnemy(world: World): Enemy {
  const enemy = world.enemies[0];
  if (!enemy) throw new Error('World has no enemy');
  return enemy;
}
