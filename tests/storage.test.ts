import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  isNewBest,
  loadSave,
  parseSave,
  SAVE_KEY,
  serializeSave,
  writeSave,
  type StorageLike,
} from '../src/save/storage';

class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('save key', () => {
  it('uses the game prefix', () => {
    expect(SAVE_KEY).toBe('apagon:v1');
  });
});

describe('parseSave', () => {
  it('reads a valid save', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { reduceFlicker: true },
      bestTimeSeconds: 42.5,
    });
    expect(parseSave(raw)).toEqual({ reduceFlicker: true, bestTimeSeconds: 42.5 });
  });

  it('returns defaults for missing or corrupt data', () => {
    for (const raw of [null, '', '{', 'null', '[]', '42', '"text"', '{"version":2}', '{}']) {
      expect(parseSave(raw)).toEqual(defaultSave());
    }
  });

  it('keeps valid fields and drops invalid ones, field by field', () => {
    expect(
      parseSave(
        JSON.stringify({ version: 1, settings: { reduceFlicker: 'yes' }, bestTimeSeconds: 30 }),
      ),
    ).toEqual({ reduceFlicker: null, bestTimeSeconds: 30 });
    expect(
      parseSave(
        JSON.stringify({ version: 1, settings: { reduceFlicker: false }, bestTimeSeconds: -5 }),
      ),
    ).toEqual({ reduceFlicker: false, bestTimeSeconds: null });
    expect(parseSave(JSON.stringify({ version: 1, settings: [], bestTimeSeconds: '30' }))).toEqual(
      defaultSave(),
    );
    expect(parseSave('{"version":1,"bestTimeSeconds":1e999}')).toEqual(defaultSave());
    expect(parseSave(JSON.stringify({ version: 1, bestTimeSeconds: 10 ** 9 }))).toEqual(
      defaultSave(),
    );
  });

  it('round-trips through serializeSave', () => {
    const data = { reduceFlicker: false, bestTimeSeconds: 12.3 };
    expect(parseSave(serializeSave(data))).toEqual(data);
    expect(parseSave(serializeSave(defaultSave()))).toEqual(defaultSave());
  });
});

describe('loadSave and writeSave', () => {
  it('writes only the game key and reads it back', () => {
    const storage = new MemoryStorage();
    expect(writeSave(storage, { reduceFlicker: true, bestTimeSeconds: 99 })).toBe(true);
    expect([...storage.data.keys()]).toEqual(['apagon:v1']);
    expect(loadSave(storage)).toEqual({ reduceFlicker: true, bestTimeSeconds: 99 });
  });

  it('survives corrupt stored data', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(loadSave(storage)).toEqual(defaultSave());
  });

  it('never throws when storage is blocked or missing', () => {
    expect(loadSave(throwing)).toEqual(defaultSave());
    expect(writeSave(throwing, defaultSave())).toBe(false);
    expect(loadSave(null)).toEqual(defaultSave());
    expect(writeSave(null, defaultSave())).toBe(false);
  });
});

describe('isNewBest', () => {
  it('compares against the stored best', () => {
    expect(isNewBest(50, null)).toBe(true);
    expect(isNewBest(40, 50)).toBe(true);
    expect(isNewBest(60, 50)).toBe(false);
    expect(isNewBest(50, 50)).toBe(false);
    expect(isNewBest(Number.NaN, null)).toBe(false);
  });
});
