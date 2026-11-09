/** Tracks long frames while playing, to tell a real stall from a slow but steady game. */
export class FrameStats {
  /** Longest gap of the last full window, or of the current one if already longer. */
  worstMs = 0;
  /** Frames over the limit since the page loaded. */
  longFrames = 0;
  private lastTime = -1;
  private windowElapsed = 0;
  private windowWorst = 0;

  constructor(
    private readonly longFrameMs: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Call once per drawn frame. `active` is false while nothing is moving (menus, pause):
   * the wait on those screens is not a stall, so it does not count.
   */
  frame(time: number, active: boolean): void {
    if (!active) {
      this.lastTime = -1;
      return;
    }
    if (this.lastTime >= 0) {
      const gap = time - this.lastTime;
      if (gap > this.longFrameMs) this.longFrames++;
      this.windowWorst = Math.max(this.windowWorst, gap);
      this.worstMs = Math.max(this.worstMs, gap);
      this.windowElapsed += gap;
      if (this.windowElapsed >= this.windowMs) {
        this.worstMs = this.windowWorst;
        this.windowWorst = 0;
        this.windowElapsed = 0;
      }
    }
    this.lastTime = time;
  }
}
