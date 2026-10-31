/** Seeded pseudo-random generator (mulberry32). Same seed, same sequence. */
export interface Rng {
  state: number;
}

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

/** Returns a float in [0, 1). */
export function nextFloat(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Returns an integer in [0, maxExclusive). */
export function nextInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(nextFloat(rng) * maxExclusive);
}
