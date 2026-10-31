import { BALANCE } from '../data/balance';
import { TEXTS } from '../data/texts';
import { isBatteryLow } from '../game/battery';
import { missingKeys } from '../game/items';
import type { Prompt } from '../game/systems/interact';
import type { World } from '../game/world';
import { createVignetteSprite } from './sprites';

const COLORS = {
  panel: 'rgba(0, 0, 0, 0.7)',
  text: '#f2f2f2',
  warning: '#ffb4a6',
  batteryFill: '#e8d9a8',
  batteryLow: '#ff7a66',
  batteryFrame: '#f2f2f2',
  key: '#e0b34f',
} as const;

/** "Enemy near" text and icon appear above this level (the vignette starts earlier). */
const NEAR_TEXT_THRESHOLD = 0.35;
/** Max opacity of the edge vignette when the enemy is touching. */
const VIGNETTE_MAX_ALPHA = 0.75;
/** Base font size in CSS pixels. */
const FONT_SIZE = 16;

/**
 * Screen-space HUD: battery, keys, "enemy near" and the E prompt.
 * Every signal has text or a shape, not only a color.
 * Strings are rebuilt only when the value they show changes.
 */
export class Hud {
  private readonly vignette = createVignetteSprite();
  private font = '';
  private unit = 1;

  private batteryPercent = -1;
  private batteryState = '';
  private batteryText = '';
  private keysCount = -1;
  private keysText = '';
  private missingCount = -1;
  private missingText = '';
  private promptText = '';
  private promptWidth = 0;

  resize(dpr: number): void {
    this.unit = dpr;
    this.font = `${String(Math.round(FONT_SIZE * dpr))}px system-ui, sans-serif`;
    // Force the prompt to be measured again with the new font.
    this.promptText = '';
  }

  draw(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (world.enemyNear > 0) {
      ctx.globalAlpha = world.enemyNear * VIGNETTE_MAX_ALPHA;
      ctx.drawImage(this.vignette, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    ctx.font = this.font;
    ctx.textBaseline = 'middle';
    this.drawPanel(ctx, world);
    this.drawPrompt(ctx, world, width, height);
    this.drawSound(ctx, world.settings.muted, height);
    ctx.restore();
  }

  private drawPanel(ctx: CanvasRenderingContext2D, world: World): void {
    const u = this.unit;
    const pad = 12 * u;
    const line = 26 * u;
    const near = world.enemyNear >= NEAR_TEXT_THRESHOLD;
    const lines = near ? 3 : 2;
    const x = 12 * u;
    const y = 12 * u;

    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, 230 * u, pad * 2 + line * lines - 6 * u);

    const iconX = x + pad;
    const textX = iconX + 34 * u;
    let rowY = y + pad + line / 2 - 3 * u;

    this.drawBatteryIcon(ctx, world, iconX, rowY);
    ctx.fillStyle = isBatteryLow(world.flashlight.battery, BALANCE.battery.lowThreshold)
      ? COLORS.warning
      : COLORS.text;
    ctx.fillText(this.batteryLabel(world), textX, rowY);

    rowY += line;
    this.drawKeyIcon(ctx, iconX, rowY);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(this.keysLabel(world), textX, rowY);

    if (near) {
      rowY += line;
      this.drawEyeIcon(ctx, iconX, rowY);
      ctx.fillStyle = COLORS.warning;
      ctx.fillText(TEXTS.hud.enemyNear, textX, rowY);
    }
  }

  private drawBatteryIcon(ctx: CanvasRenderingContext2D, world: World, x: number, y: number): void {
    const u = this.unit;
    const w = 24 * u;
    const h = 12 * u;
    const charge = world.flashlight.battery;
    const low = isBatteryLow(charge, BALANCE.battery.lowThreshold);
    ctx.strokeStyle = COLORS.batteryFrame;
    ctx.lineWidth = 1.5 * u;
    ctx.strokeRect(x, y - h / 2, w, h);
    ctx.fillStyle = COLORS.batteryFrame;
    ctx.fillRect(x + w, y - h / 4, 2.5 * u, h / 2);
    ctx.fillStyle = low ? COLORS.batteryLow : COLORS.batteryFill;
    ctx.fillRect(x + 2 * u, y - h / 2 + 2 * u, (w - 4 * u) * charge, h - 4 * u);
    if (low) {
      // Exclamation mark next to the icon, so low battery is not shown by color alone.
      ctx.fillStyle = COLORS.batteryLow;
      ctx.fillRect(x - 7 * u, y - h / 2, 3 * u, h * 0.6);
      ctx.fillRect(x - 7 * u, y + h * 0.25, 3 * u, 3 * u);
    }
  }

  private drawKeyIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const u = this.unit;
    ctx.strokeStyle = COLORS.key;
    ctx.fillStyle = COLORS.key;
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.arc(x + 6 * u, y, 5 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(x + 11 * u, y - 1.5 * u, 14 * u, 3 * u);
    ctx.fillRect(x + 19 * u, y, 3 * u, 5 * u);
  }

  private drawEyeIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const u = this.unit;
    ctx.strokeStyle = COLORS.warning;
    ctx.fillStyle = COLORS.warning;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.ellipse(x + 12 * u, y, 11 * u, 6 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 12 * u, y, 3 * u, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Bottom-left sound state: speaker icon (crossed when off) and text. */
  private drawSound(ctx: CanvasRenderingContext2D, muted: boolean, height: number): void {
    const u = this.unit;
    const x = 12 * u;
    const h = 30 * u;
    const y = height - h - 12 * u;
    const cy = y + h / 2;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, 170 * u, h);

    const ix = x + 10 * u;
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.moveTo(ix, cy - 4 * u);
    ctx.lineTo(ix + 5 * u, cy - 4 * u);
    ctx.lineTo(ix + 11 * u, cy - 9 * u);
    ctx.lineTo(ix + 11 * u, cy + 9 * u);
    ctx.lineTo(ix + 5 * u, cy + 4 * u);
    ctx.lineTo(ix, cy + 4 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    if (muted) {
      ctx.moveTo(ix + 15 * u, cy - 5 * u);
      ctx.lineTo(ix + 23 * u, cy + 5 * u);
      ctx.moveTo(ix + 23 * u, cy - 5 * u);
      ctx.lineTo(ix + 15 * u, cy + 5 * u);
    } else {
      ctx.arc(ix + 12 * u, cy, 8 * u, -Math.PI / 4, Math.PI / 4);
    }
    ctx.stroke();

    ctx.fillText(muted ? TEXTS.hud.soundOff : TEXTS.hud.soundOn, ix + 30 * u, cy);
  }

  private drawPrompt(
    ctx: CanvasRenderingContext2D,
    world: World,
    width: number,
    height: number,
  ): void {
    const text = this.promptLabel(world.interact.prompt, missingKeys(world.inventory));
    if (text === '') return;
    if (this.promptText !== text) {
      this.promptText = text;
      this.promptWidth = ctx.measureText(text).width;
    }
    const u = this.unit;
    const padX = 14 * u;
    const h = 34 * u;
    const w = this.promptWidth + padX * 2;
    const x = (width - w) / 2;
    const y = height - h - 28 * u;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(text, x + padX, y + h / 2);
  }

  private batteryLabel(world: World): string {
    const charge = world.flashlight.battery;
    const percent = Math.ceil(charge * 100);
    const state =
      charge <= 0 ? 'empty' : isBatteryLow(charge, BALANCE.battery.lowThreshold) ? 'low' : 'ok';
    if (percent !== this.batteryPercent || state !== this.batteryState) {
      this.batteryPercent = percent;
      this.batteryState = state;
      this.batteryText =
        state === 'empty'
          ? TEXTS.hud.batteryEmpty
          : state === 'low'
            ? `${TEXTS.hud.batteryLow} · ${String(percent)} %`
            : `${TEXTS.hud.battery}${String(percent)} %`;
    }
    return this.batteryText;
  }

  private keysLabel(world: World): string {
    const { keys, keysRequired } = world.inventory;
    if (keys !== this.keysCount) {
      this.keysCount = keys;
      this.keysText = `${TEXTS.hud.keys}${String(keys)}/${String(keysRequired)}`;
    }
    return this.keysText;
  }

  private promptLabel(prompt: Prompt, missing: number): string {
    switch (prompt) {
      case 'pickKey':
        return TEXTS.hud.pickKey;
      case 'pickBattery':
        return TEXTS.hud.pickBattery;
      case 'openDoor':
        return TEXTS.hud.openDoor;
      case 'doorLocked':
        if (missing !== this.missingCount) {
          this.missingCount = missing;
          this.missingText = TEXTS.hud.missingKeys(missing);
        }
        return this.missingText;
      case 'none':
        return '';
    }
  }
}
