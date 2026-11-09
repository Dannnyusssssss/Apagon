import { BALANCE } from '../data/balance';
import { TOUCH } from '../data/controls';
import type { ExitKind } from '../data/levels';
import { TEXTS } from '../data/texts';
import { isBatteryLow } from '../game/battery';
import { missingKeys } from '../game/items';
import type { Prompt } from '../game/systems/interact';
import type { World } from '../game/world';
import { promptText } from '../ui/prompts';
import type { SafeInsets } from '../ui/safeArea';
import { createSideShadeSprite, createVignetteSprite } from './sprites';

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
/** Gap between the HUD and the edge of the safe area. */
const MARGIN = 12;
/** The full sound indicator, with its text. */
const SOUND_WIDTH = 170;
const SOUND_HEIGHT = 30;

/**
 * Screen-space HUD: battery, keys, "enemy near" and the E prompt.
 * Every signal has text or a shape, not only a color.
 * Strings are rebuilt only when the value they show changes.
 */
export class Hud {
  private readonly vignette = createVignetteSprite();
  private readonly sideShade = createSideShadeSprite();
  private font = '';
  private unit = 1;

  private batteryPercent = -1;
  private batteryState = '';
  private batteryText = '';
  private keysCount = -1;
  private keysNeeded = -1;
  private keysText = '';
  private exit: ExitKind = 'door';
  private touch = false;
  private readonly insets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private promptKind: Prompt = 'none';
  private promptMissing = -1;
  private promptText = '';
  private promptWidth = 0;

  /** The prompt names the exit of the current level. */
  setExit(exit: ExitKind): void {
    this.exit = exit;
    this.promptMissing = -1;
  }

  /** With touch controls the HUD drops the keys and keeps clear of the buttons. */
  setTouch(touch: boolean): void {
    this.touch = touch;
    this.promptMissing = -1;
  }

  setInsets(insets: SafeInsets): void {
    this.insets.top = insets.top;
    this.insets.right = insets.right;
    this.insets.bottom = insets.bottom;
    this.insets.left = insets.left;
  }

  resize(dpr: number): void {
    this.unit = dpr;
    this.font = `${String(Math.round(FONT_SIZE * dpr))}px system-ui, sans-serif`;
    // Force the prompt to be measured again with the new font.
    this.promptMissing = -1;
  }

  draw(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (world.enemyNear > 0) {
      ctx.globalAlpha = world.enemyNear * VIGNETTE_MAX_ALPHA;
      ctx.drawImage(this.vignette, 0, 0, width, height);
      this.drawSideShade(ctx, world, width, height);
      ctx.globalAlpha = 1;
    }

    ctx.font = this.font;
    ctx.textBaseline = 'middle';
    this.drawPanel(ctx, world);
    this.drawPrompt(ctx, world, width, height);
    this.drawSound(ctx, world.settings.muted, width, height);
    ctx.restore();
  }

  /**
   * Darker on the side the enemy comes from, only while the "enemy near" vignette shows.
   * The shade is stretched so its dark edge always lands on the screen border in that
   * direction. Smooth changes only: no pulses or flashes.
   */
  private drawSideShade(
    ctx: CanvasRenderingContext2D,
    world: World,
    width: number,
    height: number,
  ): void {
    const { x, y } = world.enemyDirection;
    const reach = Math.abs(x) * (width / 2) + Math.abs(y) * (height / 2);
    const span = Math.sqrt(width * width + height * height);
    ctx.globalAlpha = world.enemyNear * BALANCE.warning.directionalMaxAlpha;
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.atan2(y, x));
    ctx.drawImage(this.sideShade, -reach, -span / 2, reach * 2, span);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawPanel(ctx: CanvasRenderingContext2D, world: World): void {
    const u = this.unit;
    const pad = 12 * u;
    const line = 26 * u;
    const near = world.enemyNear >= NEAR_TEXT_THRESHOLD;
    const lines = near ? 3 : 2;
    const x = (MARGIN + this.insets.left) * u;
    const y = (MARGIN + this.insets.top) * u;

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

  /**
   * Sound state: speaker icon, crossed when off. Bottom-left with its text; with touch
   * controls that corner is for the thumbs, so only the icon, under the pause button.
   */
  private drawSound(
    ctx: CanvasRenderingContext2D,
    muted: boolean,
    width: number,
    height: number,
  ): void {
    const u = this.unit;
    const { insets, touch } = this;
    const h = SOUND_HEIGHT * u;
    const panelWidth = (touch ? TOUCH.pauseSize : SOUND_WIDTH) * u;
    const x = touch ? width - panelWidth - (MARGIN + insets.right) * u : (MARGIN + insets.left) * u;
    const y = touch
      ? (MARGIN + insets.top + TOUCH.pauseSize + 8) * u
      : height - h - (MARGIN + insets.bottom) * u;
    const cy = y + h / 2;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, panelWidth, h);

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

    if (!touch) ctx.fillText(muted ? TEXTS.hud.soundOff : TEXTS.hud.soundOn, ix + 30 * u, cy);
  }

  private drawPrompt(
    ctx: CanvasRenderingContext2D,
    world: World,
    width: number,
    height: number,
  ): void {
    this.updatePrompt(ctx, world);
    const text = this.promptText;
    if (text === '') return;
    const u = this.unit;
    const padX = 14 * u;
    const h = 34 * u;
    const w = this.promptWidth + padX * 2;
    const x = (width - w) / 2;
    const y = this.promptY(width, height, w, h);
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
    if (keys !== this.keysCount || keysRequired !== this.keysNeeded) {
      this.keysCount = keys;
      this.keysNeeded = keysRequired;
      this.keysText = `${TEXTS.hud.keys}${String(keys)}/${String(keysRequired)}`;
    }
    return this.keysText;
  }

  /** Builds and measures the prompt only when what it says changes. */
  private updatePrompt(ctx: CanvasRenderingContext2D, world: World): void {
    const prompt = world.interact.prompt;
    const missing = missingKeys(world.inventory);
    if (prompt === this.promptKind && missing === this.promptMissing) return;
    this.promptKind = prompt;
    this.promptMissing = missing;
    this.promptText = promptText(prompt, missing, this.exit, this.touch);
    this.promptWidth = ctx.measureText(this.promptText).width;
  }

  /** Near the bottom, or higher when the screen is too narrow to fit it beside what is there. */
  private promptY(width: number, height: number, w: number, h: number): number {
    const u = this.unit;
    const { insets, touch } = this;
    const bottom = height - insets.bottom * u;
    // Checked on both sides: the prompt is centered and the buttons can be on either one.
    const taken = touch ? TOUCH.buttonsWidth : MARGIN + SOUND_WIDTH + 8;
    const side = (taken + Math.max(insets.left, insets.right)) * u;
    if (w <= width - 2 * side) return bottom - h - 28 * u;
    const below = touch ? TOUCH.buttonsHeight : MARGIN + SOUND_HEIGHT;
    return bottom - h - (below + 8) * u;
  }
}
