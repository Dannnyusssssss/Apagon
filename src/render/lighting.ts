import { BALANCE } from '../data/balance';
import {
  createConeGlowSprite,
  createConeMaskSprite,
  createLightMaskSprite,
  createWarmGlowSprite,
} from './sprites';

const DARKNESS_COLOR = `rgba(0, 0, 0, ${String(BALANCE.lighting.darknessAlpha)})`;
const CONE_EDGES = {
  inner: BALANCE.flashlight.coneSoftInner,
  outer: BALANCE.flashlight.coneSoftOuter,
  fallback: BALANCE.flashlight.coneHalfAngle,
} as const;

/** World-to-device-pixel transform: device = world * scale + offset. */
export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** One light to cut out of the darkness. Position and radius are in world units. */
export interface LightShape {
  /** Round light, or a beam pointing at `angle` with soft sides. */
  kind: 'circle' | 'cone';
  x: number;
  y: number;
  radius: number;
  /** Beam direction in radians (cone only). */
  angle: number;
  /** How much darkness is removed at the center (0..1). */
  strength: number;
  /** Opacity of the warm glow added over the lit area (0 = none). */
  glowAlpha: number;
  /** Visibility polygon as x, y pairs in world units; the light is clipped to it. */
  polygon: Float32Array;
}

/**
 * Darkness layer: an offscreen canvas filled almost black every frame, with
 * each light cut out by a pre-rendered mask (round or cone) clipped to its
 * visibility polygon, so walls cast shadows.
 * Nothing is allocated per frame and no per-pixel work is done.
 */
export class Lighting {
  private readonly layer: HTMLCanvasElement;
  private readonly layerCtx: CanvasRenderingContext2D;
  private readonly mask = createLightMaskSprite();
  private readonly glow = createWarmGlowSprite();
  private readonly coneMask = createConeMaskSprite(CONE_EDGES);
  private readonly coneGlow = createConeGlowSprite(CONE_EDGES);

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

  /** Draws the darkness, with the first `count` lights cut out, over `target`. */
  draw(
    target: CanvasRenderingContext2D,
    view: ViewTransform,
    lights: readonly LightShape[],
    count: number,
  ): void {
    const ctx = this.layerCtx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.layer.width, this.layer.height);
    ctx.fillStyle = DARKNESS_COLOR;
    ctx.fillRect(0, 0, this.layer.width, this.layer.height);

    for (let i = 0; i < count; i++) {
      const light = lights[i];
      if (!light) continue;
      ctx.save();
      ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
      tracePolygon(ctx, light.polygon);
      ctx.clip();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = light.strength;
      this.stamp(ctx, light, false);
      ctx.restore();
    }

    for (let i = 0; i < count; i++) {
      const light = lights[i];
      if (!light || light.glowAlpha <= 0) continue;
      target.save();
      target.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
      tracePolygon(target, light.polygon);
      target.clip();
      target.globalCompositeOperation = 'lighter';
      target.globalAlpha = light.glowAlpha;
      this.stamp(target, light, true);
      target.restore();
    }

    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.drawImage(this.layer, 0, 0);
    target.restore();
  }

  /** Draws the mask (or glow) sprite of a light, turned toward its angle if it is a cone. */
  private stamp(ctx: CanvasRenderingContext2D, light: LightShape, glow: boolean): void {
    const r = light.radius;
    if (light.kind === 'circle') {
      ctx.drawImage(glow ? this.glow : this.mask, light.x - r, light.y - r, r * 2, r * 2);
      return;
    }
    ctx.translate(light.x, light.y);
    ctx.rotate(light.angle);
    ctx.drawImage(glow ? this.coneGlow : this.coneMask, -r, -r, r * 2, r * 2);
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
