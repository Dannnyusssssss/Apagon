export interface Enemy {
  x: number;
  y: number;
  /** Position at the previous logic step, for render interpolation. */
  prevX: number;
  prevY: number;
  readonly radius: number;
  readonly speed: number;
  /** True while the flashlight touches the enemy. */
  lit: boolean;
  /** Seconds left standing still after leaving the light. */
  freezeTimer: number;
  /** Seconds left before the enemy starts moving in this run. */
  startTimer: number;
}

export function createEnemy(radius: number, speed: number): Enemy {
  return {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    radius,
    speed,
    lit: false,
    freezeTimer: 0,
    startTimer: 0,
  };
}

export function placeEnemy(enemy: Enemy, x: number, y: number, startDelay: number): void {
  enemy.x = x;
  enemy.y = y;
  enemy.prevX = x;
  enemy.prevY = y;
  enemy.lit = false;
  enemy.freezeTimer = 0;
  enemy.startTimer = startDelay;
}
