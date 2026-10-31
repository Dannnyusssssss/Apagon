import { createRng, nextFloat } from '../core/rng';
import { BALANCE } from '../data/balance';

const CFG = BALANCE.audio;
/** Seed for the noise buffer; the noise only has to sound like noise. */
const NOISE_SEED = 0x5eed;
const NOISE_SECONDS = 1;
/** Time constant for muting and unmuting, so the change is not a click. */
const MUTE_FADE = 0.05;
/** Time constant for the low-battery drone, so it swells and fades slowly. */
const DRONE_FADE = 0.4;
/** Smallest drone volume change worth sending to the audio thread. */
const DRONE_EPSILON = 0.002;

type Wave = 'sine' | 'triangle' | 'square';

/**
 * Every sound is synthesized with WebAudio: no audio files.
 * The context is created on the first player gesture (`unlock`).
 * A limiter after the master volume keeps any sum of sounds from peaking.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private drone: GainNode | null = null;
  private droneVolume = 0;
  private muted = false;

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

  /** Sets the low-battery drone volume (0 = silent). Cheap to call every step. */
  setLowBattery(volume: number): void {
    if (Math.abs(volume - this.droneVolume) < DRONE_EPSILON) return;
    this.droneVolume = volume;
    if (this.ctx && this.drone) {
      this.drone.gain.setTargetAtTime(volume, this.ctx.currentTime, DRONE_FADE);
    }
  }

  step(): void {
    this.noiseBurst('bandpass', 900, 0.07, CFG.stepVolume);
  }

  heartbeat(volume: number): void {
    const now = this.now();
    if (now < 0) return;
    this.tone('sine', 58, now, 0.16, volume, 44);
    this.tone('sine', 52, now + 0.17, 0.18, volume * 0.75, 40);
  }

  flicker(): void {
    this.noiseBurst('bandpass', 2600, 0.12, CFG.flickerVolume);
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

  /** A slow, low tone: no sudden loud sound on defeat. */
  lose(): void {
    const now = this.now();
    if (now < 0) return;
    this.tone('sine', 98, now, 1.4, CFG.endVolume, 70);
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
      this.startAmbient();
      this.startDrone();
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  /** Low drone made of two slightly detuned tones, through a low-pass filter. */
  private startAmbient(): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = ctx.createGain();
    gain.gain.value = CFG.ambientVolume;
    filter.connect(gain).connect(master);
    for (const freq of [55, 55.6, 82.4]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
    }
  }

  /**
   * Low-battery drone: two low tones a little apart (slow beating), a dissonant
   * third tone and a faint electric buzz, with a slow swell. Starts at the last requested volume.
   */
  private startDrone(): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const drone = ctx.createGain();
    drone.gain.value = this.droneVolume;
    drone.connect(master);

    const tremolo = ctx.createGain();
    tremolo.gain.value = 0.65;
    tremolo.connect(drone);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    const depth = ctx.createGain();
    depth.gain.value = 0.35;
    lfo.connect(depth).connect(tremolo.gain);
    lfo.start();

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 320;
    low.connect(tremolo);
    for (const [freq, wave] of [
      [46, 'sine'],
      [48.7, 'sine'],
      [65.4, 'triangle'],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = freq;
      osc.connect(low);
      osc.start();
    }

    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 120;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = 'bandpass';
    buzzFilter.frequency.value = 2400;
    buzzFilter.Q.value = 8;
    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0.12;
    buzz.connect(buzzFilter).connect(buzzGain).connect(tremolo);
    buzz.start();

    this.drone = drone;
  }

  private tone(
    wave: Wave,
    freq: number,
    start: number,
    duration: number,
    volume: number,
    endFreq = freq,
  ): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    const gain = ctx.createGain();
    envelope(gain, start, duration, volume);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noiseBurst(type: BiquadFilterType, freq: number, duration: number, volume: number): void {
    const { ctx, master, noise } = this;
    const start = this.now();
    if (!ctx || !master || !noise || start < 0) return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    envelope(gain, start, duration, volume);
    source.connect(filter).connect(gain).connect(master);
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
