import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from '../src/data/levels';
import {
  defaultSave,
  isNewBest,
  loadSave,
  parseSave,
  SAVE_KEY,
  serializeSave,
  writeSave,
  type SaveData,
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

/** The defaults, with `changes` on top. */
function save(changes: Partial<SaveData>): SaveData {
  return { ...defaultSave(), ...changes };
}

/** Best times with only the first level won. */
function firstLevelBest(seconds: number): (number | null)[] {
  return [seconds, ...Array.from({ length: LEVEL_COUNT - 1 }, () => null)];
}

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
      unlockedLevel: 2,
      bestLevelTimes: [42.5, 80, null],
      bestFullRunSeconds: 300,
    });
    expect(parseSave(raw)).toEqual({
      reduceFlicker: true,
      muted: false,
      classicLight: false,
      mouseAim: true,
      touchControls: 'auto',
      leftHanded: false,
      unlockedLevel: 2,
      bestLevelTimes: [42.5, 80, null],
      bestFullRunSeconds: 300,
    });
  });

  it('returns defaults for missing or corrupt data', () => {
    for (const raw of [null, '', '{', 'null', '[]', '42', '"text"', '{"version":2}', '{}']) {
      expect(parseSave(raw)).toEqual(defaultSave());
    }
  });

  it('keeps valid fields and drops invalid ones, field by field', () => {
    expect(
      parseSave(
        JSON.stringify({ version: 1, settings: { reduceFlicker: 'yes' }, bestFullRunSeconds: 30 }),
      ),
    ).toEqual(save({ bestFullRunSeconds: 30 }));
    expect(
      parseSave(
        JSON.stringify({ version: 1, settings: { reduceFlicker: false }, bestFullRunSeconds: -5 }),
      ),
    ).toEqual(save({ reduceFlicker: false }));
    expect(
      parseSave(JSON.stringify({ version: 1, settings: [], bestFullRunSeconds: '30' })),
    ).toEqual(defaultSave());
    expect(parseSave('{"version":1,"bestFullRunSeconds":1e999}')).toEqual(defaultSave());
    expect(parseSave(JSON.stringify({ version: 1, bestFullRunSeconds: 10 ** 9 }))).toEqual(
      defaultSave(),
    );
  });

  it('round-trips through serializeSave', () => {
    const data = save({
      reduceFlicker: false,
      muted: true,
      classicLight: true,
      unlockedLevel: 3,
      bestLevelTimes: [12.3, null, 40],
      bestFullRunSeconds: 200,
    });
    expect(parseSave(serializeSave(data))).toEqual(data);
    expect(parseSave(serializeSave(defaultSave()))).toEqual(defaultSave());
  });
});

describe('level progress', () => {
  const parseWith = (fields: Record<string, unknown>): SaveData =>
    parseSave(JSON.stringify({ version: 1, ...fields }));

  it('starts at the first level without progress', () => {
    expect(defaultSave().unlockedLevel).toBe(1);
    expect(defaultSave().bestLevelTimes).toHaveLength(LEVEL_COUNT);
    expect(defaultSave().bestLevelTimes.every((t) => t === null)).toBe(true);
  });

  it('accepts only an unlocked level of the game', () => {
    expect(parseWith({ unlockedLevel: LEVEL_COUNT }).unlockedLevel).toBe(LEVEL_COUNT);
    for (const bad of [0, -1, LEVEL_COUNT + 1, 1.5, '2', null, true, [2], Infinity]) {
      expect(parseWith({ unlockedLevel: bad }).unlockedLevel).toBe(1);
    }
  });

  it('reads the times one by one and ignores whatever does not fit', () => {
    const times = parseWith({ bestLevelTimes: [10, 'x', -3, 99, 77] }).bestLevelTimes;
    expect(times).toEqual([10, null, null]);
    expect(parseWith({ bestLevelTimes: 'nope' }).bestLevelTimes).toEqual(
      defaultSave().bestLevelTimes,
    );
    expect(parseWith({ bestLevelTimes: { 0: 10 } }).bestLevelTimes).toEqual(
      defaultSave().bestLevelTimes,
    );
    expect(parseWith({ bestLevelTimes: [10 ** 9] }).bestLevelTimes).toEqual(
      defaultSave().bestLevelTimes,
    );
  });

  it('moves the single best time of older saves to the first level', () => {
    const old = parseSave(
      JSON.stringify({ version: 1, settings: { muted: true }, bestTimeSeconds: 55 }),
    );
    expect(old.bestLevelTimes).toEqual(firstLevelBest(55));
    expect(old.muted).toBe(true);
    // An older save has no progress, so it starts at the first level.
    expect(old.unlockedLevel).toBe(1);
    expect(old.bestFullRunSeconds).toBeNull();
  });

  it('ignores a corrupt old best time, and prefers the new times over it', () => {
    expect(parseWith({ bestTimeSeconds: 'fast' }).bestLevelTimes).toEqual(
      defaultSave().bestLevelTimes,
    );
    expect(parseWith({ bestTimeSeconds: 55, bestLevelTimes: [40] }).bestLevelTimes[0]).toBe(40);
  });

  it('stops writing the old field', () => {
    const written = JSON.parse(serializeSave(save({ bestLevelTimes: firstLevelBest(55) }))) as {
      bestTimeSeconds?: unknown;
    };
    expect(written.bestTimeSeconds).toBeUndefined();
  });
});

describe('muted setting', () => {
  it('reads it field by field and defaults to sound on', () => {
    expect(parseSave(JSON.stringify({ version: 1, settings: { muted: true } })).muted).toBe(true);
    expect(parseSave(JSON.stringify({ version: 1, settings: { muted: 'yes' } })).muted).toBe(false);
    expect(parseSave(JSON.stringify({ version: 1, settings: { muted: 1 } })).muted).toBe(false);
    // Older saves without the field keep their other values.
    expect(
      parseSave(
        JSON.stringify({ version: 1, settings: { reduceFlicker: true }, bestTimeSeconds: 20 }),
      ),
    ).toEqual(save({ reduceFlicker: true, bestLevelTimes: firstLevelBest(20) }));
  });
});

describe('loadSave and writeSave', () => {
  it('writes only the game key and reads it back', () => {
    const storage = new MemoryStorage();
    const data = save({
      reduceFlicker: true,
      muted: true,
      unlockedLevel: 2,
      bestLevelTimes: firstLevelBest(99),
    });
    expect(writeSave(storage, data)).toBe(true);
    expect([...storage.data.keys()]).toEqual(['apagon:v1']);
    expect(loadSave(storage)).toEqual(data);
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

describe('mouse aim setting', () => {
  it('is on by default and in older saves', () => {
    expect(defaultSave().mouseAim).toBe(true);
    expect(parseSave(JSON.stringify({ version: 1, settings: { muted: true } })).mouseAim).toBe(
      true,
    );
  });

  it('reads it field by field', () => {
    const read = (value: unknown): boolean =>
      parseSave(JSON.stringify({ version: 1, settings: { mouseAim: value } })).mouseAim;
    expect(read(false)).toBe(false);
    expect(read(true)).toBe(true);
    for (const bad of ['false', 0, null, []]) expect(read(bad)).toBe(true);
  });

  it('is written and read back', () => {
    const storage = new MemoryStorage();
    writeSave(storage, { ...defaultSave(), mouseAim: false });
    expect(loadSave(storage).mouseAim).toBe(false);
  });
});

describe('touch settings', () => {
  const parseSettings = (settings: unknown): SaveData =>
    parseSave(JSON.stringify({ version: 1, settings, bestFullRunSeconds: 5 }));

  it('are automatic and right-handed by default and in older saves', () => {
    expect(defaultSave().touchControls).toBe('auto');
    expect(defaultSave().leftHanded).toBe(false);
    const old = parseSettings({ muted: true });
    expect(old.touchControls).toBe('auto');
    expect(old.leftHanded).toBe(false);
    expect(old.muted).toBe(true);
  });

  it('read the three modes', () => {
    for (const mode of ['auto', 'always', 'never'] as const) {
      expect(parseSettings({ touchControls: mode }).touchControls).toBe(mode);
    }
  });

  it('ignore corrupt values, without spoiling the other fields', () => {
    for (const bad of ['sometimes', 'AUTO', '', 0, 1, null, [], {}, ['always']]) {
      const read = parseSettings({ touchControls: bad, leftHanded: bad });
      expect(read.touchControls).toBe('auto');
      expect(read.leftHanded).toBe(false);
      expect(read.bestFullRunSeconds).toBe(5);
    }
  });

  it('are written and read back', () => {
    const storage = new MemoryStorage();
    writeSave(storage, { ...defaultSave(), touchControls: 'never', leftHanded: true });
    expect(loadSave(storage).touchControls).toBe('never');
    expect(loadSave(storage).leftHanded).toBe(true);
  });
});

describe('classic light setting', () => {
  it('is off (cone) by default and in older saves', () => {
    expect(defaultSave().classicLight).toBe(false);
    expect(parseSave(JSON.stringify({ version: 1, settings: { muted: true } })).classicLight).toBe(
      false,
    );
  });

  it('reads it field by field', () => {
    const read = (value: unknown): boolean =>
      parseSave(
        JSON.stringify({ version: 1, settings: { classicLight: value }, bestFullRunSeconds: 5 }),
      ).classicLight;
    expect(read(true)).toBe(true);
    expect(read(false)).toBe(false);
    expect(read('true')).toBe(false);
    expect(read(1)).toBe(false);
    expect(read(null)).toBe(false);
    // A bad value does not spoil the other fields.
    expect(
      parseSave(
        JSON.stringify({ version: 1, settings: { classicLight: 'x' }, bestFullRunSeconds: 5 }),
      ).bestFullRunSeconds,
    ).toBe(5);
  });

  it('is written and read back', () => {
    const storage = new MemoryStorage();
    writeSave(storage, { ...defaultSave(), classicLight: true });
    expect(loadSave(storage).classicLight).toBe(true);
  });
});
