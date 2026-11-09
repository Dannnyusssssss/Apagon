import { describe, expect, it } from 'vitest';
import { parseDebugParams } from '../src/core/debugParams';
import { LEVEL_COUNT } from '../src/data/levels';

describe('debug params', () => {
  it('are all off by default', () => {
    const off = { debug: false, god: false, seed: null, level: null, touch: false };
    expect(parseDebugParams('')).toEqual(off);
    expect(parseDebugParams('?other=1')).toEqual(off);
  });

  it('force the on-screen controls only with a valid touch flag', () => {
    expect(parseDebugParams('?touch').touch).toBe(true);
    expect(parseDebugParams('?touch=1').touch).toBe(true);
    expect(parseDebugParams('?touch=0').touch).toBe(false);
    expect(parseDebugParams('?touch=yes').touch).toBe(false);
  });

  it('read flags with no value, 1 or true', () => {
    expect(parseDebugParams('?debug').debug).toBe(true);
    expect(parseDebugParams('?debug=1&god=true')).toEqual({
      debug: true,
      god: true,
      seed: null,
      level: null,
      touch: false,
    });
    expect(parseDebugParams('?debug=0').debug).toBe(false);
    expect(parseDebugParams('?god=yes').god).toBe(false);
  });

  it('accept only whole numbers in range as seed', () => {
    expect(parseDebugParams('?seed=42').seed).toBe(42);
    expect(parseDebugParams('?seed=4294967295').seed).toBe(4294967295);
    for (const bad of ['-1', '1.5', 'abc', '', '4294967296', '1e3', '99999999999', '<b>']) {
      expect(parseDebugParams(`?seed=${encodeURIComponent(bad)}`).seed).toBeNull();
    }
  });

  it('accept only a level of the game', () => {
    expect(parseDebugParams('?level=1').level).toBe(1);
    expect(parseDebugParams(`?level=${String(LEVEL_COUNT)}`).level).toBe(LEVEL_COUNT);
    for (const bad of ['0', String(LEVEL_COUNT + 1), '-1', '1.5', 'abc', '', '01', '<b>']) {
      expect(parseDebugParams(`?level=${encodeURIComponent(bad)}`).level).toBeNull();
    }
  });
});
