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

/** Angles of the soft side edges of the cone beam, in radians from its axis. */
export interface ConeEdges {
  /** Full light up to this angle. */
  readonly inner: number;
  /** No light from this angle on. */
  readonly outer: number;
  /** Hard edge used when the browser has no conic gradients. */
  readonly fallback: number;
}

/**
 * Cone version of a round light sprite, pointing right (angle 0): the radial
 * fade times a side fade from `inner` to `outer`. Built once with gradients only.
 */
function coneFrom(round: HTMLCanvasElement, edges: ConeEdges): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(LIGHT_SPRITE_SIZE);
  const r = LIGHT_SPRITE_SIZE / 2;
  ctx.drawImage(round, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  if (typeof ctx.createConicGradient === 'function') {
    // Fraction f of the turn is the angle -PI + 2 PI f, so the beam axis sits at 0.5.
    const inner = edges.inner / (Math.PI * 2);
    const outer = edges.outer / (Math.PI * 2);
    const sides = ctx.createConicGradient(-Math.PI, r, r);
    sides.addColorStop(0, 'rgba(0, 0, 0, 0)');
    sides.addColorStop(0.5 - outer, 'rgba(0, 0, 0, 0)');
    sides.addColorStop(0.5 - inner, 'rgba(0, 0, 0, 1)');
    sides.addColorStop(0.5 + inner, 'rgba(0, 0, 0, 1)');
    sides.addColorStop(0.5 + outer, 'rgba(0, 0, 0, 0)');
    sides.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sides;
    ctx.fillRect(0, 0, LIGHT_SPRITE_SIZE, LIGHT_SPRITE_SIZE);
  } else {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(r, r);
    ctx.arc(r, r, r, -edges.fallback, edges.fallback);
    ctx.closePath();
    ctx.fill();
  }
  return canvas;
}

/** Darkness cut-out for the cone beam (see `createLightMaskSprite`). */
export function createConeMaskSprite(edges: ConeEdges): HTMLCanvasElement {
  return coneFrom(createLightMaskSprite(), edges);
}

/** Warm tint for the cone beam (see `createWarmGlowSprite`). */
export function createConeGlowSprite(edges: ConeEdges): HTMLCanvasElement {
  return coneFrom(createWarmGlowSprite(), edges);
}

/** Body radius inside the player sprite box, as a fraction of half the box. */
const PLAYER_BODY = 0.92;

/**
 * Face layout, as fractions of the drawn body radius (shared with the renderer,
 * which draws the pupils every frame so they can look where the player walks).
 */
export const FACE = {
  eyeX: 0.34,
  eyeY: 0.06,
  /** How far the pupils move toward the facing direction. */
  look: 0.08,
  pupil: { calm: 0.1, worried: 0.09, scared: 0.065 },
} as const;

export type FaceMood = keyof typeof FACE.pupil;

/** Player body seen from above: a warm round character with a tuft of dark hair. */
export function createPlayerSprite(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(PLAYER_SPRITE_SIZE);
  const c = PLAYER_SPRITE_SIZE / 2;
  const r = c * PLAYER_BODY;

  const body = ctx.createRadialGradient(c * 0.8, c * 0.75, r * 0.1, c, c, r);
  body.addColorStop(0, '#f6e7cf');
  body.addColorStop(0.6, '#d8b98e');
  body.addColorStop(1, '#6b5238');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  // Hair: a dark cap over the top of the head with a small fringe.
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  const hair = ctx.createLinearGradient(0, c - r, 0, c - r * 0.2);
  hair.addColorStop(0, '#1d140d');
  hair.addColorStop(1, '#3a2617');
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(c - r, c - r * 0.25);
  ctx.quadraticCurveTo(c - r * 0.55, c - r * 0.42, c - r * 0.2, c - r * 0.3);
  ctx.quadraticCurveTo(c + r * 0.05, c - r * 0.5, c + r * 0.3, c - r * 0.32);
  ctx.quadraticCurveTo(c + r * 0.65, c - r * 0.45, c + r, c - r * 0.2);
  ctx.lineTo(c + r, c - r);
  ctx.lineTo(c - r, c - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = PLAYER_SPRITE_SIZE * 0.035;
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.6)';
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
  return canvas;
}

/**
 * Face for a mood: eye whites (pupils are drawn live), brows and mouth.
 * `blink` draws closed eyes instead. Same box as the body sprite.
 */
export function createFaceSprite(mood: FaceMood, blink: boolean): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(PLAYER_SPRITE_SIZE);
  const c = PLAYER_SPRITE_SIZE / 2;
  const r = c * PLAYER_BODY;
  const ink = '#2a1a10';
  const eyeR = r * (mood === 'scared' ? 0.2 : mood === 'worried' ? 0.17 : 0.15);
  const eyeY = c + r * FACE.eyeY;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const side of [-1, 1]) {
    const ex = c + side * r * FACE.eyeX;
    if (blink) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.arc(ex, eyeY - eyeR * 0.3, eyeR, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fbf6ec';
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.045;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeR, eyeR * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Brows: relaxed, raised in the middle (worried) or high and arched (scared).
    ctx.strokeStyle = ink;
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    const browY = eyeY - eyeR * 1.15 - r * 0.1;
    const inner = ex - side * eyeR * 0.9;
    const outer = ex + side * eyeR * 0.9;
    if (mood === 'calm') {
      ctx.moveTo(inner, browY);
      ctx.quadraticCurveTo(ex, browY - r * 0.06, outer, browY + r * 0.01);
    } else if (mood === 'worried') {
      ctx.moveTo(inner, browY - r * 0.1);
      ctx.lineTo(outer, browY + r * 0.04);
    } else {
      ctx.moveTo(inner, browY - r * 0.08);
      ctx.quadraticCurveTo(ex, browY - r * 0.2, outer, browY - r * 0.04);
    }
    ctx.stroke();
  }

  // Mouth: a small calm curve, a wavy worried line, or an open "o".
  const mouthY = c + r * 0.52;
  ctx.strokeStyle = ink;
  ctx.lineWidth = r * 0.065;
  ctx.beginPath();
  if (mood === 'calm') {
    ctx.moveTo(c - r * 0.16, mouthY);
    ctx.quadraticCurveTo(c, mouthY + r * 0.08, c + r * 0.16, mouthY);
    ctx.stroke();
  } else if (mood === 'worried') {
    ctx.moveTo(c - r * 0.2, mouthY + r * 0.02);
    ctx.quadraticCurveTo(c - r * 0.1, mouthY - r * 0.07, c, mouthY + r * 0.02);
    ctx.quadraticCurveTo(c + r * 0.1, mouthY + r * 0.1, c + r * 0.2, mouthY + r * 0.01);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#3b1c14';
    ctx.ellipse(c, mouthY + r * 0.02, r * 0.11, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // A drop of sweat on the side of the head.
    const dx = c + r * 0.72;
    const dy = c - r * 0.18;
    ctx.fillStyle = 'rgba(170, 215, 255, 0.95)';
    ctx.strokeStyle = 'rgba(60, 110, 160, 0.9)';
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    ctx.moveTo(dx, dy - r * 0.2);
    ctx.quadraticCurveTo(dx + r * 0.12, dy, dx, dy + r * 0.07);
    ctx.quadraticCurveTo(dx - r * 0.12, dy, dx, dy - r * 0.2);
    ctx.fill();
    ctx.stroke();
  }
  return canvas;
}

/** Flashlight state for its sprite: lit lens, weak amber lens, or dark lens. */
export type FlashlightLook = 'on' | 'low' | 'off';

/** Flashlight width / length in its sprite (pointing to +x). */
export const FLASHLIGHT_ASPECT = 0.4;

/** Handheld flashlight pointing to +x: metal handle, wider head, lens. */
export function createFlashlightSprite(look: FlashlightLook): HTMLCanvasElement {
  const w = 128;
  const h = Math.round(w * FLASHLIGHT_ASPECT);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  const cy = h / 2;

  const metal = ctx.createLinearGradient(0, cy - h * 0.3, 0, cy + h * 0.3);
  metal.addColorStop(0, '#9aa0aa');
  metal.addColorStop(0.45, '#4d525b');
  metal.addColorStop(1, '#22252b');
  ctx.fillStyle = metal;
  ctx.strokeStyle = '#111317';
  ctx.lineWidth = 3;
  // Handle.
  ctx.beginPath();
  ctx.rect(6, cy - h * 0.2, 72, h * 0.4);
  ctx.fill();
  ctx.stroke();
  // Grip rings.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  for (let x = 18; x < 66; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, cy - h * 0.2);
    ctx.lineTo(x, cy + h * 0.2);
    ctx.stroke();
  }
  // Head.
  ctx.fillStyle = metal;
  ctx.strokeStyle = '#111317';
  ctx.beginPath();
  ctx.moveTo(78, cy - h * 0.24);
  ctx.lineTo(112, cy - h * 0.42);
  ctx.lineTo(112, cy + h * 0.42);
  ctx.lineTo(78, cy + h * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Lens.
  const lens =
    look === 'on'
      ? ['#fffbe8', '#ffd98a']
      : look === 'low'
        ? ['#c98a3a', '#6e4318']
        : ['#3a3d44', '#1c1e22'];
  const g = ctx.createLinearGradient(110, 0, 124, 0);
  g.addColorStop(0, lens[0] ?? '#000');
  g.addColorStop(1, lens[1] ?? '#000');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(116, cy, 7, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
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

/**
 * Dark shade for the side the enemy comes from. Clear on the left half,
 * darkening toward the right edge; the HUD turns it toward the enemy.
 */
export function createSideShadeSprite(): HTMLCanvasElement {
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  const gradient = ctx.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0.5, 'rgba(20, 0, 5, 0)');
  gradient.addColorStop(0.8, 'rgba(20, 0, 5, 0.45)');
  gradient.addColorStop(1, 'rgba(15, 0, 4, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
