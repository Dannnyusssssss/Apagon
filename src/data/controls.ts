/** Keyboard bindings, by KeyboardEvent.code (layout independent). */
export const CONTROLS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  toggleFlashlight: ['ShiftLeft', 'ShiftRight', 'KeyF'],
  interact: ['KeyE'],
  /** Escape keeps its browser meaning too: it pauses and focus moves to the pause menu. */
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  /** Only these keys get preventDefault while playing (avoid page scroll). */
  preventDefault: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'],
} as const;

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
