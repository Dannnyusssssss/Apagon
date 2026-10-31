import { describe, expect, it } from 'vitest';
import {
  CHORDS,
  createMusicOutput,
  createMusicState,
  midiToFrequency,
  resetMusic,
  ROOT,
  SCALE,
  updateMusic,
} from '../src/audio/music';
import { BALANCE } from '../src/data/balance';

const STEP = BALANCE.simulation.stepSeconds;
const CFG = BALANCE.music;

interface Played {
  chords: number[];
  notes: number[];
  noteTimes: number[];
  pulses: number;
}

function play(seconds: number, near: number, seed = 1): Played {
  const state = createMusicState(seed);
  resetMusic(state, CFG);
  const out = createMusicOutput();
  const played: Played = { chords: [], notes: [], noteTimes: [], pulses: 0 };
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    updateMusic(state, CFG, STEP, near, out);
    if (out.chord >= 0) played.chords.push(out.chord);
    if (out.note >= 0) {
      played.notes.push(out.note);
      played.noteTimes.push(state.time);
    }
    if (out.pulse) played.pulses++;
  }
  return played;
}

const TRITONE = ROOT + 24 + 6;

describe('generative music', () => {
  it('converts MIDI to frequency', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 9);
    expect(midiToFrequency(ROOT)).toBeCloseTo(146.83, 1);
  });

  it('plays the chord progression in order, one chord per period', () => {
    const { chords } = play(CFG.chordSeconds * CHORDS.length * 2, 0);
    expect(chords.length).toBe(CHORDS.length * 2);
    chords.forEach((chord, i) => expect(chord).toBe(i % CHORDS.length));
  });

  it('keeps notes in the scale (the tritone only when tense) and in a playable range', () => {
    const calm = play(120, 0).notes;
    expect(calm.length).toBeGreaterThan(10);
    for (const note of calm) {
      const step = (((note - ROOT) % 12) + 12) % 12;
      expect(SCALE).toContain(step);
      // Above ~440 Hz and below ~2.4 kHz: clear on any speaker.
      expect(midiToFrequency(note)).toBeGreaterThan(440);
      expect(midiToFrequency(note)).toBeLessThan(2400);
    }
    expect(play(120, 1).notes).toContain(TRITONE);
  });

  it('plays more notes when the enemy is near, with a cap on density', () => {
    const calm = play(60, 0).notes.length;
    const tense = play(60, 1).notes.length;
    expect(tense).toBeGreaterThan(calm);
    const times = play(60, 1).noteTimes;
    for (let i = 1; i < times.length; i++) {
      expect((times[i] ?? 0) - (times[i - 1] ?? 0)).toBeGreaterThanOrEqual(
        CFG.noteGapTense[0] - STEP,
      );
    }
  });

  it('adds a pulse only when the enemy is close, never above 2 per second', () => {
    expect(play(20, 0).pulses).toBe(0);
    expect(play(20, CFG.pulseThreshold / 2).pulses).toBe(0);
    const near = play(20, 1).pulses;
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThanOrEqual(20 * 2 + 1);
    expect(play(20, 0.5).pulses).toBeLessThan(near);
  });

  it('repeats exactly with the same seed and changes with another', () => {
    expect(play(60, 0.3, 7).notes).toEqual(play(60, 0.3, 7).notes);
    expect(play(60, 0.3, 7).notes).not.toEqual(play(60, 0.3, 8).notes);
  });
});
