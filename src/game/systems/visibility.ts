import type { Enemy } from '../enemy';
import type { Flashlight } from '../flashlight';
import type { Player } from '../player';
import type { RoomGrid } from '../rooms';
import { isLit, isLitCone } from '../visibility';

/**
 * Marks whether the flashlight touches the enemy this step: the whole circle in
 * classic mode, only the beam in cone mode (the small halo never counts).
 */
export function visibilitySystem(
  room: RoomGrid,
  flashlight: Flashlight,
  player: Player,
  enemy: Enemy,
  litRadius: number,
  classicLight: boolean,
  coneHalfAngle: number,
): void {
  enemy.lit = classicLight
    ? isLit(room, flashlight.on, player.x, player.y, litRadius, enemy.x, enemy.y)
    : isLitCone(
        room,
        flashlight.on,
        player.x,
        player.y,
        litRadius,
        flashlight.aim,
        coneHalfAngle,
        enemy.x,
        enemy.y,
      );
}
