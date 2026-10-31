/** Tuning values the cues need (see BALANCE.audio). */
export interface CueConfig {
  readonly stepInterval: number;
  readonly heartbeatThreshold: number;
  readonly heartbeatMinBpm: number;
  readonly heartbeatMaxBpm: number;
  readonly heartbeatMinVolume: number;
  readonly heartbeatMaxVolume: number;
  readonly flickerMinGap: number;
}

export interface CueState {
  /** Seconds of play seen by the cues. */
  time: number;
  stepTimer: number;
  heartbeatTimer: number;
  lastFlickerAt: number;
}

/** Sounds to play after one logic step. Reused, never reallocated. */
export interface CueOutput {
  step: boolean;
  heartbeat: boolean;
  heartbeatVolume: number;
  flicker: boolean;
}

export function createCueState(): CueState {
  return { time: 0, stepTimer: 0, heartbeatTimer: 0, lastFlickerAt: -Infinity };
}

export function createCueOutput(): CueOutput {
  return { step: false, heartbeat: false, heartbeatVolume: 0, flicker: false };
}

export function resetCues(state: CueState): void {
  state.time = 0;
  state.stepTimer = 0;
  state.heartbeatTimer = 0;
  state.lastFlickerAt = -Infinity;
}

/** How far past the heartbeat threshold the enemy is: 0 at the threshold, 1 touching. */
function heartbeatLevel(near: number, config: CueConfig): number {
  if (near < config.heartbeatThreshold) return -1;
  const span = 1 - config.heartbeatThreshold;
  return span <= 0 ? 1 : Math.min(1, (near - config.heartbeatThreshold) / span);
}

/** Seconds between heartbeats, or Infinity when the enemy is not near enough. */
export function heartbeatInterval(near: number, config: CueConfig): number {
  const level = heartbeatLevel(near, config);
  if (level < 0) return Infinity;
  const bpm = config.heartbeatMinBpm + (config.heartbeatMaxBpm - config.heartbeatMinBpm) * level;
  return 60 / bpm;
}

export function heartbeatVolume(near: number, config: CueConfig): number {
  const level = heartbeatLevel(near, config);
  if (level < 0) return 0;
  return (
    config.heartbeatMinVolume + (config.heartbeatMaxVolume - config.heartbeatMinVolume) * level
  );
}

/**
 * Decides the rhythmic and rate-limited sounds for one logic step:
 * footsteps while moving, a heartbeat that speeds up as the enemy gets closer,
 * and at most one flicker sound per `flickerMinGap` seconds.
 */
export function updateCues(
  state: CueState,
  config: CueConfig,
  stepSeconds: number,
  moving: boolean,
  near: number,
  enemyLit: boolean,
  out: CueOutput,
): void {
  state.time += stepSeconds;
  out.step = false;
  out.heartbeat = false;
  out.heartbeatVolume = 0;
  out.flicker = false;

  if (moving) {
    state.stepTimer -= stepSeconds;
    if (state.stepTimer <= 0) {
      out.step = true;
      state.stepTimer = config.stepInterval;
    }
  } else {
    state.stepTimer = 0;
  }

  const interval = heartbeatInterval(near, config);
  if (Number.isFinite(interval)) {
    state.heartbeatTimer -= stepSeconds;
    if (state.heartbeatTimer <= 0) {
      out.heartbeat = true;
      out.heartbeatVolume = heartbeatVolume(near, config);
      state.heartbeatTimer = interval;
    }
  } else {
    state.heartbeatTimer = 0;
  }

  if (enemyLit && state.time - state.lastFlickerAt >= config.flickerMinGap) {
    out.flicker = true;
    state.lastFlickerAt = state.time;
  }
}

/**
 * Volume of the low-battery drone: silent above `lowThreshold`, then growing
 * smoothly as the charge runs out, up to `maxVolume` when empty.
 */
export function lowBatteryVolume(battery: number, lowThreshold: number, maxVolume: number): number {
  if (lowThreshold <= 0 || battery > lowThreshold) return 0;
  const level = 1 - Math.max(0, battery) / lowThreshold;
  return maxVolume * level;
}
