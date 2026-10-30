/** Tolerance so that a delta of exactly one step is not lost to rounding. */
const EPSILON = 1e-9;

/**
 * Fixed-timestep accumulator (pure, no timers).
 * After `advance`, `steps` is how many logic updates to run and `alpha`
 * is the interpolation factor (0..1) for rendering between states.
 */
export class FixedStepClock {
  accumulator = 0;
  steps = 0;
  alpha = 0;

  constructor(
    readonly stepSeconds: number,
    readonly maxSteps: number,
    readonly maxFrameSeconds: number,
  ) {}

  advance(deltaSeconds: number): void {
    const delta =
      Number.isFinite(deltaSeconds) && deltaSeconds > 0
        ? Math.min(deltaSeconds, this.maxFrameSeconds)
        : 0;
    this.accumulator += delta;

    let steps = Math.floor((this.accumulator + EPSILON) / this.stepSeconds);
    if (steps > this.maxSteps) {
      steps = this.maxSteps;
      this.accumulator = 0;
    } else {
      this.accumulator = Math.max(0, this.accumulator - steps * this.stepSeconds);
    }

    this.steps = steps;
    this.alpha = Math.min(1, this.accumulator / this.stepSeconds);
  }

  reset(): void {
    this.accumulator = 0;
    this.steps = 0;
    this.alpha = 0;
  }
}

export interface LoopCallbacks {
  update(stepSeconds: number): void;
  render(alpha: number): void;
  /** When false, logic is frozen but rendering continues. */
  isRunning(): boolean;
}

/** Drives a FixedStepClock with requestAnimationFrame. */
export class GameLoop {
  private lastTime = -1;
  private frameId = 0;

  constructor(
    private readonly clock: FixedStepClock,
    private readonly callbacks: LoopCallbacks,
  ) {}

  start(): void {
    this.frameId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
  }

  private readonly frame = (time: number): void => {
    const delta = this.lastTime < 0 ? 0 : (time - this.lastTime) / 1000;
    this.lastTime = time;

    if (this.callbacks.isRunning()) {
      this.clock.advance(delta);
      for (let i = 0; i < this.clock.steps; i++) {
        this.callbacks.update(this.clock.stepSeconds);
      }
    } else {
      this.clock.reset();
    }

    this.callbacks.render(this.clock.alpha);
    this.frameId = requestAnimationFrame(this.frame);
  };
}
