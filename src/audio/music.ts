import { createRng, nextFloat, nextInt, type Rng } from '../core/rng';

/**
 * Original generative music: written by this code while the game runs.
 * Dark and slow, in D with a flat second (Phrygian colour). Pure logic only:
 * it decides what to play and when; `sfx.ts` turns it into sound.
 */

/** MIDI number of D3, the root of the music. */
export const ROOT = 50;
/** Scale steps in semitones from the root: D Eb F G A Bb C. */
export const SCALE: readonly number[] = [0, 1, 3, 5, 7, 8, 10];
/** Chord progression (semitones from the root): Dm · Eb · Gm · Dm · Bb · A dim. */
export const CHORDS: readonly (readonly number[])[] = [
  [0, 7, 15],
  [1, 5, 8],
  [5, 8, 12],
  [0, 3, 7],
  [-2, 5, 8],
  [7, 10, 13],
];

export interface MusicConfig {
  /** Seconds each pad chord lasts. */
  readonly chordSeconds: number;
  /** Gap between music-box notes when calm and when the enemy is close. */
  readonly noteGapCalm: readonly [number, number];
  readonly noteGapTense: readonly [number, number];
  /** "Enemy near" level from which the low pulse starts. */
  readonly pulseThreshold: number;
  /** Seconds between pulses at the threshold and when touching. */
  readonly pulseSlow: number;
  readonly pulseFast: number;
}

export interface MusicState {
  rng: Rng;
  time: number;
  chordIndex: number;
  nextChordAt: number;
  nextNoteAt: number;
  nextPulseAt: number;
}

/** What to start in this step; -1 / false means nothing. Reused, never reallocated. */
export interface MusicOutput {
  /** Index into CHORDS of a chord to start. */
  chord: number;
  /** MIDI note for the music box. */
  note: number;
  pulse: boolean;
  /** 0..1: how tense the music is (enemy near). */
  tension: number;
}

export function createMusicState(seed: number): MusicState {
  return {
    rng: createRng(seed),
    time: 0,
    chordIndex: -1,
    nextChordAt: 0,
    nextNoteAt: 0,
    nextPulseAt: 0,
  };
}

export function createMusicOutput(): MusicOutput {
  return { chord: -1, note: -1, pulse: false, tension: 0 };
}

/** Restarts the piece; the random choices continue from the same generator. */
export function resetMusic(state: MusicState, config: MusicConfig): void {
  state.time = 0;
  state.chordIndex = -1;
  state.nextChordAt = 0;
  // Let the first chord breathe before the first note.
  state.nextNoteAt = config.chordSeconds / 2;
  state.nextPulseAt = 0;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** A music-box note from the scale, two octaves above the root (or three, sometimes). */
export function pickNote(rng: Rng, tension: number): number {
  const step = SCALE[nextInt(rng, SCALE.length)] ?? 0;
  // When tense, sometimes the tritone (G#), the most unsettling interval.
  if (tension > 0.5 && nextFloat(rng) < 0.25) return ROOT + 24 + 6;
  const octave = nextFloat(rng) < 0.25 ? 36 : 24;
  return ROOT + octave + step;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Advances the music one logic step. `near` is the "enemy near" level (0..1).
 * Chords change on a fixed clock; notes come at random gaps that shrink with
 * tension; a low pulse starts when the enemy is close and speeds up.
 */
export function updateMusic(
  state: MusicState,
  config: MusicConfig,
  stepSeconds: number,
  near: number,
  out: MusicOutput,
): void {
  state.time += stepSeconds;
  out.chord = -1;
  out.note = -1;
  out.pulse = false;
  out.tension = Math.min(1, Math.max(0, near));

  if (state.time >= state.nextChordAt) {
    state.chordIndex = (state.chordIndex + 1) % CHORDS.length;
    state.nextChordAt = state.time + config.chordSeconds;
    out.chord = state.chordIndex;
  }

  if (state.time >= state.nextNoteAt) {
    out.note = pickNote(state.rng, out.tension);
    const min = lerp(config.noteGapCalm[0], config.noteGapTense[0], out.tension);
    const max = lerp(config.noteGapCalm[1], config.noteGapTense[1], out.tension);
    state.nextNoteAt = state.time + min + (max - min) * nextFloat(state.rng);
  }

  if (out.tension >= config.pulseThreshold) {
    if (state.time >= state.nextPulseAt) {
      out.pulse = true;
      const level = (out.tension - config.pulseThreshold) / (1 - config.pulseThreshold);
      state.nextPulseAt = state.time + lerp(config.pulseSlow, config.pulseFast, level);
    }
  } else {
    state.nextPulseAt = state.time;
  }
}
