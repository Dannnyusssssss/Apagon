/** Space taken by notches and rounded corners, in CSS pixels. */
export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Measures the safe area for what is drawn on the canvas. Only CSS can read these values,
 * so a hidden element takes them as padding.
 */
export class SafeAreaProbe {
  private readonly probe: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.probe = document.createElement('div');
    this.probe.className = 'safe-area-probe';
    this.probe.setAttribute('aria-hidden', 'true');
    container.append(this.probe);
  }

  read(out: SafeInsets): SafeInsets {
    const style = window.getComputedStyle(this.probe);
    out.top = pixels(style.paddingTop);
    out.right = pixels(style.paddingRight);
    out.bottom = pixels(style.paddingBottom);
    out.left = pixels(style.paddingLeft);
    return out;
  }
}

function pixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
