import './style.css';
import {
  createCueOutput,
  createCueState,
  lowBatteryLevel,
  resetCues,
  updateCues,
} from './audio/cues';
import { createMusicOutput, createMusicState, resetMusic, updateMusic } from './audio/music';
import { Sfx } from './audio/sfx';
import {
  createEnemyAudioOutput,
  createEnemyAudioState,
  resetEnemyAudio,
  updateEnemyAudio,
  type EnemyAudioConfig,
} from './audio/spatial';
import { parseDebugParams } from './core/debugParams';
import { FramePacer } from './core/framePacer';
import { attachKeyboard, InputState } from './core/input';
import { attachPointer, PointerAim } from './core/pointer';
import { FixedStepClock, GameLoop } from './core/loop';
import type { Vec2 } from './core/math';
import { BALANCE } from './data/balance';
import { levelAt, LEVEL_COUNT } from './data/levels';
import { TEXTS } from './data/texts';
import { clearEvents } from './game/events';
import {
  createLevelWorld,
  resetWorld,
  setLightMode,
  stepWorld,
  type StepInput,
  type World,
} from './game/world';
import { Renderer } from './render/renderer';
import {
  addAttemptTime,
  canContinue,
  continueRun,
  debugRun,
  newGameRun,
  recordLevelWin,
  type RunProgress,
} from './save/progress';
import { getBrowserStorage, loadSave, writeSave } from './save/storage';
import { DebugOverlay } from './ui/debugOverlay';
import { Screens } from './ui/screens';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const container = document.querySelector<HTMLElement>('#app');
if (!canvas || !container) throw new Error('Game canvas not found');
const gameCanvas: HTMLCanvasElement = canvas;

const storage = getBrowserStorage();
const save = loadSave(storage);
const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Stays null until the player picks it, so the system preference keeps applying. */
let chosenReduceFlicker = save.reduceFlicker;
let mouseAim = save.mouseAim;

// Debug options are read once; without them nothing extra is created (see docs/DEBUG.md).
const debugParams = parseDebugParams(window.location.search);
const debugOverlay = debugParams.debug ? new DebugOverlay(container, gameCanvas) : null;

// The seed only picks among the fixed enemy starts and item spots of each map.
const seed = debugParams.seed ?? Date.now() >>> 0;
/** Debug runs never touch the saved progress. */
const recording = debugParams.level === null && !debugParams.god;
/** Keeps layouts from repeating when a level is loaded again, unless the seed was fixed. */
let worldsLoaded = 0;

function newRun(): RunProgress {
  return debugParams.level === null ? newGameRun(recording) : debugRun(debugParams.level);
}

let run = newRun();
let world = buildWorld(run.levelIndex, {
  reduceFlicker: chosenReduceFlicker ?? prefersReducedMotion,
  muted: save.muted,
  classicLight: save.classicLight,
});

interface CarriedSettings {
  readonly reduceFlicker: boolean;
  readonly muted: boolean;
  readonly classicLight: boolean;
}

function buildWorld(levelIndex: number, settings: CarriedSettings): World {
  const visit = debugParams.seed === null ? worldsLoaded++ : 0;
  return createLevelWorld(levelAt(levelIndex), {
    ...settings,
    seed: (seed + Math.imul(levelIndex + 1, 0x9e3779b1) + Math.imul(visit, 0x85ebca6b)) >>> 0,
    godMode: debugParams.god,
  });
}

const sfx = new Sfx();
sfx.setMuted(world.settings.muted);
const cueState = createCueState();
const cues = createCueOutput();
// The music has its own generator, so it never changes the gameplay sequence.
const musicState = createMusicState(seed ^ 0x9e3779b9);
const musicOut = createMusicOutput();
const enemyAudioConfig: EnemyAudioConfig = {
  ...BALANCE.enemyAudio,
  fastRatio: BALANCE.enemy.darkSpeedMultiplier,
};
const enemyAudioState = createEnemyAudioState();
const enemyAudio = createEnemyAudioOutput();
const input = new InputState();
const pointer = new PointerAim();
const renderer = new Renderer(gameCanvas);
renderer.setLevel(levelAt(run.levelIndex));

type AppState = 'start' | 'playing' | 'paused' | 'levelDone' | 'won' | 'lost';
let state: AppState = 'start';
/** Nothing moves on a menu: the canvas is drawn again only when something changes behind it. */
let redraw = true;

const screens = new Screens(container, {
  onContinue: () => {
    run = debugParams.level === null ? continueRun(save.unlockedLevel, recording) : newRun();
    loadLevel();
    startRun();
  },
  onNewGame: () => {
    run = newRun();
    loadLevel();
    startRun();
  },
  onNextLevel: () => {
    run.levelIndex++;
    loadLevel();
    startRun();
  },
  onResume: resume,
  onRetry: startRun,
  onReduceFlicker: (checked) => {
    world.settings.reduceFlicker = checked;
    applyReduceMotion(checked);
    chosenReduceFlicker = checked;
    screens.setReduceFlicker(checked);
    persist();
  },
  onMute: setMuted,
  onClassicLight: (checked) => {
    // Applies at once, even from the pause menu: shape and difficulty.
    setLightMode(world, checked);
    screens.setClassicLight(checked);
    updateCursor();
    redraw = true;
    persist();
  },
  onMouseAim: (checked) => {
    mouseAim = checked;
    screens.setMouseAim(checked);
    updateCursor();
    persist();
  },
});
screens.setReduceFlicker(world.settings.reduceFlicker);
applyReduceMotion(world.settings.reduceFlicker);
screens.setMuted(world.settings.muted);
screens.setClassicLight(world.settings.classicLight);
screens.setMouseAim(mouseAim);
updateCursor();
screens.showStart(false, canContinue(save) ? save.unlockedLevel : null);

/** Builds the world of the current level, keeping the player's settings. */
function loadLevel(): void {
  const { reduceFlicker, muted, classicLight } = world.settings;
  world = buildWorld(run.levelIndex, { reduceFlicker, muted, classicLight });
  renderer.setLevel(levelAt(run.levelIndex));
  redraw = true;
}

function levelLabel(index: number): string {
  return TEXTS.levelLabel(index + 1, TEXTS.levels[levelAt(index).id].name);
}

/** The crosshair only shows when the mouse moves the beam. */
function updateCursor(): void {
  gameCanvas.classList.toggle('game--aim', mouseAim && !world.settings.classicLight);
}

/** "Reduce flicker" also stops the menu animations. */
function applyReduceMotion(on: boolean): void {
  document.documentElement.classList.toggle('reduce-motion', on);
}

function persist(): void {
  writeSave(storage, {
    reduceFlicker: chosenReduceFlicker,
    muted: world.settings.muted,
    classicLight: world.settings.classicLight,
    mouseAim,
    unlockedLevel: save.unlockedLevel,
    bestLevelTimes: save.bestLevelTimes,
    bestFullRunSeconds: save.bestFullRunSeconds,
  });
}

function setMuted(muted: boolean): void {
  world.settings.muted = muted;
  sfx.setMuted(muted);
  screens.setMuted(muted);
  redraw = true;
  persist();
}

/** Plays the sounds for what happened in the last logic step, then clears the events. */
function playStepSounds(stepSeconds: number): void {
  const { events } = world;
  const batteryLevel =
    world.status === 'playing'
      ? lowBatteryLevel(world.flashlight.battery, BALANCE.audio.lowBatteryThreshold)
      : 0;
  updateCues(
    cueState,
    BALANCE.audio,
    stepSeconds,
    events.moving,
    world.enemyNear,
    events.enemyLit > 0,
    batteryLevel,
    cues,
  );
  updateMusic(musicState, BALANCE.music, stepSeconds, world.enemyNear, musicOut);
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
      enemyAudioState,
      enemyAudioConfig,
      world.room,
      world.player,
      world.nearestEnemy,
      stepSeconds,
      enemyAudio,
    );
    sfx.setEnemyMix(enemyAudio.pan, enemyAudio.gain, enemyAudio.cutoff);
    if (enemyAudio.step) sfx.enemyStep(enemyAudio.stepVolume);
    if (enemyAudio.breath) sfx.enemyBreath(enemyAudio.breathVolume);
  }
  if (events.keyPicked > 0) sfx.pickupKey();
  if (events.batteryPicked > 0) sfx.pickupBattery();
  if (events.doorLocked > 0) sfx.locked();
  if (events.doorOpened > 0) sfx.win();
  if (events.caught > 0) sfx.lose();
  clearEvents(events);
}

function startRun(): void {
  resetWorld(world);
  resetCues(cueState);
  resetMusic(musicState, BALANCE.music);
  resetEnemyAudio(enemyAudioState);
  // Started from a click or key press, so the browser allows audio.
  sfx.unlock();
  sfx.setBatteryLevel(0);
  sfx.setMusicOn(true);
  sfx.setEnemyAudible(true);
  input.clear();
  state = 'playing';
  screens.hideAll();
  gameCanvas.focus();
}

/**
 * `focusMenu` is true only for the pause keys. When focus is lost (Tab, click
 * elsewhere, hidden tab) the menu is shown without taking focus back, so Tab
 * can still leave the game.
 */
function pause(focusMenu: boolean): void {
  if (state !== 'playing') return;
  state = 'paused';
  redraw = true;
  input.clear();
  sfx.suspend();
  screens.showPause(focusMenu, levelLabel(run.levelIndex));
}

function resume(): void {
  if (state !== 'paused') return;
  state = 'playing';
  input.clear();
  sfx.unlock();
  screens.hideAll();
  gameCanvas.focus();
}

function finishRun(): void {
  redraw = true;
  sfx.setMusicOn(false);
  sfx.setEnemyAudible(false);
  sfx.setBatteryLevel(0);
  const seconds = world.elapsedSeconds;
  addAttemptTime(run, seconds);
  if (world.status === 'lost') {
    state = 'lost';
    screens.showDefeat(levelLabel(run.levelIndex));
  } else if (world.status === 'won') {
    const result = recordLevelWin(run, save, seconds, LEVEL_COUNT);
    if (result.changed) persist();
    if (result.finished) {
      state = 'won';
      screens.showVictory({
        lastLevelSeconds: seconds,
        totalSeconds: run.fullRun ? run.totalSeconds : null,
        bestTotalSeconds: result.bestFullRunSeconds,
        newBest: result.newFullRunBest,
      });
    } else {
      state = 'levelDone';
      const next = run.levelIndex + 1;
      screens.showLevelDone({
        seconds,
        bestSeconds: result.bestLevelSeconds,
        newBest: result.newLevelBest,
        nextLabel: levelLabel(next),
        nextIntro: TEXTS.levels[levelAt(next).id].intro,
      });
    }
  }
}

attachKeyboard(gameCanvas, input);
attachPointer(container, gameCanvas, pointer, () => state === 'playing');
// Losing focus (Tab, clicking elsewhere, switching window or tab) pauses the run.
gameCanvas.addEventListener('blur', () => pause(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause(false);
});
window.addEventListener('resize', () => {
  renderer.resize();
  redraw = true;
});

const axis: Vec2 = { x: 0, y: 0 };
const aimPoint: Vec2 = { x: 0, y: 0 };
const stepInput: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };

const sim = BALANCE.simulation;
const pacer = new FramePacer(sim.targetFps);
const loop = new GameLoop(
  new FixedStepClock(sim.stepSeconds, sim.maxStepsPerFrame, sim.maxFrameSeconds),
  pacer,
  {
    isRunning: () => state === 'playing',
    shouldRender: () => {
      if (state === 'playing') return true;
      const needed = redraw;
      redraw = false;
      return needed;
    },
    update: (stepSeconds) => {
      if (state !== 'playing') return;
      if (input.consumePause()) {
        pause(true);
        return;
      }
      if (input.consumeMute()) setMuted(!world.settings.muted);
      input.readAxis(axis);
      stepInput.axisX = axis.x;
      stepInput.axisY = axis.y;
      stepInput.toggleFlashlight = input.consumeToggle();
      stepInput.interact = input.consumeInteract();
      stepInput.aimAt =
        mouseAim && pointer.active ? renderer.pointToWorld(pointer.x, pointer.y, aimPoint) : null;
      stepWorld(world, stepInput, stepSeconds);
      debugOverlay?.countStep();
      playStepSounds(stepSeconds);
      if (world.status !== 'playing') finishRun();
    },
    render: (alpha) => {
      renderer.render(world, alpha);
      debugOverlay?.frame(performance.now(), world, {
        state,
        level: levelAt(run.levelIndex).id,
        divisor: pacer.divisor,
        playing: state === 'playing',
      });
    },
  },
);
loop.start();
