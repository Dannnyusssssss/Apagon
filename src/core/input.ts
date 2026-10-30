import { CONTROLS } from '../data/controls';
import type { Vec2 } from './math';

const PREVENT_DEFAULT: ReadonlySet<string> = new Set(CONTROLS.preventDefault);
const TOGGLE_FLASHLIGHT: ReadonlySet<string> = new Set(CONTROLS.toggleFlashlight);

/** Keyboard state without DOM access, so it can be tested. */
export class InputState {
  private readonly down = new Set<string>();
  private toggleRequested = false;

  /** Returns true when the browser default action must be prevented. */
  keyDown(code: string, repeat: boolean): boolean {
    this.down.add(code);
    if (!repeat && TOGGLE_FLASHLIGHT.has(code)) {
      this.toggleRequested = true;
    }
    return PREVENT_DEFAULT.has(code);
  }

  keyUp(code: string): void {
    this.down.delete(code);
  }

  clear(): void {
    this.down.clear();
    this.toggleRequested = false;
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** Returns true once per flashlight key press. */
  consumeToggle(): boolean {
    const requested = this.toggleRequested;
    this.toggleRequested = false;
    return requested;
  }

  /** Writes the raw movement axis (-1, 0 or 1 per component) into `out`. */
  readAxis(out: Vec2): Vec2 {
    out.x = this.anyDown(CONTROLS.right) - this.anyDown(CONTROLS.left);
    out.y = this.anyDown(CONTROLS.down) - this.anyDown(CONTROLS.up);
    return out;
  }

  private anyDown(codes: readonly string[]): number {
    for (const code of codes) {
      if (this.down.has(code)) return 1;
    }
    return 0;
  }
}

/** Connects an InputState to keyboard events of a focusable element. */
export function attachKeyboard(target: HTMLElement, input: InputState): void {
  target.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (input.keyDown(event.code, event.repeat)) event.preventDefault();
  });
  target.addEventListener('keyup', (event) => {
    input.keyUp(event.code);
  });
  target.addEventListener('blur', () => {
    input.clear();
  });
}
