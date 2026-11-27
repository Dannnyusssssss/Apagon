import { BALANCE } from './balance';

/** Graphics quality: only how many pixels the canvas has, never what the light touches. */
export type Quality = 'low' | 'medium' | 'high';

export const QUALITIES: readonly Quality[] = ['low', 'medium', 'high'];

/** A setting chosen on a slider: whole numbers from `min` to `max`, in `step` jumps. */
export interface RangeOption {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
}

/** Ranges of the settings in the options window. */
export const OPTIONS = {
  /** Percent of each channel, always under the overall volume and its limiter. */
  volume: { min: 0, max: 100, step: 10, default: 100 },
  /** Percent of the normal speed at which the beam turns, with keys, mouse or stick. */
  turnSensitivity: { min: 50, max: 150, step: 10, default: 100 },
  /**
   * Steps above normal. Each one makes the darkness a little thinner, never enough to see
   * what the light does not reach: a help for dim screens, not a way to light the house.
   */
  brightness: { min: 0, max: 5, step: 1, default: 0 },
  /** Darkness opacity taken away per brightness step (normal is `BALANCE.lighting.darknessAlpha`). */
  brightnessAlphaStep: 0.01,
  defaultQuality: 'high' as Quality,
} as const;

/** The value if it is a whole number on the slider, or null. */
export function rangeValue(value: unknown, range: RangeOption): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < range.min || value > range.max) return null;
  return (value - range.min) % range.step === 0 ? value : null;
}

export function isQuality(value: unknown): value is Quality {
  return QUALITIES.some((quality) => quality === value);
}

/** Darkness opacity for a brightness setting, never under normal minus the full range. */
export function darknessAlphaFor(steps: number): number {
  const range = OPTIONS.brightness;
  const clamped = Math.min(range.max, Math.max(range.min, Number.isFinite(steps) ? steps : 0));
  return BALANCE.lighting.darknessAlpha - clamped * OPTIONS.brightnessAlphaStep;
}

/** Canvas density limits for a graphics quality. */
export function qualityView(quality: Quality): {
  readonly maxRenderScale: number;
  readonly maxRenderPixels: number;
} {
  return BALANCE.view.quality[isQuality(quality) ? quality : OPTIONS.defaultQuality];
}
