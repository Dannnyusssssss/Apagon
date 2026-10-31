/** Resolution of pre-rendered sprites; drawn scaled, so keep it generous. */
const LIGHT_SPRITE_SIZE = 512;
const PLAYER_SPRITE_SIZE = 128;
const ENEMY_SPRITE_SIZE = 128;

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

/** Bumps along the enemy outline, so it does not read as a clean circle. */
const ENEMY_OUTLINE_POINTS = 18;
const ENEMY_OUTLINE_BUMPS = [1, 0.86, 0.97, 0.8, 1, 0.9, 0.78, 0.95, 0.85] as const;

/**
 * Enemy: a dark, ragged silhouette with a cold rim and two pale points.
 * Drawn into a 1x1 unit box. No explicit imagery: the shape suggests, it does not show.
 */
export function createEnemySprite(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(ENEMY_SPRITE_SIZE);
  const c = ENEMY_SPRITE_SIZE / 2;
  const r = c * 0.94;

  ctx.beginPath();
  for (let i = 0; i < ENEMY_OUTLINE_POINTS; i++) {
    const angle = (i / ENEMY_OUTLINE_POINTS) * Math.PI * 2;
    const bump = ENEMY_OUTLINE_BUMPS[i % ENEMY_OUTLINE_BUMPS.length] ?? 1;
    const x = c + Math.cos(angle) * r * bump;
    const y = c + Math.sin(angle) * r * bump;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const body = ctx.createRadialGradient(c, c * 0.9, r * 0.05, c, c, r);
  body.addColorStop(0, '#2b2236');
  body.addColorStop(0.6, '#120e18');
  body.addColorStop(1, '#050407');
  ctx.fillStyle = body;
  ctx.fill();

  ctx.lineWidth = ENEMY_SPRITE_SIZE * 0.035;
  ctx.strokeStyle = 'rgba(150, 170, 220, 0.4)';
  ctx.stroke();

  const eyeY = c * 0.86;
  const eyeR = r * 0.09;
  for (const side of [-1, 1]) {
    const eyeX = c + side * r * 0.3;
    const eye = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeR * 2.2);
    eye.addColorStop(0, 'rgba(230, 236, 255, 0.95)');
    eye.addColorStop(0.45, 'rgba(180, 196, 240, 0.45)');
    eye.addColorStop(1, 'rgba(180, 196, 240, 0)');
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

const ITEM_SPRITE_SIZE = 96;
const DOOR_SPRITE_SIZE = 96;

/** Key: a warm metal ring with a shaft and two teeth. Drawn into a 1x1 unit box. */
export function createKeySprite(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(ITEM_SPRITE_SIZE);
  const s = ITEM_SPRITE_SIZE;

  const glow = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  glow.addColorStop(0, 'rgba(255, 210, 120, 0.35)');
  glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, s, s);

  const metal = ctx.createLinearGradient(0, s * 0.3, 0, s * 0.7);
  metal.addColorStop(0, '#fff1c4');
  metal.addColorStop(0.5, '#e0b34f');
  metal.addColorStop(1, '#8a6420');
  ctx.strokeStyle = metal;
  ctx.fillStyle = metal;
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.arc(s * 0.3, s * 0.5, s * 0.14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillRect(s * 0.42, s * 0.46, s * 0.4, s * 0.08);
  ctx.fillRect(s * 0.66, s * 0.5, s * 0.06, s * 0.14);
  ctx.fillRect(s * 0.76, s * 0.5, s * 0.06, s * 0.1);
  return canvas;
}

/** Battery: a green cell with a bright cap and a "+" mark. Drawn into a 1x1 unit box. */
export function createBatterySprite(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(ITEM_SPRITE_SIZE);
  const s = ITEM_SPRITE_SIZE;

  const glow = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  glow.addColorStop(0, 'rgba(150, 255, 170, 0.3)');
  glow.addColorStop(1, 'rgba(150, 255, 170, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, s, s);

  const body = ctx.createLinearGradient(s * 0.3, 0, s * 0.7, 0);
  body.addColorStop(0, '#1f5a32');
  body.addColorStop(0.45, '#5fd384');
  body.addColorStop(1, '#16402a');
  ctx.fillStyle = body;
  ctx.fillRect(s * 0.32, s * 0.24, s * 0.36, s * 0.58);
  ctx.fillStyle = '#d9e6dc';
  ctx.fillRect(s * 0.42, s * 0.16, s * 0.16, s * 0.08);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(s * 0.46, s * 0.36, s * 0.08, s * 0.2);
  ctx.fillRect(s * 0.4, s * 0.42, s * 0.2, s * 0.08);
  return canvas;
}

/**
 * Exit door seen from above: wooden planks with a lock.
 * `ready` paints the lock glowing (all keys collected); the HUD also says it in text.
 */
export function createDoorSprite(ready: boolean): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(DOOR_SPRITE_SIZE);
  const s = DOOR_SPRITE_SIZE;

  const wood = ctx.createLinearGradient(0, 0, s, s);
  wood.addColorStop(0, '#7a5232');
  wood.addColorStop(1, '#3e2716');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = s * 0.03;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((s * i) / 4, 0);
    ctx.lineTo((s * i) / 4, s);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 220, 170, 0.35)';
  ctx.lineWidth = s * 0.05;
  ctx.strokeRect(s * 0.04, s * 0.04, s * 0.92, s * 0.92);

  const c = s / 2;
  if (ready) {
    const halo = ctx.createRadialGradient(c, c, 0, c, c, s * 0.3);
    halo.addColorStop(0, 'rgba(255, 230, 140, 0.8)');
    halo.addColorStop(1, 'rgba(255, 230, 140, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, s, s);
  }
  ctx.fillStyle = ready ? '#ffe08a' : '#9a9a9a';
  ctx.beginPath();
  ctx.arc(c, c, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(c - s * 0.02, c - s * 0.05, s * 0.04, s * 0.1);
  return canvas;
}

/** Dark edge vignette for the "enemy near" signal. Stretched over the screen. */
export function createVignetteSprite(): HTMLCanvasElement {
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, r * 0.45, r, r, r * 1.05);
  gradient.addColorStop(0, 'rgba(30, 0, 8, 0)');
  gradient.addColorStop(0.6, 'rgba(30, 0, 8, 0.55)');
  gradient.addColorStop(1, 'rgba(20, 0, 5, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
