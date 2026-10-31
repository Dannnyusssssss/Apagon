import './style.css';
import { attachKeyboard, InputState } from './core/input';
import { FixedStepClock, GameLoop } from './core/loop';
import type { Vec2 } from './core/math';
import { BALANCE } from './data/balance';
import { TEST_ROOM } from './data/rooms';
import { createWorld, resetWorld, stepWorld, type StepInput } from './game/world';
import { Renderer } from './render/renderer';
import { DefeatOverlay } from './ui/defeatOverlay';
import { FocusOverlay } from './ui/focusOverlay';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const container = document.querySelector<HTMLElement>('#app');
if (!canvas || !container) throw new Error('Game canvas not found');

const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The seed only picks among the fixed enemy starts of the room.
const world = createWorld(TEST_ROOM, {
  seed: Date.now() >>> 0,
  reduceFlicker: prefersReducedMotion,
});
const input = new InputState();
const renderer = new Renderer(canvas);
const focusOverlay = new FocusOverlay(container, canvas);
const defeatOverlay = new DefeatOverlay(container, retry);

attachKeyboard(canvas, input);

let focused = false;
function updateOverlays(): void {
  focusOverlay.setVisible(!focused && !defeatOverlay.visible);
}
function setFocused(value: boolean): void {
  focused = value;
  updateOverlays();
}

function retry(): void {
  resetWorld(world);
  defeatOverlay.hide();
  canvas?.focus();
  updateOverlays();
}

canvas.addEventListener('focus', () => setFocused(true));
canvas.addEventListener('blur', () => setFocused(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) canvas.blur();
});
setFocused(document.activeElement === canvas);

window.addEventListener('resize', () => renderer.resize());

const axis: Vec2 = { x: 0, y: 0 };
const stepInput: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false };

const sim = BALANCE.simulation;
const loop = new GameLoop(
  new FixedStepClock(sim.stepSeconds, sim.maxStepsPerFrame, sim.maxFrameSeconds),
  {
    isRunning: () => focused && world.status === 'playing',
    update: (stepSeconds) => {
      input.readAxis(axis);
      stepInput.axisX = axis.x;
      stepInput.axisY = axis.y;
      stepInput.toggleFlashlight = input.consumeToggle();
      stepWorld(world, stepInput, stepSeconds);
      if (world.status === 'lost' && !defeatOverlay.visible) {
        defeatOverlay.show();
        updateOverlays();
      }
    },
    render: (alpha) => renderer.render(world, alpha),
  },
);
loop.start();
