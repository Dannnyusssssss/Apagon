import './style.css';
import { attachKeyboard, InputState } from './core/input';
import { FixedStepClock, GameLoop } from './core/loop';
import type { Vec2 } from './core/math';
import { BALANCE } from './data/balance';
import { TEST_ROOM } from './data/rooms';
import { createWorld, resetWorld, stepWorld, type StepInput } from './game/world';
import { Renderer } from './render/renderer';
import { getBrowserStorage, isNewBest, loadSave, writeSave } from './save/storage';
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

// The seed only picks among the fixed enemy starts of the room.
const world = createWorld(TEST_ROOM, {
  seed: Date.now() >>> 0,
  reduceFlicker: chosenReduceFlicker ?? prefersReducedMotion,
});
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
    chosenReduceFlicker = checked;
    screens.setReduceFlicker(checked);
    persist();
  },
});
screens.setReduceFlicker(world.settings.reduceFlicker);
screens.showStart(false);

function persist(): void {
  writeSave(storage, { reduceFlicker: chosenReduceFlicker, bestTimeSeconds: bestTime });
}

function startRun(): void {
  resetWorld(world);
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
  screens.showPause(focusMenu);
}

function resume(): void {
  if (state !== 'paused') return;
  state = 'playing';
  input.clear();
  screens.hideAll();
  gameCanvas.focus();
}

function finishRun(): void {
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
      input.readAxis(axis);
      stepInput.axisX = axis.x;
      stepInput.axisY = axis.y;
      stepInput.toggleFlashlight = input.consumeToggle();
      stepInput.interact = input.consumeInteract();
      stepWorld(world, stepInput, stepSeconds);
      if (world.status !== 'playing') finishRun();
    },
    render: (alpha) => renderer.render(world, alpha),
  },
);
loop.start();
