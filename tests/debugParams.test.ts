import { describe, expect, it } from 'vitest';
import { parseDebugParams, recordsAllowed } from '../src/core/debugParams';
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

describe('records with debug helps', () => {
  it('are saved only without any help', () => {
    expect(recordsAllowed(parseDebugParams(''))).toBe(true);
    for (const help of ['?god', '?level=1', '?seed=7', '?debug', '?debug&seed=7']) {
      expect(recordsAllowed(parseDebugParams(help))).toBe(false);
    }
  });

  it('are still saved when the on-screen controls are forced', () => {
    expect(recordsAllowed(parseDebugParams('?touch'))).toBe(true);
  });

  it('are saved when a help is written with an invalid value, because it is ignored', () => {
    expect(recordsAllowed(parseDebugParams('?seed=abc&level=9&god=no'))).toBe(true);
  });
});

describe('hostile debug params', () => {
  it('ignore a huge query string without breaking', () => {
    const params = parseDebugParams(`?seed=${'9'.repeat(1_100_000)}&level=${'1'.repeat(5000)}`);
    expect(params.seed).toBeNull();
    expect(params.level).toBeNull();
  });

  it('ignore control characters, emoji, HTML and paths', () => {
    for (const bad of [
      '\u0000',
      '%00',
      '😀',
      '<script>alert(1)</script>',
      '../../',
      "' OR 1=1 --",
    ]) {
      const value = encodeURIComponent(bad);
      const params = parseDebugParams(`?seed=${value}&level=${value}&god=${value}&debug=${value}`);
      expect(params).toEqual({ debug: false, god: false, seed: null, level: null, touch: false });
    }
  });

  it('read only the first value of a repeated parameter', () => {
    expect(parseDebugParams('?level=1&level=<b>').level).toBe(1);
    expect(parseDebugParams('?level=<b>&level=1').level).toBeNull();
  });
});
