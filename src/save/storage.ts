import { TOUCH_MODES, type TouchMode } from '../data/controls';
import { LEVEL_COUNT } from '../data/levels';
import { STORAGE_PREFIX } from '../data/meta';

/** The only key the game writes. The portal clears data by this prefix. */
export const SAVE_KEY = `${STORAGE_PREFIX}v1`;
const SAVE_VERSION = 1;
/** Times above this are treated as corrupt (more than a day of play). */
const MAX_TIME_SECONDS = 86_400;

export interface SaveData {
  /** null when the player never chose: the system preference is used instead. */
  reduceFlicker: boolean | null;
  /** Sound off. Missing in older saves: sound on. */
  muted: boolean;
  /** Classic round light (easier) instead of the cone. Missing in older saves: cone. */
  classicLight: boolean;
  /** Aim the cone with the mouse. Missing in older saves: on. */
  mouseAim: boolean;
  /** When the on-screen controls show. Missing in older saves: automatic. */
  touchControls: TouchMode;
  /** On-screen buttons on the left and the moving stick on the right. Missing: off. */
  leftHanded: boolean;
  /** Highest level that can be continued from (1 is the first). */
  unlockedLevel: number;
  /** Best time in seconds of each level, in play order; null if not won yet. */
  bestLevelTimes: (number | null)[];
  /** Best time of the whole game played from "New game", or null. */
  bestFullRunSeconds: number | null;
}

/** The subset of `Storage` the game uses, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(): SaveData {
  return {
    reduceFlicker: null,
    muted: false,
    classicLight: false,
    mouseAim: true,
    touchControls: 'auto',
    leftHanded: false,
    unlockedLevel: 1,
    bestLevelTimes: Array.from({ length: LEVEL_COUNT }, () => null),
    bestFullRunSeconds: null,
  };
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
  if (isRecord(settings) && typeof settings['muted'] === 'boolean') {
    data.muted = settings['muted'];
  }
  if (isRecord(settings) && typeof settings['classicLight'] === 'boolean') {
    data.classicLight = settings['classicLight'];
  }
  if (isRecord(settings) && typeof settings['mouseAim'] === 'boolean') {
    data.mouseAim = settings['mouseAim'];
  }
  if (isRecord(settings) && isTouchMode(settings['touchControls'])) {
    data.touchControls = settings['touchControls'];
  }
  if (isRecord(settings) && typeof settings['leftHanded'] === 'boolean') {
    data.leftHanded = settings['leftHanded'];
  }

  const unlocked = parsed['unlockedLevel'];
  if (
    typeof unlocked === 'number' &&
    Number.isInteger(unlocked) &&
    unlocked >= 1 &&
    unlocked <= LEVEL_COUNT
  ) {
    data.unlockedLevel = unlocked;
  }

  const times = parsed['bestLevelTimes'];
  if (Array.isArray(times)) {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const time: unknown = times[i];
      if (isValidTime(time)) data.bestLevelTimes[i] = time;
    }
  }
  // Saves from before the levels had a single best time: the first level is that map.
  const legacyBest = parsed['bestTimeSeconds'];
  if (data.bestLevelTimes[0] === null && isValidTime(legacyBest)) {
    data.bestLevelTimes[0] = legacyBest;
  }

  const fullRun = parsed['bestFullRunSeconds'];
  if (isValidTime(fullRun)) data.bestFullRunSeconds = fullRun;
  return data;
}

export function serializeSave(data: SaveData): string {
  const settings: Record<string, boolean | string> = {};
  if (data.reduceFlicker !== null) settings['reduceFlicker'] = data.reduceFlicker;
  settings['muted'] = data.muted;
  settings['classicLight'] = data.classicLight;
  settings['mouseAim'] = data.mouseAim;
  settings['touchControls'] = data.touchControls;
  settings['leftHanded'] = data.leftHanded;
  return JSON.stringify({
    version: SAVE_VERSION,
    settings,
    unlockedLevel: data.unlockedLevel,
    bestLevelTimes: data.bestLevelTimes.map((time) => (isValidTime(time) ? time : null)),
    bestFullRunSeconds: isValidTime(data.bestFullRunSeconds) ? data.bestFullRunSeconds : null,
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

/**
 * Combines what this tab is about to write with what is already stored, so a second
 * open tab never throws away progress made in the other one. Settings come from this
 * tab (the player just chose them); progress keeps the best of both: the highest
 * unlocked level and the lowest valid time of each level and of the whole game.
 */
export function mergeSave(stored: SaveData, mine: SaveData): SaveData {
  return {
    ...mine,
    unlockedLevel: Math.max(stored.unlockedLevel, mine.unlockedLevel),
    bestLevelTimes: mine.bestLevelTimes.map((time, i) =>
      bestOf(stored.bestLevelTimes[i] ?? null, time),
    ),
    bestFullRunSeconds: bestOf(stored.bestFullRunSeconds, mine.bestFullRunSeconds),
  };
}

function bestOf(a: number | null, b: number | null): number | null {
  const valid = [a, b].filter(isValidTime);
  return valid.length === 0 ? null : Math.min(...valid);
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

function isTouchMode(value: unknown): value is TouchMode {
  return TOUCH_MODES.some((mode) => mode === value);
}

function isValidTime(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_TIME_SECONDS
  );
}
