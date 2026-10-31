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
  /** Only these keys get preventDefault while playing (avoid page scroll). */
  preventDefault: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'],
} as const;
