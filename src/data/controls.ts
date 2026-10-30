/** Keyboard bindings, by KeyboardEvent.code (layout independent). */
export const CONTROLS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  toggleFlashlight: ['ShiftLeft', 'ShiftRight', 'KeyF'],
  /** Only these keys get preventDefault while playing (avoid page scroll). */
  preventDefault: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'],
} as const;
