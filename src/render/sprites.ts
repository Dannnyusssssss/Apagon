/** Resolution of pre-rendered sprites; drawn scaled, so keep it generous. */
const LIGHT_SPRITE_SIZE = 512;
const PLAYER_SPRITE_SIZE = 128;

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  return [canvas, ctx];
}

/**
 * Radial mask used to cut the darkness: opaque center, soft edge.
 * Drawn with destination-out, alpha 1 removes the darkness completely.
 */
export function createLightMaskSprite(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(LIGHT_SPRITE_SIZE);
  const r = LIGHT_SPRITE_SIZE / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  gradient.addColorStop(0.45, 'rgba(0, 0, 0, 0.92)');
  gradient.addColorStop(0.75, 'rgba(0, 0, 0, 0.45)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIGHT_SPRITE_SIZE, LIGHT_SPRITE_SIZE);
  return canvas;
}

/** Warm tint added over the lit area. */
export function createWarmGlowSprite(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(LIGHT_SPRITE_SIZE);
  const r = LIGHT_SPRITE_SIZE / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(255, 214, 140, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 190, 110, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIGHT_SPRITE_SIZE, LIGHT_SPRITE_SIZE);
  return canvas;
}

/** Player: a disc with a soft rim light and a highlight. Drawn into a 1x1 unit box. */
export function createPlayerSprite(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(PLAYER_SPRITE_SIZE);
  const c = PLAYER_SPRITE_SIZE / 2;
  const r = c * 0.92;

  const body = ctx.createRadialGradient(c * 0.8, c * 0.75, r * 0.1, c, c, r);
  body.addColorStop(0, '#f4ecdc');
  body.addColorStop(0.55, '#b9a88c');
  body.addColorStop(1, '#4a4033');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = PLAYER_SPRITE_SIZE * 0.04;
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.55)';
  ctx.stroke();

  return canvas;
}
