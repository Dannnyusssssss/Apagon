import { CONTROLS } from '../data/controls';
import type { Vec2 } from './math';

const PREVENT_DEFAULT: ReadonlySet<string> = new Set(CONTROLS.preventDefault);
const TOGGLE_FLASHLIGHT: ReadonlySet<string> = new Set(CONTROLS.toggleFlashlight);
const INTERACT: ReadonlySet<string> = new Set(CONTROLS.interact);
const PAUSE: ReadonlySet<string> = new Set(CONTROLS.pause);
const MUTE: ReadonlySet<string> = new Set(CONTROLS.mute);

/** Keyboard state without DOM access, so it can be tested. */
export class InputState {
  private readonly down = new Set<string>();
  private toggleRequested = false;
  private interactRequested = false;
  private pauseRequested = false;
  private muteRequested = false;

  /** Returns true when the browser default action must be prevented. */
  keyDown(code: string, repeat: boolean): boolean {
    this.down.add(code);
    if (!repeat) {
      if (TOGGLE_FLASHLIGHT.has(code)) this.toggleRequested = true;
      if (INTERACT.has(code)) this.interactRequested = true;
      if (PAUSE.has(code)) this.pauseRequested = true;
      if (MUTE.has(code)) this.muteRequested = true;
    }
    return PREVENT_DEFAULT.has(code);
  }

  keyUp(code: string): void {
    this.down.delete(code);
  }

  clear(): void {
    this.down.clear();
    this.toggleRequested = false;
    this.interactRequested = false;
    this.pauseRequested = false;
    this.muteRequested = false;
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** The on-screen buttons ask for the same actions as the keys. */
  requestToggle(): void {
    this.toggleRequested = true;
  }

  requestInteract(): void {
    this.interactRequested = true;
  }

  requestPause(): void {
    this.pauseRequested = true;
  }

  /** Returns true once per flashlight key press. */
  consumeToggle(): boolean {
    const requested = this.toggleRequested;
    this.toggleRequested = false;
    return requested;
  }

  /** Returns true once per interact key press. */
  consumeInteract(): boolean {
    const requested = this.interactRequested;
    this.interactRequested = false;
    return requested;
  }

  /** Returns true once per pause key press. */
  consumePause(): boolean {
    const requested = this.pauseRequested;
    this.pauseRequested = false;
    return requested;
  }

  /** Returns true once per mute key press. */
  consumeMute(): boolean {
    const requested = this.muteRequested;
    this.muteRequested = false;
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
