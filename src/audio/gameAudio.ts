import { BALANCE } from '../data/balance';
import type { World } from '../game/world';
import { createCueOutput, createCueState, lowBatteryLevel, resetCues, updateCues } from './cues';
import {
  createMusicOutput,
  createMusicState,
  resetMusic,
  updateMusic,
  type MusicState,
} from './music';
import type { Sfx } from './sfx';
import {
  createEnemyAudioOutput,
  createEnemyAudioState,
  resetEnemyAudio,
  updateEnemyAudio,
  type EnemyAudioConfig,
} from './spatial';

/**
 * Decides what sounds after each logic step (pure state in `cues`, `music` and `spatial`)
 * and plays it through `Sfx`. Reads the world and its events; never changes them.
 */
export class GameAudio {
  private readonly cueState = createCueState();
  private readonly cues = createCueOutput();
  private readonly musicState: MusicState;
  private readonly musicOut = createMusicOutput();
  private readonly enemyConfig: EnemyAudioConfig = {
    ...BALANCE.enemyAudio,
    fastRatio: BALANCE.enemy.darkSpeedMultiplier,
  };
  private readonly enemyState = createEnemyAudioState();
  private readonly enemyOut = createEnemyAudioOutput();

  /** The music has its own generator, so it never changes the gameplay sequence. */
  constructor(
    private readonly sfx: Sfx,
    musicSeed: number,
  ) {
    this.musicState = createMusicState(musicSeed);
  }

  /** Starts a run from silence. */
  reset(): void {
    resetCues(this.cueState);
    resetMusic(this.musicState, BALANCE.music);
    resetEnemyAudio(this.enemyState);
  }

  /** Plays the sounds for what happened in the last logic step. */
  playStep(world: World, stepSeconds: number): void {
    const { sfx, cues, musicOut, enemyOut } = this;
    const { events } = world;
    const batteryLevel =
      world.status === 'playing'
        ? lowBatteryLevel(world.flashlight.battery, BALANCE.audio.lowBatteryThreshold)
        : 0;
    updateCues(
      this.cueState,
      BALANCE.audio,
      stepSeconds,
      events.moving,
      world.enemyNear,
      events.enemyLit > 0,
      batteryLevel,
      cues,
    );
    updateMusic(this.musicState, BALANCE.music, stepSeconds, world.enemyNear, musicOut);
    if (musicOut.chord >= 0) sfx.musicChord(musicOut.chord);
    if (musicOut.note >= 0) sfx.musicNote(musicOut.note);
    if (musicOut.pulse) sfx.musicPulse(musicOut.tension);
    sfx.setBatteryLevel(batteryLevel);
    if (cues.step) sfx.step();
    if (cues.heartbeat) sfx.heartbeat(cues.heartbeatVolume);
    if (cues.flicker) sfx.flicker();
    if (cues.crackle) sfx.crackle();
    if (world.status === 'playing') {
      updateEnemyAudio(
        this.enemyState,
        this.enemyConfig,
        world.room,
        world.player,
        world.nearestEnemy,
        stepSeconds,
        enemyOut,
      );
      sfx.setEnemyMix(enemyOut.pan, enemyOut.gain, enemyOut.cutoff);
      if (enemyOut.step) sfx.enemyStep(enemyOut.stepVolume);
      if (enemyOut.breath) sfx.enemyBreath(enemyOut.breathVolume);
    }
    if (events.keyPicked > 0) sfx.pickupKey();
    if (events.batteryPicked > 0) sfx.pickupBattery();
    if (events.doorLocked > 0) sfx.locked();
    if (events.doorOpened > 0) sfx.win();
    if (events.caught > 0) sfx.lose();
  }
}
