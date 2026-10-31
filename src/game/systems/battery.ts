import { drainBattery, type BatteryConfig } from '../battery';
import type { Flashlight } from '../flashlight';

export function batterySystem(
  flashlight: Flashlight,
  config: BatteryConfig,
  stepSeconds: number,
): void {
  drainBattery(flashlight, config, stepSeconds);
}
