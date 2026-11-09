import { LEVEL_COUNT } from '../data/levels';

export interface DebugParams {
  /** Show the debug overlay. */
  debug: boolean;
  /** The enemy cannot catch the player. */
  god: boolean;
  /** Fixed seed for gameplay random choices, or null for a time-based seed. */
  seed: number | null;
  /** Level to play (1 is the first), without touching the saved progress; or null. */
  level: number | null;
  /** Shows the on-screen controls on any device, and lets the mouse use them. */
  touch: boolean;
}

const MAX_SEED = 0xffffffff;

/**
 * Reads debug options from a URL query string. Everything is off by default
 * and any malformed value is ignored. A flag is on when present with no value,
 * "1" or "true".
 */
export function parseDebugParams(search: string): DebugParams {
  const result: DebugParams = { debug: false, god: false, seed: null, level: null, touch: false };
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return result;
  }
  result.debug = isFlagOn(params.get('debug'));
  result.god = isFlagOn(params.get('god'));
  result.touch = isFlagOn(params.get('touch'));
  const seed = params.get('seed');
  if (seed !== null && /^\d{1,10}$/.test(seed)) {
    const value = Number(seed);
    if (value <= MAX_SEED) result.seed = value;
  }
  const level = params.get('level');
  if (level !== null && /^[1-9]$/.test(level)) {
    const value = Number(level);
    if (value <= LEVEL_COUNT) result.level = value;
  }
  return result;
}

function isFlagOn(value: string | null): boolean {
  return value === '' || value === '1' || value === 'true';
}
