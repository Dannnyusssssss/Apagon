import { TOUCH } from '../data/controls';

/**
 * A floating stick, without DOM access, so it can be tested. It appears where the finger
 * lands. Past the dead zone the direction is always a full unit vector: touch moves at
 * full speed, the same as the keyboard.
 */
export class Joystick {
  /** The finger that holds the stick, or null when it is free. */
  pointerId: number | null = null;
  /** Where the finger landed, in CSS pixels. */
  originX = 0;
  originY = 0;
  /** How far the knob is from the origin, limited to the radius, in CSS pixels. */
  knobX = 0;
  knobY = 0;
  /** Current direction: a unit vector, or zero inside the dead zone. */
  x = 0;
  y = 0;
  /** Last direction outside the dead zone during this touch. */
  lastX = 0;
  lastY = 0;
  /** True once the finger has left the dead zone during this touch. */
  hasDirection = false;

  constructor(
    private readonly radius: number = TOUCH.stickRadius,
    private readonly deadZone: number = TOUCH.stickDeadZone,
  ) {}

  get active(): boolean {
    return this.pointerId !== null;
  }

  start(pointerId: number, x: number, y: number): void {
    this.release();
    this.pointerId = pointerId;
    this.originX = x;
    this.originY = y;
  }

  move(x: number, y: number): void {
    if (!this.active) return;
    const dx = x - this.originX;
    const dy = y - this.originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const limit = distance > this.radius ? this.radius / distance : 1;
    this.knobX = dx * limit;
    this.knobY = dy * limit;
    if (distance <= this.radius * this.deadZone) {
      this.x = 0;
      this.y = 0;
      return;
    }
    this.x = dx / distance;
    this.y = dy / distance;
    this.lastX = this.x;
    this.lastY = this.y;
    this.hasDirection = true;
  }

  release(): void {
    this.pointerId = null;
    this.knobX = 0;
    this.knobY = 0;
    this.x = 0;
    this.y = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.hasDirection = false;
  }
}
