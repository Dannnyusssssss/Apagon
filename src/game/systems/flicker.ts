import type { Flashlight } from '../flashlight';

export interface FlickerConfig {
  readonly frequencyHz: number;
  readonly minStrength: number;
  readonly fadePerSecond: number;
  readonly holdSeconds: number;
}

/**
 * Smoothly dims and restores the flashlight while the enemy is lit, and for a
 * short hold afterwards. The strength follows a cosine wave, so it never jumps
 * and never goes below `minStrength`. With `reduceFlicker` the light stays steady.
 */
export function flickerSystem(
  flashlight: Flashlight,
  triggered: boolean,
  reduceFlicker: boolean,
  config: FlickerConfig,
  stepSeconds: number,
): void {
  if (triggered) flashlight.flickerHold = config.holdSeconds;
  else flashlight.flickerHold = Math.max(0, flashlight.flickerHold - stepSeconds);

  if (reduceFlicker) {
    flashlight.flickerAmount = 0;
  } else {
    const goal = flashlight.flickerHold > 0 ? 1 : 0;
    const fade = config.fadePerSecond * stepSeconds;
    flashlight.flickerAmount =
      goal > flashlight.flickerAmount
        ? Math.min(goal, flashlight.flickerAmount + fade)
        : Math.max(goal, flashlight.flickerAmount - fade);
  }

  if (flashlight.flickerAmount === 0) {
    flashlight.flickerPhase = 0;
    flashlight.strength = 1;
    return;
  }

  flashlight.flickerPhase = (flashlight.flickerPhase + config.frequencyHz * stepSeconds) % 1;
  const wave = (1 - Math.cos(flashlight.flickerPhase * Math.PI * 2)) / 2;
  flashlight.strength = 1 - (1 - config.minStrength) * flashlight.flickerAmount * wave;
}
