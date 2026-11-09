/** Frame gaps above this are not used to measure the monitor (tab switch, a long stall). */
const MAX_SAMPLE_MS = 250;
/**
 * The measured gap is taken from this low point of the sorted samples: slow frames only
 * ever make gaps longer, so the short ones are the closest to the real refresh rate.
 */
const REFRESH_PERCENTILE = 0.2;
/** Tolerance so that a monitor slightly under a multiple (119.9 Hz) still counts as it. */
const DIVISOR_TOLERANCE = 0.05;

/**
 * How many monitor refreshes to wait between drawn frames: the largest whole number that
 * keeps at least `targetFps`. A whole number gives every frame the same time on screen.
 */
export function drawDivisor(refreshHz: number, targetFps: number): number {
  if (!Number.isFinite(refreshHz) || refreshHz <= 0 || targetFps <= 0) return 1;
  return Math.max(1, Math.floor(refreshHz / targetFps + DIVISOR_TOLERANCE));
}

/**
 * Decides which animation frames are drawn, so a fast monitor does not make the game
 * draw more than it needs. It keeps measuring the refresh rate, because the window can
 * move to another monitor. Allocates once.
 */
export class FramePacer {
  /** Monitor refreshes per drawn frame. */
  divisor = 1;
  private readonly samples: Float64Array;
  private sampleCount = 0;
  private lastTime = -1;
  private waited = 0;

  constructor(
    private readonly targetFps: number,
    sampleSize = 60,
  ) {
    this.samples = new Float64Array(sampleSize);
  }

  /** Call once per animation frame with its time in milliseconds. True means draw this one. */
  shouldDraw(time: number): boolean {
    this.measure(time);
    this.waited++;
    if (this.waited < this.divisor) return false;
    this.waited = 0;
    return true;
  }

  private measure(time: number): void {
    const gap = this.lastTime < 0 ? 0 : time - this.lastTime;
    this.lastTime = time;
    if (gap <= 0 || gap > MAX_SAMPLE_MS) return;

    this.samples[this.sampleCount++] = gap;
    if (this.sampleCount < this.samples.length) return;
    this.sampleCount = 0;
    this.samples.sort();
    const refreshGap = this.samples[Math.floor(this.samples.length * REFRESH_PERCENTILE)] ?? 0;
    if (refreshGap > 0) this.divisor = drawDivisor(1000 / refreshGap, this.targetFps);
  }
}
