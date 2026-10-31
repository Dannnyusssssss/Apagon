import { STORAGE_PREFIX } from '../data/meta';

/** The only key the game writes. The portal clears data by this prefix. */
export const SAVE_KEY = `${STORAGE_PREFIX}v1`;
const SAVE_VERSION = 1;
/** Times above this are treated as corrupt (more than a day of play). */
const MAX_TIME_SECONDS = 86_400;

export interface SaveData {
  /** null when the player never chose: the system preference is used instead. */
  reduceFlicker: boolean | null;
  /** Best winning time in seconds, or null if the game was never won. */
  bestTimeSeconds: number | null;
}

/** The subset of `Storage` the game uses, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(): SaveData {
  return { reduceFlicker: null, bestTimeSeconds: null };
}

/**
 * Reads a save string field by field. Anything missing, malformed or of an
 * unknown version falls back to the default for that field.
 */
export function parseSave(raw: string | null): SaveData {
  const data = defaultSave();
  if (raw === null) return data;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return data;
  }
  if (!isRecord(parsed) || parsed['version'] !== SAVE_VERSION) return data;

  const settings = parsed['settings'];
  if (isRecord(settings) && typeof settings['reduceFlicker'] === 'boolean') {
    data.reduceFlicker = settings['reduceFlicker'];
  }
  const best = parsed['bestTimeSeconds'];
  if (isValidTime(best)) data.bestTimeSeconds = best;
  return data;
}

export function serializeSave(data: SaveData): string {
  const settings: Record<string, boolean> = {};
  if (data.reduceFlicker !== null) settings['reduceFlicker'] = data.reduceFlicker;
  return JSON.stringify({
    version: SAVE_VERSION,
    settings,
    bestTimeSeconds: isValidTime(data.bestTimeSeconds) ? data.bestTimeSeconds : null,
  });
}

/** Never throws: storage can be blocked (privacy settings, sandboxed frames). */
export function loadSave(storage: StorageLike | null): SaveData {
  if (!storage) return defaultSave();
  try {
    return parseSave(storage.getItem(SAVE_KEY));
  } catch {
    return defaultSave();
  }
}

/** Returns false when the data could not be written. Never throws. */
export function writeSave(storage: StorageLike | null, data: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, serializeSave(data));
    return true;
  } catch {
    return false;
  }
}

/** True when `time` beats the stored best (or there is none). */
export function isNewBest(time: number, best: number | null): boolean {
  return isValidTime(time) && (best === null || time < best);
}

/** The browser storage, or null when access to it is blocked. */
export function getBrowserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidTime(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_TIME_SECONDS
  );
}
