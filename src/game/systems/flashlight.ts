import { toggleFlashlight, type Flashlight } from '../flashlight';

export function flashlightSystem(flashlight: Flashlight, toggleRequested: boolean): void {
  if (toggleRequested) toggleFlashlight(flashlight);
}
