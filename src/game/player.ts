export interface Player {
  x: number;
  y: number;
  /** Position at the previous logic step, for render interpolation. */
  prevX: number;
  prevY: number;
  /** Unit vector of the last movement direction: where the player looks and points the flashlight. */
  facingX: number;
  facingY: number;
  readonly radius: number;
  readonly speed: number;
}

export function createPlayer(x: number, y: number, radius: number, speed: number): Player {
  return { x, y, prevX: x, prevY: y, facingX: 0, facingY: 1, radius, speed };
}
