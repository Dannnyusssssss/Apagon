import { TOUCH, type TouchMode } from '../data/controls';
import { Joystick } from './joystick';
import type { Vec2 } from './math';

export type StickRole = 'move' | 'aim';

/** Which stick a touch at `x` would start. Buttons sit on the aim side. */
export function stickZone(x: number, width: number, leftHanded: boolean): StickRole {
  const onLeft = x < width / 2;
  return onLeft !== leftHanded ? 'move' : 'aim';
}

/** Whether the on-screen controls show, given the setting and whether touch was detected. */
export function touchControlsVisible(mode: TouchMode, detected: boolean): boolean {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return detected;
}

/** True while a screen that just opened must ignore a tap meant for the game behind it. */
export function isTooSoonAfterOpening(now: number, openedAt: number): boolean {
  return now - openedAt < TOUCH.endScreenGuardMs;
}

/**
 * The two sticks and which finger holds each one, without DOM access, so it can be tested.
 * A finger owns its stick until it lifts; other fingers on that side are ignored, and
 * fingers on buttons never get here.
 */
export class TouchSticks {
  readonly move = new Joystick();
  readonly aim = new Joystick();

  /** Starts the stick for this touch. Returns its role, or null when the touch is ignored. */
  down(
    pointerId: number,
    x: number,
    y: number,
    width: number,
    leftHanded: boolean,
    aimEnabled: boolean,
  ): StickRole | null {
    this.up(pointerId);
    const role = stickZone(x, width, leftHanded);
    if (role === 'aim' && !aimEnabled) return null;
    const stick = this.stick(role);
    if (stick.active) return null;
    stick.start(pointerId, x, y);
    return role;
  }

  /** Follows a tracked finger. Returns its role, or null when no stick belongs to it. */
  moveTo(pointerId: number, x: number, y: number): StickRole | null {
    const role = this.roleOf(pointerId);
    if (role) this.stick(role).move(x, y);
    return role;
  }

  /** Frees the stick of a finger that lifted or was cancelled. */
  up(pointerId: number): StickRole | null {
    const role = this.roleOf(pointerId);
    if (role) this.stick(role).release();
    return role;
  }

  clear(): void {
    this.move.release();
    this.aim.release();
  }

  /** Replaces the keyboard axis while the stick points somewhere. */
  applyMove(axis: Vec2): void {
    if (this.move.x === 0 && this.move.y === 0) return;
    axis.x = this.move.x;
    axis.y = this.move.y;
  }

  /**
   * A far point in the direction of the aim stick, or null when it is not aiming. It keeps
   * the last direction when the thumb returns to the center, so the beam does not jump.
   * The point is far so the player's own step does not bend the angle.
   */
  aimPoint(playerX: number, playerY: number, out: Vec2): Vec2 | null {
    if (!this.aim.active || !this.aim.hasDirection) return null;
    out.x = playerX + this.aim.lastX * TOUCH.aimReach;
    out.y = playerY + this.aim.lastY * TOUCH.aimReach;
    return out;
  }

  private stick(role: StickRole): Joystick {
    return role === 'move' ? this.move : this.aim;
  }

  private roleOf(pointerId: number): StickRole | null {
    if (this.move.pointerId === pointerId) return 'move';
    if (this.aim.pointerId === pointerId) return 'aim';
    return null;
  }
}
