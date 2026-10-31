export interface Flashlight {
  on: boolean;
  /** Light strength multiplier (1 = full). Lowered smoothly while flickering. */
  strength: number;
  /** Flicker amplitude, 0 (none) to 1 (full), faded in and out. */
  flickerAmount: number;
  /** Position inside the current flicker wave, in cycles (0..1). */
  flickerPhase: number;
  /** Seconds the flicker keeps going after its cause ends. */
  flickerHold: number;
}

export function createFlashlight(startsOn: boolean): Flashlight {
  return { on: startsOn, strength: 1, flickerAmount: 0, flickerPhase: 0, flickerHold: 0 };
}

export function resetFlashlight(flashlight: Flashlight, startsOn: boolean): void {
  flashlight.on = startsOn;
  flashlight.strength = 1;
  flashlight.flickerAmount = 0;
  flashlight.flickerPhase = 0;
  flashlight.flickerHold = 0;
}

export function toggleFlashlight(flashlight: Flashlight): void {
  flashlight.on = !flashlight.on;
}
