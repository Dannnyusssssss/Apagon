import { touchControlsVisible } from '../core/touch';
import type { TouchMode } from '../data/controls';

/** Matches a media query without failing where it is not available. */
export function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/**
 * What the page knows about the device: whether a finger was seen, whether the touch
 * settings mean something, and whether the on-screen controls show. It keeps the page
 * classes that pick the texts and settings for each kind of device.
 */
export class TouchUi {
  /** Set by a real touch too: on a laptop with a touch screen the main pointer is the mouse. */
  private touchDetected: boolean;
  /** The touch settings show once they mean something, so a mouse-only menu stays as it was. */
  private touchCapable: boolean;

  /** `forced` is the `?touch` debug option. */
  constructor(
    private touchMode: TouchMode,
    private readonly forced: boolean,
  ) {
    const coarse = mediaMatches('(pointer: coarse)');
    this.touchDetected = coarse;
    this.touchCapable = coarse || forced || touchMode !== 'auto';
  }

  get mode(): TouchMode {
    return this.touchMode;
  }

  setMode(mode: TouchMode): void {
    this.touchMode = mode;
  }

  /** Call on every touch. Returns true only the first time, when the layout must change. */
  noteTouch(): boolean {
    if (this.touchDetected) return false;
    this.touchDetected = true;
    this.touchCapable = true;
    return true;
  }

  showsControls(): boolean {
    return this.forced || touchControlsVisible(this.touchMode, this.touchDetected);
  }

  /** Updates the page classes and returns whether the on-screen controls show. */
  applyClasses(): boolean {
    const showing = this.showsControls();
    const root = document.documentElement.classList;
    root.toggle('touch-ui', showing);
    root.toggle('touch-capable', this.touchCapable);
    root.toggle('has-mouse', this.forced || mediaMatches('(any-pointer: fine)'));
    return showing;
  }
}
