export interface Flashlight {
  on: boolean;
  /** Charge, 0 (empty) to 1 (full). The light cannot be on at 0. */
  battery: number;
  /** Light strength multiplier (1 = full). Lowered smoothly while flickering. */
  strength: number;
  /** Flicker amplitude, 0 (none) to 1 (full), faded in and out. */
  flickerAmount: number;
  /** Position inside the current flicker wave, in cycles (0..1). */
  flickerPhase: number;
  /** Seconds the flicker keeps going after its cause ends. */
  flickerHold: number;
  /** Where the beam points, in radians; turns smoothly toward where the player walks. */
  aim: number;
  /** Aim at the previous logic step, for render interpolation. */
  prevAim: number;
  /**
   * How far the light has faded in, 0 (off look) to 1 (on look). Only the picture fades:
   * the game logic uses `on`, which changes at once.
   */
  onAmount: number;
  /** Seconds before the player can switch the light again. */
  toggleCooldown: number;
}

export function createFlashlight(startsOn: boolean, aim = 0): Flashlight {
  return {
    on: startsOn,
    battery: 1,
    strength: 1,
    flickerAmount: 0,
    flickerPhase: 0,
    flickerHold: 0,
    aim,
    prevAim: aim,
    onAmount: startsOn ? 1 : 0,
    toggleCooldown: 0,
  };
}

export function resetFlashlight(flashlight: Flashlight, startsOn: boolean, aim = 0): void {
  flashlight.aim = aim;
  flashlight.prevAim = aim;
  flashlight.on = startsOn;
  flashlight.battery = 1;
  flashlight.strength = 1;
  flashlight.flickerAmount = 0;
  flashlight.flickerPhase = 0;
  flashlight.flickerHold = 0;
  flashlight.onAmount = startsOn ? 1 : 0;
  flashlight.toggleCooldown = 0;
}

/** Switches the light; it stays off while the battery is empty. */
export function toggleFlashlight(flashlight: Flashlight): void {
  flashlight.on = !flashlight.on && flashlight.battery > 0;
}
