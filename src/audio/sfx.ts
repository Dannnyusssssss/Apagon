import { createRng, nextFloat } from '../core/rng';
import { BALANCE } from '../data/balance';
import { CHORDS, midiToFrequency, ROOT } from './music';

const CFG = BALANCE.audio;
const MUSIC = BALANCE.music;
const CFG_ENEMY = BALANCE.enemyAudio;
/** Seed for the noise buffer; the noise only has to sound like noise. */
const NOISE_SEED = 0x5eed;
const NOISE_SECONDS = 1;
/** Time constant for muting and unmuting, so the change is not a click. */
const MUTE_FADE = 0.05;
/** Time constant for the low-battery hum and the music darkening: slow swells. */
const SLOW_FADE = 0.4;
/** Smallest level change worth sending to the audio thread. */
const LEVEL_EPSILON = 0.002;
/** Base pitch of the "dying bulb" hum: a low mains-like buzz laptops can play. */
const BULB_HZ = 110;
/** Seconds to fade the enemy sounds in at the start and out at the end of a run. */
const ENEMY_FADE = 0.6;
/** Smallest pan or volume change worth sending, and the cutoff change in Hz. */
const MIX_EPSILON = 0.005;
const CUTOFF_EPSILON = 20;

type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';

/**
 * Every sound is synthesized with WebAudio: no audio files, no third-party music.
 * The context is created on the first player gesture (`unlock`).
 * A limiter after the master volume keeps any sum of sounds from peaking.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;

  private bulb: GainNode | null = null;
  private bulbOscillators: OscillatorNode[] = [];
  private batteryLevel = 0;

  private music: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicInput: GainNode | null = null;
  private musicOn = false;

  /** Enemy sounds: input -> low-pass (walls) -> stereo pan -> distance volume -> on/off. */
  private enemyInput: GainNode | null = null;
  private enemyFilter: BiquadFilterNode | null = null;
  private enemyPanner: StereoPannerNode | null = null;
  private enemyGain: GainNode | null = null;
  private enemyOutput: GainNode | null = null;
  private enemyOn = false;
  private enemyPan = 0;
  private enemyLevel = 0;
  private enemyCutoff = 0;

  /** Call from a click or key handler. Safe to call many times. */
  unlock(): void {
    if (!this.ctx) this.create();
    void this.ctx?.resume().catch(() => undefined);
  }

  /** Stops all sound while paused (the context keeps its state). */
  suspend(): void {
    void this.ctx?.suspend().catch(() => undefined);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.volume(), this.ctx.currentTime, MUTE_FADE);
    }
  }

  /**
   * Low-battery level (0..1, see `lowBatteryLevel`): raises the dying-bulb hum,
   * makes it sag in pitch, and darkens and detunes the music. Cheap to call every step.
   */
  setBatteryLevel(level: number): void {
    if (Math.abs(level - this.batteryLevel) < LEVEL_EPSILON) return;
    this.batteryLevel = level;
    const { ctx } = this;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.bulb?.gain.setTargetAtTime(level * CFG.lowBatteryMaxVolume, now, SLOW_FADE);
    for (const osc of this.bulbOscillators) {
      osc.detune.setTargetAtTime(-level * CFG.lowBatterySagCents, now, SLOW_FADE);
    }
    const cutoff = MUSIC.brightCutoff + (MUSIC.darkCutoff - MUSIC.brightCutoff) * level;
    this.musicFilter?.frequency.setTargetAtTime(cutoff, now, SLOW_FADE);
  }

  /** Fades the music in (start of a run) or out (end of a run). */
  setMusicOn(on: boolean): void {
    this.musicOn = on;
    if (this.ctx && this.music) {
      this.music.gain.setTargetAtTime(
        on ? MUSIC.volume : 0,
        this.ctx.currentTime,
        MUSIC.fadeSeconds / 3,
      );
    }
  }

  /** Fades the enemy sounds in (start of a run) or out (end of a run). */
  setEnemyAudible(on: boolean): void {
    this.enemyOn = on;
    if (this.ctx && this.enemyOutput) {
      this.enemyOutput.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, ENEMY_FADE / 3);
    }
  }

  /**
   * Where the enemy sounds come from: `pan` -1..1, `level` 0..1 (distance and walls),
   * `cutoff` in Hz (muffled behind walls). Changes glide, so nothing jumps.
   */
  setEnemyMix(pan: number, level: number, cutoff: number): void {
    const { ctx } = this;
    if (!ctx) return;
    const now = ctx.currentTime;
    const smoothing = CFG_ENEMY.mixSmoothing;
    if (Math.abs(pan - this.enemyPan) >= MIX_EPSILON) {
      this.enemyPan = pan;
      this.enemyPanner?.pan.setTargetAtTime(pan, now, smoothing);
    }
    if (
      Math.abs(level - this.enemyLevel) >= MIX_EPSILON ||
      (level === 0 && this.enemyLevel !== 0)
    ) {
      this.enemyLevel = level;
      this.enemyGain?.gain.setTargetAtTime(level, now, smoothing);
    }
    if (Math.abs(cutoff - this.enemyCutoff) >= CUTOFF_EPSILON) {
      this.enemyCutoff = cutoff;
      this.enemyFilter?.frequency.setTargetAtTime(cutoff, now, smoothing);
    }
  }

  /** A heavy, dull footstep of the enemy: low noise and a soft thump above 70 Hz. */
  enemyStep(volume: number): void {
    const { enemyInput } = this;
    const now = this.now();
    if (!enemyInput || now < 0) return;
    this.noiseBurst('bandpass', 380, 0.1, volume, enemyInput);
    this.tone('triangle', 120, now, 0.12, volume * 0.6, 85, enemyInput);
  }

  /** A low, rough breath: filtered noise (150-600 Hz) that swells in and fades out slowly. */
  enemyBreath(volume: number): void {
    const { ctx, enemyInput, noise } = this;
    const start = this.now();
    if (!ctx || !enemyInput || !noise || start < 0) return;
    const inhale = 0.6;
    const exhale = 1;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 150;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 600;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + inhale);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + inhale + exhale);
    source.connect(highpass).connect(lowpass).connect(gain).connect(enemyInput);
    source.start(start, (start * 3.17) % NOISE_SECONDS);
    source.stop(start + inhale + exhale + 0.05);
  }

  /** A slow pad chord (index into CHORDS), two slightly detuned voices per note. */
  musicChord(index: number): void {
    const chord = CHORDS[index];
    const now = this.now();
    if (!chord || now < 0) return;
    const duration = MUSIC.chordSeconds + 1.5;
    for (const step of chord) {
      const freq = midiToFrequency(ROOT + step);
      for (const cents of [-6, 6]) {
        this.musicVoice('triangle', freq, cents, now, duration, MUSIC.padVolume, 2.5);
      }
    }
  }

  /** A music-box note: a bright fundamental and a bell-like partial, with echo. */
  musicNote(midi: number): void {
    const now = this.now();
    if (now < 0) return;
    const freq = midiToFrequency(midi);
    this.musicVoice('sine', freq, 0, now, 2.4, MUSIC.noteVolume, 0.005);
    this.musicVoice('sine', freq * 2.76, 0, now, 0.9, MUSIC.noteVolume * 0.3, 0.005);
  }

  /** A low, muffled pulse for tension; louder as the enemy gets closer. */
  musicPulse(tension: number): void {
    const now = this.now();
    if (now < 0) return;
    const volume = MUSIC.pulseVolume * (0.5 + tension / 2);
    const freq = midiToFrequency(ROOT);
    this.musicVoice('triangle', freq, 0, now, 0.35, volume, 0.01);
    this.musicVoice('sine', freq * 2, 0, now, 0.25, volume * 0.5, 0.01);
  }

  step(): void {
    this.noiseBurst('bandpass', 900, 0.07, CFG.stepVolume);
  }

  /** Two thumps ("lub-dub") with an upper harmonic, so small speakers can play them. */
  heartbeat(volume: number): void {
    const now = this.now();
    if (now < 0) return;
    this.tone('triangle', 82, now, 0.16, volume, 60);
    this.tone('sine', 164, now, 0.1, volume * 0.4, 120);
    this.tone('triangle', 74, now + 0.17, 0.18, volume * 0.75, 55);
    this.tone('sine', 148, now + 0.17, 0.1, volume * 0.3, 110);
  }

  flicker(): void {
    this.noiseBurst('bandpass', 2600, 0.12, CFG.flickerVolume);
  }

  /** A short electric crackle of the dying bulb. */
  crackle(): void {
    this.noiseBurst('highpass', 3200, 0.05, CFG.crackleVolume);
    const now = this.now();
    if (now >= 0) this.tone('square', BULB_HZ * 2, now, 0.04, CFG.crackleVolume * 0.3);
  }

  pickupKey(): void {
    const now = this.now();
    if (now < 0) return;
    this.tone('triangle', 660, now, 0.14, CFG.pickupVolume);
    this.tone('triangle', 990, now + 0.11, 0.2, CFG.pickupVolume);
  }

  pickupBattery(): void {
    const now = this.now();
    if (now < 0) return;
    this.tone('sine', 440, now, 0.2, CFG.pickupVolume, 880);
  }

  locked(): void {
    const now = this.now();
    if (now < 0) return;
    this.tone('square', 110, now, 0.09, CFG.lockedVolume * 0.5);
    this.tone('square', 98, now + 0.1, 0.09, CFG.lockedVolume * 0.5);
  }

  win(): void {
    const now = this.now();
    if (now < 0) return;
    for (const freq of [262, 330, 392]) this.tone('sine', freq, now, 1.6, CFG.endVolume / 2);
  }

  /** A slow, falling tone: no sudden loud sound on defeat. */
  lose(): void {
    const now = this.now();
    if (now < 0) return;
    this.tone('triangle', 147, now, 1.4, CFG.endVolume, 98);
  }

  private volume(): number {
    return this.muted ? 0 : CFG.masterVolume;
  }

  /** Current audio time, or -1 when audio is not available yet. */
  private now(): number {
    return this.ctx && this.ctx.state === 'running' ? this.ctx.currentTime : -1;
  }

  private create(): void {
    if (typeof window.AudioContext !== 'function') return;
    try {
      const ctx = new AudioContext();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      limiter.connect(ctx.destination);

      const master = ctx.createGain();
      master.gain.value = this.volume();
      master.connect(limiter);

      this.ctx = ctx;
      this.master = master;
      this.noise = createNoise(ctx);
      this.createMusicBus();
      this.createEnemyBus();
      this.createBulb();
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  /** Music voices -> low-pass (darkens with low battery) -> volume, plus an echo send. */
  private createMusicBus(): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const music = ctx.createGain();
    music.gain.value = this.musicOn ? MUSIC.volume : 0;
    music.connect(master);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = MUSIC.brightCutoff;
    filter.connect(music);

    const input = ctx.createGain();
    input.connect(filter);

    const delay = ctx.createDelay(2);
    delay.delayTime.value = MUSIC.echoSeconds;
    const feedback = ctx.createGain();
    feedback.gain.value = MUSIC.echoFeedback;
    input.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(filter);

    this.music = music;
    this.musicFilter = filter;
    this.musicInput = input;
  }

  /** Enemy sounds go through walls muffling, stereo position and distance volume. */
  private createEnemyBus(): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const output = ctx.createGain();
    output.gain.value = this.enemyOn ? 1 : 0;
    output.connect(master);

    const level = ctx.createGain();
    level.gain.value = this.enemyLevel;
    level.connect(output);

    // Without stereo panning (very old browsers) the enemy is still heard, centered.
    let panner: StereoPannerNode | null = null;
    if (typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.value = this.enemyPan;
      panner.connect(level);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.enemyCutoff > 0 ? this.enemyCutoff : CFG_ENEMY.openCutoff;
    filter.connect(panner ?? level);

    const input = ctx.createGain();
    input.connect(filter);

    this.enemyInput = input;
    this.enemyFilter = filter;
    this.enemyPanner = panner;
    this.enemyGain = level;
    this.enemyOutput = output;
  }

  /**
   * The dying bulb: a mains-like hum (110 Hz and a rough overtone a little off),
   * through a band-pass, with a slow uneven swell. Silent until the battery is low.
   */
  private createBulb(): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const bulb = ctx.createGain();
    bulb.gain.value = this.batteryLevel * CFG.lowBatteryMaxVolume;
    bulb.connect(master);

    const swell = ctx.createGain();
    swell.gain.value = 0.7;
    swell.connect(bulb);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.45;
    const depth = ctx.createGain();
    depth.gain.value = 0.3;
    lfo.connect(depth).connect(swell.gain);
    lfo.start();

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 330;
    band.Q.value = 0.9;
    band.connect(swell);

    const voices: [Wave, number, number][] = [
      ['sawtooth', BULB_HZ, 0.5],
      ['sawtooth', BULB_HZ * 1.06, 0.35],
      ['square', BULB_HZ * 2, 0.12],
    ];
    for (const [wave, freq, level] of voices) {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(band);
      osc.start();
      this.bulbOscillators.push(osc);
    }
    this.bulb = bulb;
  }

  /** One music voice with a soft attack of `attack` seconds, into the music bus. */
  private musicVoice(
    wave: Wave,
    freq: number,
    cents: number,
    start: number,
    duration: number,
    volume: number,
    attack: number,
  ): void {
    const { ctx, musicInput } = this;
    if (!ctx || !musicInput) return;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.detune.value = cents + this.batteryLevel * MUSIC.darkDetuneCents;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(musicInput);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private tone(
    wave: Wave,
    freq: number,
    start: number,
    duration: number,
    volume: number,
    endFreq = freq,
    destination: AudioNode | null = this.master,
  ): void {
    const { ctx } = this;
    if (!ctx || !destination) return;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    const gain = ctx.createGain();
    envelope(gain, start, duration, volume);
    osc.connect(gain).connect(destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noiseBurst(
    type: BiquadFilterType,
    freq: number,
    duration: number,
    volume: number,
    destination: AudioNode | null = this.master,
  ): void {
    const { ctx, noise } = this;
    const start = this.now();
    if (!ctx || !destination || !noise || start < 0) return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    envelope(gain, start, duration, volume);
    source.connect(filter).connect(gain).connect(destination);
    source.start(start, (start * 7.31) % (NOISE_SECONDS - duration));
    source.stop(start + duration + 0.05);
  }
}

/** Quick attack and smooth decay, so no sound starts or ends with a click. */
function envelope(gain: GainNode, start: number, duration: number, volume: number): void {
  const attack = Math.min(0.02, duration / 4);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
}

function createNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createRng(NOISE_SEED);
  for (let i = 0; i < data.length; i++) data[i] = nextFloat(rng) * 2 - 1;
  return buffer;
}
