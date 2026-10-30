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
