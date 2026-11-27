import { FrameStats } from '../core/frameStats';
import { BALANCE } from '../data/balance';
import { TEXTS } from '../data/texts';

/** How often the text is refreshed, so the panel itself costs almost nothing. */
const REFRESH_MS = 500;

/** One decimal with a comma, as written in Spanish. */
function decimal(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/**
 * Performance panel for players (F3 or the option): frames per second, time per frame,
 * the worst recent frame, stalls and canvas size. It shows nothing about the enemies or
 * the map, so it gives no advantage and the run still counts for records. Created only
 * the first time it is shown; while hidden it does no work.
 */
export class StatsOverlay {
  private readonly root: HTMLDivElement;
  private readonly stats = new FrameStats(
    BALANCE.debug.longFrameMs,
    BALANCE.debug.worstFrameWindowMs,
  );
  private frames = 0;
  private lastRefresh = 0;
  private visible = false;

  constructor(
    container: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'stats-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;
    container.append(this.root);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.hidden = !visible;
    this.frames = 0;
    this.lastRefresh = 0;
  }

  /** Call once per drawn frame. `divisor` is how many monitor refreshes each frame takes. */
  frame(now: number, playing: boolean, divisor: number): void {
    if (!this.visible) return;
    this.stats.frame(now, playing);
    this.frames++;
    if (this.lastRefresh === 0) {
      this.lastRefresh = now;
      return;
    }
    const elapsed = now - this.lastRefresh;
    if (elapsed < REFRESH_MS) return;
    const t = TEXTS.stats;
    const fps = (this.frames * 1000) / elapsed;
    this.root.textContent = [
      `${t.fps} ${fps.toFixed(0)} · ${t.frame} ${decimal(elapsed / this.frames)} ms`,
      `${t.worst} ${this.stats.worstMs.toFixed(0)} ms · ${t.long} ${String(this.stats.longFrames)}`,
      `${t.canvas} ${String(this.canvas.width)}×${String(this.canvas.height)}`,
      t.every(divisor),
    ].join('\n');
    this.frames = 0;
    this.lastRefresh = now;
  }
}
