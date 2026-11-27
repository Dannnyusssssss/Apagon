/** What a key can do in the game. */
export type Action =
  'up' | 'down' | 'left' | 'right' | 'toggleFlashlight' | 'interact' | 'pause' | 'mute';

/** In the order the controls window lists them. */
export const ACTIONS: readonly Action[] = [
  'up',
  'down',
  'left',
  'right',
  'toggleFlashlight',
  'interact',
  'pause',
  'mute',
];

/** Keys per action the player can set: a main key and an alternative. */
export const KEYS_PER_ACTION = 2;

/**
 * Keyboard bindings, by KeyboardEvent.code (layout independent). `ShiftLeft` stands for
 * both Shift keys. The player can change them; these are the defaults.
 */
export const DEFAULT_BINDINGS: Readonly<Record<Action, readonly string[]>> = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  toggleFlashlight: ['ShiftLeft', 'KeyF'],
  interact: ['KeyE'],
  pause: ['KeyP'],
  mute: ['KeyM'],
};

/** Fixed keys, besides the bindings. */
export const FIXED_KEYS = {
  /** Escape always pauses and keeps its browser meaning: focus moves to the pause menu. */
  pause: 'Escape',
  /** Shows or hides the performance panel. Its browser action (find next) is prevented. */
  stats: 'F3',
} as const;

/** Codes that count as another one: both Shift keys are one key in the bindings. */
export const KEY_ALIASES: Readonly<Record<string, string>> = { ShiftRight: 'ShiftLeft' };

/**
 * Keys the player may bind. Left out on purpose: Tab and Escape (they leave the game in
 * the portal), function keys, Ctrl, Alt, Meta and Caps Lock (browser and system
 * shortcuts), and Slash and Quote (quick find in some browsers).
 */
export const BINDABLE_KEYS: ReadonlySet<string> = new Set([
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => `Key${letter}`),
  ...'0123456789'.split('').map((digit) => `Digit${digit}`),
  ...'0123456789'.split('').map((digit) => `Numpad${digit}`),
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'ShiftLeft',
  'Enter',
  'NumpadEnter',
  'Comma',
  'Period',
  'Semicolon',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'IntlBackslash',
  'Backquote',
]);

/** Only these keys get preventDefault while playing (avoid page scroll), besides F3. */
export const PREVENT_DEFAULT_KEYS: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
];

/** The saved choice for the on-screen controls. */
export type TouchMode = 'auto' | 'always' | 'never';

export const TOUCH_MODES: readonly TouchMode[] = ['auto', 'always', 'never'];

/** On-screen controls, in CSS pixels unless noted. */
export const TOUCH = {
  /** How far the knob travels from where the finger landed. */
  stickRadius: 56,
  /** Fraction of the radius that counts as not moving. */
  stickDeadZone: 0.15,
  /** World units from the player to the point the aim stick points at. */
  aimReach: 1000,
  /** Milliseconds an end screen ignores taps after opening, so a late tap does not skip it. */
  endScreenGuardMs: 350,
  /** Milliseconds a menu waits to change its layout after the first touch ever. */
  menuLayoutDelayMs: 400,
  /** Space the action buttons take in their bottom corner, kept free of the HUD prompt. */
  buttonsWidth: 108,
  buttonsHeight: 164,
  /** Space the pause button takes in its top corner, kept free of the sound indicator. */
  pauseSize: 48,
} as const;
