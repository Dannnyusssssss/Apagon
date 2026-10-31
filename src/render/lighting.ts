import { BALANCE } from '../data/balance';
import { createLightMaskSprite, createWarmGlowSprite } from './sprites';

const DARKNESS_COLOR = `rgba(0, 0, 0, ${String(BALANCE.lighting.darknessAlpha)})`;

/** World-to-device-pixel transform: device = world * scale + offset. */
export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** One light to cut out of the darkness. Position and radius are in world units. */
export interface LightShape {
  x: number;
  y: number;
  radius: number;
  /** How much darkness is removed at the center (0..1). */
  strength: number;
  /** Opacity of the warm glow added over the lit area (0 = none). */
  glowAlpha: number;
  /** Visibility polygon as x, y pairs in world units; the light is clipped to it. */
  polygon: Float32Array;
}

/**
 * Darkness layer: an offscreen canvas filled almost black every frame,
 * with the light cut out by a pre-rendered radial mask clipped to the
 * visibility polygon, so walls cast shadows.
 * Nothing is allocated per frame and no per-pixel work is done.
 */
export class Lighting {
  private readonly layer: HTMLCanvasElement;
  private readonly layerCtx: CanvasRenderingContext2D;
  private readonly mask = createLightMaskSprite();
  private readonly glow = createWarmGlowSprite();

  constructor() {
    this.layer = document.createElement('canvas');
    const ctx = this.layer.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.layerCtx = ctx;
  }

  resize(widthPx: number, heightPx: number): void {
    this.layer.width = widthPx;
    this.layer.height = heightPx;
  }

  /** Draws the darkness, with the light cut out, over `target`. */
  draw(target: CanvasRenderingContext2D, view: ViewTransform, light: LightShape): void {
    const ctx = this.layerCtx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.layer.width, this.layer.height);
    ctx.fillStyle = DARKNESS_COLOR;
    ctx.fillRect(0, 0, this.layer.width, this.layer.height);

    ctx.save();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    tracePolygon(ctx, light.polygon);
    ctx.clip();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = light.strength;
    stamp(ctx, this.mask, light.x, light.y, light.radius);
    ctx.restore();

    if (light.glowAlpha > 0) {
      target.save();
      target.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
      tracePolygon(target, light.polygon);
      target.clip();
      target.globalCompositeOperation = 'lighter';
      target.globalAlpha = light.glowAlpha;
      stamp(target, this.glow, light.x, light.y, light.radius);
      target.restore();
    }

    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.drawImage(this.layer, 0, 0);
    target.restore();
  }
}

function tracePolygon(ctx: CanvasRenderingContext2D, polygon: Float32Array): void {
  ctx.beginPath();
  const count = polygon.length >> 1;
  for (let i = 0; i < count; i++) {
    const x = polygon[i * 2] ?? 0;
    const y = polygon[i * 2 + 1] ?? 0;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function stamp(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
}
