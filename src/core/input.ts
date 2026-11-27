import { FIXED_KEYS, PREVENT_DEFAULT_KEYS, type Action } from '../data/controls';
import { codesFor, defaultBindings, type Bindings } from './bindings';
import type { Vec2 } from './math';

const PREVENT_DEFAULT: ReadonlySet<string> = new Set(PREVENT_DEFAULT_KEYS);

/** Keyboard state without DOM access, so it can be tested. */
export class InputState {
  private readonly down = new Set<string>();
  /** Every code that triggers each action, both Shift keys included. */
  private readonly codes = new Map<Action, ReadonlySet<string>>();
  private toggleRequested = false;
  private interactRequested = false;
  private pauseRequested = false;
  private muteRequested = false;
  private statsRequested = false;

  constructor(bindings: Bindings = defaultBindings()) {
    this.setBindings(bindings);
  }

  /** Uses new keys from now on. Keys held down are forgotten, so nothing sticks. */
  setBindings(bindings: Bindings): void {
    for (const [action, keys] of Object.entries(bindings) as [Action, string[]][]) {
      this.codes.set(action, new Set(keys.flatMap(codesFor)));
    }
    this.clear();
  }

  /** Returns true when the browser default action must be prevented. */
  keyDown(code: string, repeat: boolean): boolean {
    this.down.add(code);
    if (!repeat) {
      if (this.has('toggleFlashlight', code)) this.toggleRequested = true;
      if (this.has('interact', code)) this.interactRequested = true;
      if (this.has('pause', code) || code === FIXED_KEYS.pause) this.pauseRequested = true;
      if (this.has('mute', code)) this.muteRequested = true;
      if (code === FIXED_KEYS.stats) this.statsRequested = true;
    }
    return PREVENT_DEFAULT.has(code) || code === FIXED_KEYS.stats;
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
    this.statsRequested = false;
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

  /** Returns true once per F3 press. */
  consumeStats(): boolean {
    const requested = this.statsRequested;
    this.statsRequested = false;
    return requested;
  }

  /** Writes the raw movement axis (-1, 0 or 1 per component) into `out`. */
  readAxis(out: Vec2): Vec2 {
    out.x = this.anyDown('right') - this.anyDown('left');
    out.y = this.anyDown('down') - this.anyDown('up');
    return out;
  }

  private has(action: Action, code: string): boolean {
    return this.codes.get(action)?.has(code) ?? false;
  }

  private anyDown(action: Action): number {
    const codes = this.codes.get(action);
    if (!codes) return 0;
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
