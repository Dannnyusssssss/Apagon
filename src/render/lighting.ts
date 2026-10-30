import { BALANCE } from '../data/balance';
import { createLightMaskSprite, createWarmGlowSprite } from './sprites';

const DARKNESS_COLOR = `rgba(0, 0, 0, ${String(BALANCE.lighting.darknessAlpha)})`;

/**
 * Darkness layer: an offscreen canvas filled almost black every frame,
 * with the flashlight cut out by a pre-rendered radial mask.
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

  /**
   * Draws the darkness over `target`. Coordinates and radii are in device pixels.
   */
  draw(
    target: CanvasRenderingContext2D,
    lightX: number,
    lightY: number,
    pixelsPerUnit: number,
    flashlightOn: boolean,
  ): void {
    const ctx = this.layerCtx;
    const w = this.layer.width;
    const h = this.layer.height;
    const cfg = BALANCE.flashlight;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = DARKNESS_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'destination-out';
    if (flashlightOn) {
      this.stamp(ctx, this.mask, lightX, lightY, cfg.radius * pixelsPerUnit);
    } else {
      ctx.globalAlpha = cfg.offHaloStrength;
      this.stamp(ctx, this.mask, lightX, lightY, cfg.offHaloRadius * pixelsPerUnit);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';

    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    if (flashlightOn) {
      target.globalCompositeOperation = 'lighter';
      target.globalAlpha = cfg.warmGlowAlpha;
      this.stamp(target, this.glow, lightX, lightY, cfg.radius * pixelsPerUnit);
      target.globalCompositeOperation = 'source-over';
      target.globalAlpha = 1;
    }
    target.drawImage(this.layer, 0, 0);
    target.restore();
  }

  private stamp(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLCanvasElement,
    x: number,
    y: number,
    radius: number,
  ): void {
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  }
}
