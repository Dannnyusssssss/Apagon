import './style.css';
import './options.css';
import { Settings } from './app/settings';
import { TouchUi } from './app/touchUi';
import { GameAudio } from './audio/gameAudio';
import { Sfx } from './audio/sfx';
import { parseDebugParams, recordsAllowed } from './core/debugParams';
import { FramePacer } from './core/framePacer';
import { attachKeyboard, InputState } from './core/input';
import { attachPointer, PointerAim } from './core/pointer';
import { TouchSticks } from './core/touch';
import { FixedStepClock, GameLoop } from './core/loop';
import type { Vec2 } from './core/math';
import { BALANCE } from './data/balance';
import { TOUCH } from './data/controls';
import { levelAt, LEVEL_COUNT } from './data/levels';
import { TEXTS } from './data/texts';
import { clearEvents } from './game/events';
import { missingKeys } from './game/items';
import { createLevelWorld, resetWorld, stepWorld, type StepInput, type World } from './game/world';
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
import { getBrowserStorage, loadSave } from './save/storage';
import { DebugOverlay } from './ui/debugOverlay';
import { loadKeyboardLayout } from './ui/keyNames';
import { promptText } from './ui/prompts';
import { SafeAreaProbe, type SafeInsets } from './ui/safeArea';
import { Screens } from './ui/screens';
import { StatsOverlay } from './ui/statsOverlay';
import { TouchControls } from './ui/touchControls';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const container = document.querySelector<HTMLElement>('#app');
if (!canvas || !container) throw new Error('Game canvas not found');
const gameCanvas: HTMLCanvasElement = canvas;
const app: HTMLElement = container;

const storage = getBrowserStorage();
const save = loadSave(storage);
const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = new Settings(save, storage, prefersReducedMotion);

// Debug options are read once; without them nothing extra is created (see docs/DEBUG.md).
const debugParams = parseDebugParams(window.location.search);
const debugOverlay = debugParams.debug ? new DebugOverlay(container, gameCanvas) : null;
/** The players' performance panel, created the first time it is shown. */
let statsOverlay: StatsOverlay | null = null;

// The seed only picks among the fixed enemy starts and item spots of each map.
const seed = debugParams.seed ?? Date.now() >>> 0;
/** Runs with any debug help never touch the saved progress. */
const recording = recordsAllowed(debugParams);
/** Keeps layouts from repeating when a level is loaded again, unless the seed was fixed. */
let worldsLoaded = 0;

function newRun(): RunProgress {
  return debugParams.level === null ? newGameRun(recording) : debugRun(debugParams.level);
}

const touchUi = new TouchUi(save.touchControls, debugParams.touch);

let run = newRun();
let world = buildWorld(run.levelIndex);

/** A new world for a level, with the player's current settings. */
function buildWorld(levelIndex: number): World {
  const visit = debugParams.seed === null ? worldsLoaded++ : 0;
  return createLevelWorld(levelAt(levelIndex), {
    ...settings.worldInit(),
    seed: (seed + Math.imul(levelIndex + 1, 0x9e3779b1) + Math.imul(visit, 0x85ebca6b)) >>> 0,
    godMode: debugParams.god,
  });
}

const sfx = new Sfx();
const gameAudio = new GameAudio(sfx, seed ^ 0x9e3779b9);
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
  isActive: () => state === 'playing' && touchUi.showsControls(),
  // The classic light has no direction to aim.
  isAimEnabled: () => !world.settings.classicLight,
  onToggleLight: () => input.requestToggle(),
  onInteract: () => input.requestInteract(),
  onPause: () => input.requestPause(),
  onCancel: () => pause(false),
});

const screens = new Screens(container, {
  ...settings.handlers,
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
});
settings.attach({
  canvas: gameCanvas,
  sfx,
  input,
  renderer,
  touchUi,
  touchControls,
  world: () => world,
  redraw: () => {
    redraw = true;
  },
  layoutChanged: applyTouchUi,
  showStats,
  changed: (values) => screens.update(values),
});
void loadKeyboardLayout().then((layout) => {
  settings.setLayout(layout);
  screens.setLayout(layout);
  redraw = true;
});
screens.showStart(false, canContinue(save) ? save.unlockedLevel : null);

/** Builds the world of the current level, keeping the player's settings. */
function loadLevel(): void {
  world = buildWorld(run.levelIndex);
  renderer.setLevel(levelAt(run.levelIndex));
  settings.updateCursor();
  redraw = true;
}

function levelLabel(index: number): string {
  return TEXTS.levelLabel(index + 1, TEXTS.levels[levelAt(index).id].name);
}

/** With `?debug` the debug panel already shows these numbers, and more. */
function showStats(visible: boolean): void {
  if (debugOverlay) return;
  if (visible) statsOverlay ??= new StatsOverlay(app, gameCanvas);
  statsOverlay?.setVisible(visible);
}

/** Matches texts, HUD and controls to the device and the setting. */
function applyTouchUi(): void {
  const showing = touchUi.applyClasses();
  touchControls.setVisible(showing && state === 'playing');
  renderer.setHudLayout(showing, safeArea.read(insets));
  redraw = true;
}

/** Every finger on the game is forgotten when a menu opens or closes. */
function setPlaying(playing: boolean): void {
  sticks.clear();
  touchControls.refreshSticks();
  touchControls.setVisible(playing && touchUi.showsControls());
}

function startRun(): void {
  resetWorld(world);
  gameAudio.reset();
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
    if (result.changed) settings.persist();
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
    if (event.pointerType !== 'touch' || !touchUi.noteTouch()) return;
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
  renderer.setHudLayout(touchUi.showsControls(), safeArea.read(insets));
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
      if (input.consumeMute()) settings.setMuted(!world.settings.muted);
      if (input.consumeStats()) settings.toggleStats();
      input.readAxis(axis);
      sticks.applyMove(axis);
      stepInput.axisX = axis.x;
      stepInput.axisY = axis.y;
      stepInput.toggleFlashlight = input.consumeToggle();
      stepInput.interact = input.consumeInteract();
      stepInput.aimAt =
        sticks.aimPoint(world.player.x, world.player.y, aimPoint) ??
        (settings.mouseAim && pointer.active
          ? renderer.pointToWorld(pointer.x, pointer.y, aimPoint)
          : null);
      stepWorld(world, stepInput, stepSeconds);
      debugOverlay?.countStep();
      gameAudio.playStep(world, stepSeconds);
      clearEvents(world.events);
      if (world.status !== 'playing') finishRun();
      else if (touchUi.showsControls()) syncTouchControls();
    },
    render: (alpha) => {
      renderer.render(world, alpha);
      statsOverlay?.frame(performance.now(), state === 'playing', pacer.divisor);
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
