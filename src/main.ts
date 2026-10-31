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
import { parseDebugParams } from './core/debugParams';
import { attachKeyboard, InputState } from './core/input';
import { FixedStepClock, GameLoop } from './core/loop';
import type { Vec2 } from './core/math';
import { BALANCE } from './data/balance';
import { HOUSE } from './data/rooms';
import { clearEvents } from './game/events';
import { createWorld, resetWorld, stepWorld, type StepInput } from './game/world';
import { Renderer } from './render/renderer';
import { getBrowserStorage, isNewBest, loadSave, writeSave } from './save/storage';
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
let bestTime = save.bestTimeSeconds;

// Debug options are read once; without them nothing extra is created (see docs/DEBUG.md).
const debugParams = parseDebugParams(window.location.search);
const debugOverlay = debugParams.debug ? new DebugOverlay(container) : null;

// The seed only picks among the fixed enemy starts of the map.
const seed = debugParams.seed ?? Date.now() >>> 0;
const world = createWorld(HOUSE, {
  seed,
  reduceFlicker: chosenReduceFlicker ?? prefersReducedMotion,
  muted: save.muted,
  godMode: debugParams.god,
});
const sfx = new Sfx();
sfx.setMuted(world.settings.muted);
const cueState = createCueState();
const cues = createCueOutput();
// The music has its own generator, so it never changes the gameplay sequence.
const musicState = createMusicState(seed ^ 0x9e3779b9);
const musicOut = createMusicOutput();
const input = new InputState();
const renderer = new Renderer(gameCanvas);

type AppState = 'start' | 'playing' | 'paused' | 'won' | 'lost';
let state: AppState = 'start';

const screens = new Screens(container, {
  onStart: startRun,
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
});
screens.setReduceFlicker(world.settings.reduceFlicker);
applyReduceMotion(world.settings.reduceFlicker);
screens.setMuted(world.settings.muted);
screens.showStart(false);

/** "Reduce flicker" also stops the menu animations. */
function applyReduceMotion(on: boolean): void {
  document.documentElement.classList.toggle('reduce-motion', on);
}

function persist(): void {
  writeSave(storage, {
    reduceFlicker: chosenReduceFlicker,
    muted: world.settings.muted,
    bestTimeSeconds: bestTime,
  });
}

function setMuted(muted: boolean): void {
  world.settings.muted = muted;
  sfx.setMuted(muted);
  screens.setMuted(muted);
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
  // Started from a click or key press, so the browser allows audio.
  sfx.unlock();
  sfx.setBatteryLevel(0);
  sfx.setMusicOn(true);
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
  input.clear();
  sfx.suspend();
  screens.showPause(focusMenu);
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
  sfx.setMusicOn(false);
  sfx.setBatteryLevel(0);
  if (world.status === 'lost') {
    state = 'lost';
    screens.showDefeat();
  } else if (world.status === 'won') {
    state = 'won';
    const time = world.elapsedSeconds;
    const newBest = isNewBest(time, bestTime);
    if (newBest) {
      bestTime = time;
      persist();
    }
    screens.showVictory(time, bestTime, newBest);
  }
}

attachKeyboard(gameCanvas, input);
// Losing focus (Tab, clicking elsewhere, switching window or tab) pauses the run.
gameCanvas.addEventListener('blur', () => pause(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause(false);
});
window.addEventListener('resize', () => renderer.resize());

const axis: Vec2 = { x: 0, y: 0 };
const stepInput: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };

const sim = BALANCE.simulation;
const loop = new GameLoop(
  new FixedStepClock(sim.stepSeconds, sim.maxStepsPerFrame, sim.maxFrameSeconds),
  {
    isRunning: () => state === 'playing',
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
      stepWorld(world, stepInput, stepSeconds);
      debugOverlay?.countStep();
      playStepSounds(stepSeconds);
      if (world.status !== 'playing') finishRun();
    },
    render: (alpha) => {
      renderer.render(world, alpha);
      debugOverlay?.frame(performance.now(), world, state);
    },
  },
);
loop.start();
