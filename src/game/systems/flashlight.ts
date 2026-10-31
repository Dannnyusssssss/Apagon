import { turnToward } from '../../core/math';
import { toggleFlashlight, type Flashlight } from '../flashlight';
import type { Player } from '../player';

export function flashlightSystem(flashlight: Flashlight, toggleRequested: boolean): void {
  if (toggleRequested) toggleFlashlight(flashlight);
}

/**
 * Turns the beam toward where the player faces, at most `turnRate` radians per second,
 * so the light never jumps when the player changes direction.
 */
export function aimSystem(
  flashlight: Flashlight,
  player: Player,
  turnRate: number,
  stepSeconds: number,
): void {
  flashlight.prevAim = flashlight.aim;
  const target = Math.atan2(player.facingY, player.facingX);
  flashlight.aim = turnToward(flashlight.aim, target, turnRate * stepSeconds);
}
