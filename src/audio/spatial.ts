import { clamp, lerp } from '../core/math';
import type { Enemy } from '../game/enemy';
import type { Player } from '../game/player';
import type { RoomGrid } from '../game/rooms';
import { hasLineOfSight } from '../game/visibility';

/** Tuning values for the enemy sounds (see BALANCE.enemyAudio). */
export interface EnemyAudioConfig {
  readonly hearingDistance: number;
  readonly distanceCurve: number;
  readonly maxPan: number;
  readonly panMinDistance: number;
  readonly openCutoff: number;
  readonly occludedCutoff: number;
  readonly occludedGain: number;
  readonly occlusionRate: number;
  readonly stepInterval: number;
  readonly stepMaxInterval: number;
  readonly stepVolumeSlow: number;
  readonly stepVolumeFast: number;
  readonly breathIntervalMoving: number;
  readonly breathIntervalStill: number;
  readonly breathVolume: number;
  readonly stillBreathFraction: number;
  readonly movingThreshold: number;
  /** Speed fraction of the fastest footsteps (running in the dark). */
  readonly fastRatio: number;
}

export interface EnemyAudioState {
  /** 0 (clear line to the player) to 1 (fully muffled by a wall); moves gradually. */
  occlusion: number;
  stepTimer: number;
  breathTimer: number;
}

/** Mix and sounds of the enemy after one logic step. Reused, never reallocated. */
export interface EnemyAudioOutput {
  /** -1 (left) to 1 (right). */
  pan: number;
  /** 0..1: distance fade times wall muffling. */
  gain: number;
  /** Low-pass cutoff in Hz: lower behind walls. */
  cutoff: number;
  step: boolean;
  stepVolume: number;
  breath: boolean;
  breathVolume: number;
}

export function createEnemyAudioState(): EnemyAudioState {
  return { occlusion: 0, stepTimer: 0, breathTimer: 0 };
}

export function createEnemyAudioOutput(): EnemyAudioOutput {
  return {
    pan: 0,
    gain: 0,
    cutoff: 0,
    step: false,
    stepVolume: 0,
    breath: false,
    breathVolume: 0,
  };
}

export function resetEnemyAudio(state: EnemyAudioState): void {
  state.occlusion = 0;
  state.stepTimer = 0;
  state.breathTimer = 0;
}

/**
 * Left/right position of a sound `dx` units to the side at `distance`.
 * Under `minDistance` the pan shrinks, so a sound on top of the listener does not swap ears.
 */
export function stereoPan(
  dx: number,
  distance: number,
  maxPan: number,
  minDistance: number,
): number {
  if (distance <= 0) return 0;
  return clamp(dx / Math.max(distance, minDistance), -1, 1) * maxPan;
}

/** 1 touching, fading to 0 at `hearingDistance` and beyond. */
export function distanceGain(distance: number, hearingDistance: number, curve: number): number {
  if (distance >= hearingDistance) return 0;
  return Math.pow(1 - Math.max(0, distance) / hearingDistance, curve);
}

/** Moves the wall muffling toward 1 (wall in between) or 0 (clear line), at `rate` per second. */
export function stepOcclusion(
  current: number,
  blocked: boolean,
  rate: number,
  stepSeconds: number,
): number {
  const target = blocked ? 1 : 0;
  const change = rate * stepSeconds;
  if (current < target) return Math.min(target, current + change);
  return Math.max(target, current - change);
}

/** Low-pass cutoff for a muffling amount, on a log scale so the change sounds even. */
export function occlusionCutoff(occlusion: number, open: number, occluded: number): number {
  return open * Math.pow(occluded / open, clamp(occlusion, 0, 1));
}

/** Fraction of its base speed the enemy moved in the last step (0 still, 1.2 in the dark). */
export function enemySpeedRatio(enemy: Enemy, stepSeconds: number): number {
  const dx = enemy.x - enemy.prevX;
  const dy = enemy.y - enemy.prevY;
  const perStep = enemy.speed * stepSeconds;
  return perStep > 0 ? Math.sqrt(dx * dx + dy * dy) / perStep : 0;
}

/** Seconds between enemy footsteps at a speed ratio, or Infinity when it stands still. */
export function enemyStepInterval(ratio: number, config: EnemyAudioConfig): number {
  if (ratio < config.movingThreshold) return Infinity;
  return Math.min(config.stepMaxInterval, config.stepInterval / ratio);
}

/** Footsteps get louder with speed: soft when creeping, loudest running in the dark. */
export function enemyStepVolume(ratio: number, config: EnemyAudioConfig): number {
  const t = config.fastRatio > 0 ? clamp(ratio / config.fastRatio, 0, 1) : 1;
  return lerp(config.stepVolumeSlow, config.stepVolumeFast, t);
}

/** Breath volume before the distance fade: very low while standing still. */
export function enemyBreathVolume(moving: boolean, config: EnemyAudioConfig): number {
  return config.breathVolume * (moving ? 1 : config.stillBreathFraction);
}

/**
 * Positions the enemy sounds for one logic step: pan by side, volume by distance,
 * muffled behind walls (line of sight from the player), footsteps only while it
 * moves (rhythm and volume by speed) and a breath that never stops.
 * Out of hearing range nothing is triggered.
 */
export function updateEnemyAudio(
  state: EnemyAudioState,
  config: EnemyAudioConfig,
  room: RoomGrid,
  player: Player,
  enemy: Enemy,
  stepSeconds: number,
  out: EnemyAudioOutput,
): void {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const blocked = !hasLineOfSight(room, player.x, player.y, enemy.x, enemy.y);
  state.occlusion = stepOcclusion(state.occlusion, blocked, config.occlusionRate, stepSeconds);

  out.pan = stereoPan(dx, distance, config.maxPan, config.panMinDistance);
  out.gain =
    distanceGain(distance, config.hearingDistance, config.distanceCurve) *
    lerp(1, config.occludedGain, state.occlusion);
  out.cutoff = occlusionCutoff(state.occlusion, config.openCutoff, config.occludedCutoff);
  out.step = false;
  out.stepVolume = 0;
  out.breath = false;
  out.breathVolume = 0;

  if (out.gain <= 0) {
    state.stepTimer = 0;
    state.breathTimer = 0;
    return;
  }

  const ratio = enemySpeedRatio(enemy, stepSeconds);
  const moving = ratio >= config.movingThreshold;
  const interval = enemyStepInterval(ratio, config);
  if (Number.isFinite(interval)) {
    state.stepTimer -= stepSeconds;
    if (state.stepTimer <= 0) {
      out.step = true;
      out.stepVolume = enemyStepVolume(ratio, config);
      state.stepTimer = interval;
    }
  } else {
    state.stepTimer = 0;
  }

  state.breathTimer -= stepSeconds;
  if (state.breathTimer <= 0) {
    out.breath = true;
    out.breathVolume = enemyBreathVolume(moving, config);
    state.breathTimer = moving ? config.breathIntervalMoving : config.breathIntervalStill;
  }
}
