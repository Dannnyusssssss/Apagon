import type { Enemy } from '../enemy';
import type { Flashlight } from '../flashlight';
import type { Player } from '../player';
import type { RoomGrid } from '../rooms';
import { isLit } from '../visibility';

/** Marks whether the flashlight touches the enemy this step. */
export function visibilitySystem(
  room: RoomGrid,
  flashlight: Flashlight,
  player: Player,
  enemy: Enemy,
  litRadius: number,
): void {
  enemy.lit = isLit(room, flashlight.on, player.x, player.y, litRadius, enemy.x, enemy.y);
}
