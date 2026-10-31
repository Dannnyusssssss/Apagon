export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Writes (x, y) into `out`, scaled down to length 1 if it is longer. */
export function limitToUnit(x: number, y: number, out: Vec2): Vec2 {
  const lengthSq = x * x + y * y;
  if (lengthSq > 1) {
    const inv = 1 / Math.sqrt(lengthSq);
    out.x = x * inv;
    out.y = y * inv;
  } else {
    out.x = x;
    out.y = y;
  }
  return out;
}

const TURN = Math.PI * 2;

/** Signed difference from angle `from` to `to` the short way round, in -PI..PI. */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % TURN;
  if (delta > Math.PI) delta -= TURN;
  else if (delta < -Math.PI) delta += TURN;
  return delta;
}

/** Turns `current` toward `target` by at most `maxTurn` radians, the short way round. */
export function turnToward(current: number, target: number, maxTurn: number): number {
  const delta = angleDelta(current, target);
  return current + clamp(delta, -maxTurn, maxTurn);
}

/** Interpolates between two angles the short way round. */
export function lerpAngle(a: number, b: number, t: number): number {
  return a + angleDelta(a, b) * t;
}
