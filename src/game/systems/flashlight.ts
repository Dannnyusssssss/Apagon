import { turnToward, type Vec2 } from '../../core/math';
import { toggleFlashlight, type Flashlight } from '../flashlight';
import type { Player } from '../player';

export function flashlightSystem(flashlight: Flashlight, toggleRequested: boolean): void {
  if (toggleRequested) toggleFlashlight(flashlight);
}

/**
 * Turns the beam toward where the player faces, or toward `aimAt` when the mouse is in
 * use, at most `turnRate` radians per second, so the light never jumps. With the mouse
 * within `deadZone` of the player the beam holds still.
 */
export function aimSystem(
  flashlight: Flashlight,
  player: Player,
  turnRate: number,
  stepSeconds: number,
  aimAt: Vec2 | null = null,
  deadZone = 0,
): void {
  flashlight.prevAim = flashlight.aim;
  let target = Math.atan2(player.facingY, player.facingX);
  if (aimAt) {
    const dx = aimAt.x - player.x;
    const dy = aimAt.y - player.y;
    if (dx * dx + dy * dy <= deadZone * deadZone) return;
    target = Math.atan2(dy, dx);
  }
  flashlight.aim = turnToward(flashlight.aim, target, turnRate * stepSeconds);
}
