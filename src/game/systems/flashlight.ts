import { turnToward, type Vec2 } from '../../core/math';
import { toggleFlashlight, type Flashlight } from '../flashlight';
import type { Player } from '../player';

export interface LightSwitchConfig {
  /** Seconds the picture takes to fade fully in or out after a switch. */
  readonly toggleFadeSeconds: number;
  /** Minimum seconds between two switches made by the player. */
  readonly minToggleInterval: number;
}

/**
 * Switches the light on request, at most once every `minToggleInterval`, and fades
 * `onAmount` toward the current state over `toggleFadeSeconds`. Together they keep
 * fast pressing from turning into sudden full-screen changes of light
 * (photosensitivity). A light turned off by an empty battery fades out the same way.
 */
export function flashlightSystem(
  flashlight: Flashlight,
  toggleRequested: boolean,
  config: LightSwitchConfig,
  stepSeconds: number,
): void {
  flashlight.toggleCooldown = Math.max(0, flashlight.toggleCooldown - stepSeconds);
  if (toggleRequested && flashlight.toggleCooldown === 0) {
    const wasOn = flashlight.on;
    toggleFlashlight(flashlight);
    if (flashlight.on !== wasOn) flashlight.toggleCooldown = config.minToggleInterval;
  }
  fadeLight(flashlight, config.toggleFadeSeconds, stepSeconds);
}

/** Moves `onAmount` toward the light state at a steady rate; instant when the fade is 0. */
export function fadeLight(flashlight: Flashlight, fadeSeconds: number, stepSeconds: number): void {
  const goal = flashlight.on ? 1 : 0;
  const delta = fadeSeconds > 0 ? stepSeconds / fadeSeconds : 1;
  flashlight.onAmount =
    goal > flashlight.onAmount
      ? Math.min(goal, flashlight.onAmount + delta)
      : Math.max(goal, flashlight.onAmount - delta);
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
