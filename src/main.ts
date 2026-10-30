import './style.css';
import { attachKeyboard, InputState } from './core/input';
import { FixedStepClock, GameLoop } from './core/loop';
import type { Vec2 } from './core/math';
import { BALANCE } from './data/balance';
import { TEST_ROOM } from './data/rooms';
import { createWorld, stepWorld, type StepInput } from './game/world';
import { Renderer } from './render/renderer';
import { FocusOverlay } from './ui/focusOverlay';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const container = document.querySelector<HTMLElement>('#app');
if (!canvas || !container) throw new Error('Game canvas not found');

const world = createWorld(TEST_ROOM);
const input = new InputState();
const renderer = new Renderer(canvas);
const overlay = new FocusOverlay(container, canvas);

attachKeyboard(canvas, input);

let active = false;
function setActive(value: boolean): void {
  active = value;
  overlay.setVisible(!value);
}
canvas.addEventListener('focus', () => setActive(true));
canvas.addEventListener('blur', () => setActive(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) canvas.blur();
});
setActive(document.activeElement === canvas);

window.addEventListener('resize', () => renderer.resize());

const axis: Vec2 = { x: 0, y: 0 };
const stepInput: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false };

const sim = BALANCE.simulation;
const loop = new GameLoop(
  new FixedStepClock(sim.stepSeconds, sim.maxStepsPerFrame, sim.maxFrameSeconds),
  {
    isRunning: () => active,
    update: (stepSeconds) => {
      input.readAxis(axis);
      stepInput.axisX = axis.x;
      stepInput.axisY = axis.y;
      stepInput.toggleFlashlight = input.consumeToggle();
      stepWorld(world, stepInput, stepSeconds);
    },
    render: (alpha) => renderer.render(world, alpha),
  },
);
loop.start();
