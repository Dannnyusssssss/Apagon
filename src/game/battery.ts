import type { Flashlight } from './flashlight';

export interface BatteryConfig {
  readonly drainSeconds: number;
  readonly minRadiusFraction: number;
  readonly rechargeAmount: number;
  readonly lowThreshold: number;
}

/** Spends charge while the light is on. At zero charge the light goes off. */
export function drainBattery(
  flashlight: Flashlight,
  config: BatteryConfig,
  stepSeconds: number,
): void {
  if (!flashlight.on) return;
  flashlight.battery = Math.max(0, flashlight.battery - stepSeconds / config.drainSeconds);
  if (flashlight.battery === 0) flashlight.on = false;
}

/** Adds charge, capped at full. */
export function rechargeBattery(flashlight: Flashlight, amount: number): void {
  flashlight.battery = Math.min(1, flashlight.battery + amount);
}

/** Light radius for a charge: full radius when full, shrinking to `minRadiusFraction`. */
export function lightRadius(
  battery: number,
  fullRadius: number,
  minRadiusFraction: number,
): number {
  const charge = Math.min(1, Math.max(0, battery));
  return fullRadius * (minRadiusFraction + (1 - minRadiusFraction) * charge);
}

export function isBatteryLow(battery: number, lowThreshold: number): boolean {
  return battery <= lowThreshold;
}
