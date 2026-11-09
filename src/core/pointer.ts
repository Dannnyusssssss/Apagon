/**
 * Where the mouse is, without DOM access, so it can be tested. Moving it on a menu only
 * updates the position: aiming starts with a move during play, so the game stays exactly
 * the same for someone playing with the keyboard alone.
 */
export class PointerAim {
  /** Last position in CSS pixels, relative to the canvas. Kept if the mouse leaves the game. */
  x = 0;
  y = 0;
  /** True once the mouse has moved during play. */
  active = false;

  move(x: number, y: number, playing: boolean): void {
    this.x = x;
    this.y = y;
    if (playing) this.active = true;
  }
}

/**
 * Connects a PointerAim to the mouse. It listens on the container, because the menus
 * cover the canvas and the position must stay right when they close. Touch does not count.
 */
export function attachPointer(
  container: HTMLElement,
  canvas: HTMLElement,
  pointer: PointerAim,
  isPlaying: () => boolean,
): void {
  container.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    pointer.move(event.clientX - rect.left, event.clientY - rect.top, isPlaying());
  });
}
