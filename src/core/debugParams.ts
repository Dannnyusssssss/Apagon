export interface DebugParams {
  /** Show the debug overlay. */
  debug: boolean;
  /** The enemy cannot catch the player. */
  god: boolean;
  /** Fixed seed for gameplay random choices, or null for a time-based seed. */
  seed: number | null;
}

const MAX_SEED = 0xffffffff;

/**
 * Reads debug options from a URL query string. Everything is off by default
 * and any malformed value is ignored. A flag is on when present with no value,
 * "1" or "true".
 */
export function parseDebugParams(search: string): DebugParams {
  const result: DebugParams = { debug: false, god: false, seed: null };
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return result;
  }
  result.debug = isFlagOn(params.get('debug'));
  result.god = isFlagOn(params.get('god'));
  const seed = params.get('seed');
  if (seed !== null && /^\d{1,10}$/.test(seed)) {
    const value = Number(seed);
    if (value <= MAX_SEED) result.seed = value;
  }
  return result;
}

function isFlagOn(value: string | null): boolean {
  return value === '' || value === '1' || value === 'true';
}
