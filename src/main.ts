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
import { touchControlsVisible, TouchSticks } from './core/touch';
import { FixedStepClock, GameLoop } from './core/loop';
import type { Vec2 } from './core/math';
import { BALANCE } from './data/balance';
import { TOUCH, type TouchMode } from './data/controls';
import { levelAt, LEVEL_COUNT } from './data/levels';
import { TEXTS } from './data/texts';
import { clearEvents } from './game/events';
import { missingKeys } from './game/items';
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
import { promptText } from './ui/prompts';
import { SafeAreaProbe, type SafeInsets } from './ui/safeArea';
import { Screens } from './ui/screens';
import { TouchControls } from './ui/touchControls';

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
let touchMode: TouchMode = save.touchControls;
let leftHanded = save.leftHanded;

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

/** Matches a query without failing where it is not available. */
function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

const coarsePointer = mediaMatches('(pointer: coarse)');
/** Set by a real touch too: on a laptop with a touch screen the main pointer is the mouse. */
let touchDetected = coarsePointer;
/** The touch settings show once they mean something, so a mouse-only menu stays as it was. */
let touchCapable = coarsePointer || debugParams.touch || touchMode !== 'auto';

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
const sticks = new TouchSticks();
const renderer = new Renderer(gameCanvas);
const safeArea = new SafeAreaProbe(container);
const insets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
renderer.setLevel(levelAt(run.levelIndex));

type AppState = 'start' | 'playing' | 'paused' | 'levelDone' | 'won' | 'lost';
let state: AppState = 'start';
/** Nothing moves on a menu: the canvas is drawn again only when something changes behind it. */
let redraw = true;

const touchControls = new TouchControls(container, gameCanvas, {
  sticks,
  acceptMouse: debugParams.touch,
  isActive: () => state === 'playing' && showsTouchControls(),
  // The classic light has no direction to aim.
  isAimEnabled: () => !world.settings.classicLight,
  onToggleLight: () => input.requestToggle(),
  onInteract: () => input.requestInteract(),
  onPause: () => input.requestPause(),
  onCancel: () => pause(false),
});

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
  onLeftHanded: (checked) => {
    leftHanded = checked;
    screens.setLeftHanded(checked);
    touchControls.setLeftHanded(checked);
    persist();
  },
  onTouchMode: (mode) => {
    touchMode = mode;
    screens.setTouchMode(mode);
    applyTouchUi();
    persist();
  },
});
screens.setReduceFlicker(world.settings.reduceFlicker);
applyReduceMotion(world.settings.reduceFlicker);
screens.setMuted(world.settings.muted);
screens.setClassicLight(world.settings.classicLight);
screens.setMouseAim(mouseAim);
screens.setLeftHanded(leftHanded);
screens.setTouchMode(touchMode);
touchControls.setLeftHanded(leftHanded);
updateCursor();
applyTouchUi();
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

function showsTouchControls(): boolean {
  return debugParams.touch || touchControlsVisible(touchMode, touchDetected);
}

/** Matches texts, HUD and controls to the device and the setting. */
function applyTouchUi(): void {
  const showing = showsTouchControls();
  const root = document.documentElement.classList;
  root.toggle('touch-ui', showing);
  root.toggle('touch-capable', touchCapable);
  root.toggle('has-mouse', debugParams.touch || mediaMatches('(any-pointer: fine)'));
  touchControls.setVisible(showing && state === 'playing');
  renderer.setHudLayout(showing, safeArea.read(insets));
  redraw = true;
}

/** Every finger on the game is forgotten when a menu opens or closes. */
function setPlaying(playing: boolean): void {
  sticks.clear();
  touchControls.refreshSticks();
  touchControls.setVisible(playing && showsTouchControls());
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
    touchControls: touchMode,
    leftHanded,
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
  setPlaying(true);
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
  setPlaying(false);
  sfx.suspend();
  screens.showPause(focusMenu, levelLabel(run.levelIndex));
}

function resume(): void {
  if (state !== 'paused') return;
  state = 'playing';
  input.clear();
  setPlaying(true);
  sfx.unlock();
  screens.hideAll();
  gameCanvas.focus();
}

function finishRun(): void {
  redraw = true;
  setPlaying(false);
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

/** The buttons show what the game state allows right now. */
function syncTouchControls(): void {
  const { prompt } = world.interact;
  const label = promptText(
    prompt,
    missingKeys(world.inventory),
    levelAt(run.levelIndex).exit,
    true,
  );
  touchControls.sync(world.flashlight.on, label, prompt !== 'none' && prompt !== 'doorLocked');
}

attachKeyboard(gameCanvas, input);
attachPointer(container, gameCanvas, pointer, () => state === 'playing');
// Losing focus (Tab, clicking elsewhere, switching window or tab) pauses the run.
gameCanvas.addEventListener('blur', (event) => {
  // An on-screen button is part of the game: the focus goes back instead of pausing.
  if (touchControls.contains(event.relatedTarget)) gameCanvas.focus();
  else pause(false);
});
// During play the first touch shows the controls, and that same touch moves the stick. On a
// menu the change waits for the tap to end: the layout would move the button under the finger.
container.addEventListener(
  'pointerdown',
  (event) => {
    if (event.pointerType !== 'touch' || touchDetected) return;
    touchDetected = true;
    touchCapable = true;
    if (state === 'playing') applyTouchUi();
    else window.setTimeout(applyTouchUi, TOUCH.menuLayoutDelayMs);
  },
  { capture: true },
);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause(false);
});
/** Density the canvas was last sized for. */
let viewDensity = window.devicePixelRatio;

function onViewChange(): void {
  viewDensity = window.devicePixelRatio;
  renderer.resize();
  renderer.setHudLayout(showsTouchControls(), safeArea.read(insets));
  redraw = true;
}
window.addEventListener('resize', onViewChange);
window.addEventListener('orientationchange', onViewChange);

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
      // Zooming or moving to another screen changes the density, sometimes without a resize.
      if (window.devicePixelRatio !== viewDensity) onViewChange();
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
      sticks.applyMove(axis);
      stepInput.axisX = axis.x;
      stepInput.axisY = axis.y;
      stepInput.toggleFlashlight = input.consumeToggle();
      stepInput.interact = input.consumeInteract();
      stepInput.aimAt =
        sticks.aimPoint(world.player.x, world.player.y, aimPoint) ??
        (mouseAim && pointer.active ? renderer.pointToWorld(pointer.x, pointer.y, aimPoint) : null);
      stepWorld(world, stepInput, stepSeconds);
      debugOverlay?.countStep();
      playStepSounds(stepSeconds);
      if (world.status !== 'playing') finishRun();
      else if (showsTouchControls()) syncTouchControls();
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
