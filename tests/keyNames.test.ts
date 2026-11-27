import { describe, expect, it } from 'vitest';
import { defaultBindings } from '../src/core/bindings';
import { BINDABLE_KEYS } from '../src/data/controls';
import { keyControlLines, usesShift } from '../src/ui/controlLines';
import { keyLabel } from '../src/ui/keyNames';

describe('keyLabel', () => {
  it('names letters, digits, arrows and special keys', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('Digit7')).toBe('7');
    expect(keyLabel('Numpad4')).toBe('Num 4');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Space')).toBe('Espacio');
    expect(keyLabel('ShiftLeft')).toBe('Shift');
    expect(keyLabel('Escape')).toBe('Esc');
    expect(keyLabel('Comma')).toBe(',');
  });

  it('gives every bindable key a short name', () => {
    for (const code of BINDABLE_KEYS) {
      const name = keyLabel(code);
      expect(name.length).toBeGreaterThan(0);
      expect(name.length).toBeLessThanOrEqual(10);
    }
  });

  it('uses the keyboard layout for letters and punctuation', () => {
    const layout = new Map([
      ['KeyQ', 'a'],
      ['Semicolon', 'ñ'],
      ['ArrowUp', 'x'],
    ]);
    expect(keyLabel('KeyQ', layout)).toBe('A');
    expect(keyLabel('Semicolon', layout)).toBe('Ñ');
    expect(keyLabel('ArrowUp', layout)).toBe('↑');
  });

  it('ignores layout names that are not a key cap', () => {
    const layout = new Map([
      ['KeyQ', '<script>'],
      ['KeyW', ''],
    ]);
    expect(keyLabel('KeyQ', layout)).toBe('Q');
    expect(keyLabel('KeyW', layout)).toBe('W');
  });

  it('never reads names from the object prototype', () => {
    expect(keyLabel('toString')).toBe('toString');
    expect(keyLabel('__proto__')).toBe('__proto__');
  });
});

describe('keyControlLines', () => {
  it('shows the default keys as before', () => {
    const lines = keyControlLines(defaultBindings(), null);
    expect(lines[0]).toEqual({ keys: ['W', 'A', 'S', 'D'], alt: ['Flechas'], label: 'Moverse' });
    expect(lines[1]).toEqual({ keys: ['Shift'], alt: ['F'], label: 'Linterna' });
    expect(lines[2]).toEqual({ keys: ['E'], alt: [], label: 'Interactuar' });
    expect(lines[3]).toEqual({ keys: ['Esc'], alt: ['P'], label: 'Pausa' });
    expect(lines[4]).toEqual({ keys: ['M'], alt: [], label: 'Sonido' });
  });

  it('follows changed keys', () => {
    const bindings = defaultBindings();
    bindings.up = ['KeyI', 'Numpad8'];
    bindings.interact = ['Space'];
    const lines = keyControlLines(bindings, null);
    expect(lines[0]?.keys).toEqual(['I', 'A', 'S', 'D']);
    expect(lines[0]?.alt).toEqual(['Num 8', '←', '↓', '→']);
    expect(lines[2]?.keys).toEqual(['Espacio']);
  });

  it('hides the alternative directions when one of them is missing', () => {
    const bindings = defaultBindings();
    bindings.left = ['KeyA'];
    expect(keyControlLines(bindings, null)[0]?.alt).toEqual([]);
  });

  it('knows when Shift is in use', () => {
    expect(usesShift(defaultBindings())).toBe(true);
    const bindings = defaultBindings();
    bindings.toggleFlashlight = ['KeyF'];
    expect(usesShift(bindings)).toBe(false);
  });
});
