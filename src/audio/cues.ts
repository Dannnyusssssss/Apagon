/** Tuning values the cues need (see BALANCE.audio). */
export interface CueConfig {
  readonly stepInterval: number;
  readonly heartbeatThreshold: number;
  readonly heartbeatMinBpm: number;
  readonly heartbeatMaxBpm: number;
  readonly heartbeatMinVolume: number;
  readonly heartbeatMaxVolume: number;
  readonly flickerMinGap: number;
  readonly crackleSlow: number;
  readonly crackleFast: number;
}

export interface CueState {
  /** Seconds of play seen by the cues. */
  time: number;
  stepTimer: number;
  heartbeatTimer: number;
  lastFlickerAt: number;
  crackleTimer: number;
}

/** Sounds to play after one logic step. Reused, never reallocated. */
export interface CueOutput {
  step: boolean;
  heartbeat: boolean;
  heartbeatVolume: number;
  flicker: boolean;
  crackle: boolean;
}

export function createCueState(): CueState {
  return { time: 0, stepTimer: 0, heartbeatTimer: 0, lastFlickerAt: -Infinity, crackleTimer: 0 };
}

export function createCueOutput(): CueOutput {
  return { step: false, heartbeat: false, heartbeatVolume: 0, flicker: false, crackle: false };
}

export function resetCues(state: CueState): void {
  state.time = 0;
  state.stepTimer = 0;
  state.heartbeatTimer = 0;
  state.lastFlickerAt = -Infinity;
  state.crackleTimer = 0;
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
 * at most one flicker sound per `flickerMinGap` seconds, and bulb crackles
 * that come faster as the battery runs out (`batteryLevel` from `lowBatteryLevel`).
 */
export function updateCues(
  state: CueState,
  config: CueConfig,
  stepSeconds: number,
  moving: boolean,
  near: number,
  enemyLit: boolean,
  batteryLevel: number,
  out: CueOutput,
): void {
  state.time += stepSeconds;
  out.step = false;
  out.heartbeat = false;
  out.heartbeatVolume = 0;
  out.flicker = false;
  out.crackle = false;

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

  const crackle = crackleInterval(batteryLevel, config.crackleSlow, config.crackleFast);
  if (Number.isFinite(crackle)) {
    state.crackleTimer -= stepSeconds;
    if (state.crackleTimer <= 0) {
      out.crackle = true;
      state.crackleTimer = crackle;
    }
  } else {
    state.crackleTimer = 0;
  }
}

/**
 * Low-battery level: 0 above `threshold`, then growing smoothly to 1 when empty.
 * Drives the "dying bulb" sound and darkens the music.
 */
export function lowBatteryLevel(battery: number, threshold: number): number {
  if (threshold <= 0 || battery > threshold) return 0;
  return Math.min(1, 1 - Math.max(0, battery) / threshold);
}

/** Seconds between bulb crackles for a low-battery level (0 = none). */
export function crackleInterval(level: number, slow: number, fast: number): number {
  if (level <= 0) return Infinity;
  return slow + (fast - slow) * Math.min(1, level);
}
