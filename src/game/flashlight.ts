export interface Flashlight {
  on: boolean;
}

export function createFlashlight(startsOn: boolean): Flashlight {
  return { on: startsOn };
}

export function toggleFlashlight(flashlight: Flashlight): void {
  flashlight.on = !flashlight.on;
}
