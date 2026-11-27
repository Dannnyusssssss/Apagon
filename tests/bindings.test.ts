import { describe, expect, it } from 'vitest';
import {
  actionOf,
  assignKey,
  bindingsEqual,
  canonicalKey,
  codesFor,
  defaultBindings,
  isBindable,
} from '../src/core/bindings';
import { InputState } from '../src/core/input';
import { ACTIONS, BINDABLE_KEYS } from '../src/data/controls';

const axis = { x: 0, y: 0 };

describe('default bindings', () => {
  it('give every action one or two keys, never shared', () => {
    const bindings = defaultBindings();
    const seen = new Set<string>();
    for (const action of ACTIONS) {
      const keys = bindings[action];
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys.length).toBeLessThanOrEqual(2);
      for (const key of keys) {
        expect(BINDABLE_KEYS.has(key)).toBe(true);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it('are copies, so changing one never changes the defaults', () => {
    const a = defaultBindings();
    a.up.push('KeyZ');
    expect(defaultBindings().up).toEqual(['KeyW', 'ArrowUp']);
  });
});

describe('bindable keys', () => {
  it('leave out the keys that leave the game or belong to the browser', () => {
    for (const code of [
      'Tab',
      'Escape',
      'F1',
      'F3',
      'F5',
      'F11',
      'F12',
      'ControlLeft',
      'AltLeft',
      'MetaLeft',
      'CapsLock',
      'Slash',
      'Quote',
      'Backspace',
    ]) {
      expect(isBindable(code)).toBe(false);
    }
  });

  it('count both Shift keys as one', () => {
    expect(canonicalKey('ShiftRight')).toBe('ShiftLeft');
    expect(canonicalKey('KeyQ')).toBe('KeyQ');
    expect(canonicalKey('__proto__')).toBe('__proto__');
    expect(isBindable('ShiftRight')).toBe(true);
    expect(codesFor('ShiftLeft')).toEqual(['ShiftLeft', 'ShiftRight']);
    expect(codesFor('KeyE')).toEqual(['KeyE']);
  });
});

describe('assignKey', () => {
  it('binds a free key', () => {
    const { bindings, result } = assignKey(defaultBindings(), 'interact', 0, 'KeyQ');
    expect(result.kind).toBe('assigned');
    expect(bindings.interact).toEqual(['KeyQ']);
  });

  it('fills the empty alternative slot', () => {
    const { bindings } = assignKey(defaultBindings(), 'interact', 1, 'KeyQ');
    expect(bindings.interact).toEqual(['KeyE', 'KeyQ']);
  });

  it('swaps with the action that had the key', () => {
    const { bindings, result } = assignKey(defaultBindings(), 'up', 0, 'KeyE');
    expect(result).toEqual({ kind: 'swapped', other: 'interact' });
    expect(bindings.up).toEqual(['KeyE', 'ArrowUp']);
    expect(bindings.interact).toEqual(['KeyW']);
  });

  it('takes the key from an action that keeps another one', () => {
    const { bindings, result } = assignKey(defaultBindings(), 'interact', 1, 'KeyF');
    expect(result).toEqual({ kind: 'moved', other: 'toggleFlashlight' });
    expect(bindings.interact).toEqual(['KeyE', 'KeyF']);
    expect(bindings.toggleFlashlight).toEqual(['ShiftLeft']);
  });

  it('refuses to leave an action without keys', () => {
    const start = defaultBindings();
    const { bindings, result } = assignKey(start, 'interact', 1, 'KeyM');
    expect(result).toEqual({ kind: 'refused', reason: 'wouldEmpty', other: 'mute' });
    expect(bindingsEqual(bindings, start)).toBe(true);
  });

  it('refuses keys that cannot be bound, and changes nothing', () => {
    for (const code of ['Tab', 'Escape', 'F3', 'ControlLeft', '', 'KeyW!']) {
      const { bindings, result } = assignKey(defaultBindings(), 'up', 0, code);
      expect(result).toEqual({ kind: 'refused', reason: 'notBindable' });
      expect(bindingsEqual(bindings, defaultBindings())).toBe(true);
    }
  });

  it('trades the two keys of the same action', () => {
    const { bindings } = assignKey(defaultBindings(), 'up', 0, 'ArrowUp');
    expect(bindings.up).toEqual(['ArrowUp', 'KeyW']);
  });

  it('does nothing when the key is already there', () => {
    expect(assignKey(defaultBindings(), 'up', 0, 'KeyW').result.kind).toBe('unchanged');
    expect(assignKey(defaultBindings(), 'interact', 1, 'KeyE').result.kind).toBe('unchanged');
  });

  it('stores the right Shift as the Shift binding', () => {
    const { bindings } = assignKey(defaultBindings(), 'interact', 1, 'ShiftRight');
    expect(bindings.interact).toEqual(['KeyE', 'ShiftLeft']);
    expect(bindings.toggleFlashlight).toEqual(['KeyF']);
  });

  it('never changes the bindings it was given', () => {
    const start = defaultBindings();
    assignKey(start, 'up', 0, 'KeyE');
    expect(bindingsEqual(start, defaultBindings())).toBe(true);
  });

  it('keeps every key on one action only, whatever the order of changes', () => {
    let bindings = defaultBindings();
    const keys = ['KeyE', 'KeyW', 'KeyQ', 'ArrowUp', 'Space', 'KeyM', 'ShiftRight', 'KeyF'];
    let n = 0;
    for (const action of ACTIONS) {
      for (const slot of [0, 1]) {
        bindings = assignKey(bindings, action, slot, keys[n++ % keys.length] ?? 'KeyQ').bindings;
        const all = ACTIONS.flatMap((a) => bindings[a]);
        expect(new Set(all).size).toBe(all.length);
        for (const a of ACTIONS) expect(bindings[a].length).toBeGreaterThan(0);
      }
    }
    expect(actionOf(bindings, 'ShiftRight')).toBe(actionOf(bindings, 'ShiftLeft'));
  });
});

describe('InputState with custom keys', () => {
  it('moves and acts with the new keys only', () => {
    const bindings = defaultBindings();
    bindings.up = ['KeyI'];
    bindings.interact = ['Space'];
    const input = new InputState(bindings);
    input.keyDown('KeyW', false);
    expect(input.readAxis(axis)).toEqual({ x: 0, y: 0 });
    input.keyDown('KeyI', false);
    expect(input.readAxis(axis)).toEqual({ x: 0, y: -1 });
    input.keyDown('Space', false);
    expect(input.consumeInteract()).toBe(true);
    input.keyDown('KeyE', false);
    expect(input.consumeInteract()).toBe(false);
  });

  it('pauses with Escape whatever the bindings', () => {
    const bindings = defaultBindings();
    bindings.pause = ['KeyO'];
    const input = new InputState(bindings);
    input.keyDown('Escape', false);
    expect(input.consumePause()).toBe(true);
    input.keyDown('KeyP', false);
    expect(input.consumePause()).toBe(false);
    input.keyDown('KeyO', false);
    expect(input.consumePause()).toBe(true);
  });

  it('accepts both Shift keys for a Shift binding', () => {
    const input = new InputState();
    input.keyDown('ShiftRight', false);
    expect(input.consumeToggle()).toBe(true);
    input.keyDown('ShiftLeft', false);
    expect(input.consumeToggle()).toBe(true);
  });

  it('forgets held keys when the bindings change', () => {
    const input = new InputState();
    input.keyDown('KeyD', false);
    input.setBindings(defaultBindings());
    expect(input.readAxis(axis)).toEqual({ x: 0, y: 0 });
  });

  it('asks for the stats panel with F3 and blocks its browser action', () => {
    const input = new InputState();
    expect(input.keyDown('F3', false)).toBe(true);
    expect(input.consumeStats()).toBe(true);
    expect(input.consumeStats()).toBe(false);
    expect(input.keyDown('F3', true)).toBe(true);
    expect(input.consumeStats()).toBe(false);
  });

  it('prevents the browser action only for arrows, space and F3', () => {
    const input = new InputState();
    expect(input.keyDown('KeyW', false)).toBe(false);
    expect(input.keyDown('Escape', false)).toBe(false);
    expect(input.keyDown('Tab', false)).toBe(false);
    expect(input.keyDown('ArrowUp', false)).toBe(true);
    expect(input.keyDown('Space', false)).toBe(true);
  });
});
