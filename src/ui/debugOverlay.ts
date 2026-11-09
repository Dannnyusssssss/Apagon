import { FrameStats } from '../core/frameStats';
import { BALANCE } from '../data/balance';
import { areaAt } from '../game/rooms';
import type { World } from '../game/world';

/** What the app knows about the frame, besides the world. */
export interface DebugFrameInfo {
  readonly state: string;
  readonly level: string;
  /** Monitor refreshes per drawn frame. */
  readonly divisor: number;
  /** True while the game is moving: time on a menu or in pause is not a stall. */
  readonly playing: boolean;
}

/** How often the text is refreshed, so the overlay itself costs almost nothing. */
const REFRESH_MS = 250;

/**
 * Developer overlay, only created when debug mode is on (see docs/DEBUG.md).
 * Shows FPS, stalls, logic steps per second, the app state and a few world values.
 */
export class DebugOverlay {
  private readonly root: HTMLPreElement;
  private readonly stats = new FrameStats(
    BALANCE.debug.longFrameMs,
    BALANCE.debug.worstFrameWindowMs,
  );
  private frames = 0;
  private steps = 0;
  private lastRefresh = 0;

  constructor(
    container: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.root = document.createElement('pre');
    this.root.className = 'debug-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    container.append(this.root);
  }

  countStep(): void {
    this.steps++;
  }

  frame(now: number, world: World, info: DebugFrameInfo): void {
    this.stats.frame(now, info.playing);
    this.frames++;
    if (this.lastRefresh === 0) this.lastRefresh = now;
    const elapsed = now - this.lastRefresh;
    if (elapsed < REFRESH_MS) return;

    const { player, nearestEnemy: enemy, flashlight, room } = world;
    const t = room.tileSize;
    const col = Math.floor(player.x / t);
    const row = Math.floor(player.y / t);
    const seconds = elapsed / 1000;
    this.root.textContent = [
      `fps ${(this.frames / seconds).toFixed(0)} · steps/s ${(this.steps / seconds).toFixed(0)}`,
      `worst ${this.stats.worstMs.toFixed(0)} ms · long frames ${String(this.stats.longFrames)}`,
      `canvas ${String(this.canvas.width)}×${String(this.canvas.height)} · draw every ${String(info.divisor)}`,
      `level ${info.level} · enemies ${String(world.enemies.length)}`,
      `state ${info.state} · world ${world.status} · t ${world.elapsedSeconds.toFixed(1)}s`,
      `area ${areaAt(room, col, row) ?? '-'} · tile ${String(col)},${String(row)}`,
      `battery ${(flashlight.battery * 100).toFixed(0)}% · light ${flashlight.on ? 'on' : 'off'} · strength ${flashlight.strength.toFixed(2)}`,
      `mode ${world.settings.classicLight ? 'classic' : 'cone'} · mouse ${String(world.pointerAiming)} · aim ${String(Math.round((flashlight.aim * 180) / Math.PI))}° · enemy speed ${String(enemy.speed)}`,
      `enemy lit ${String(enemy.lit)} · freeze ${enemy.freezeTimer.toFixed(2)} · start ${enemy.startTimer.toFixed(2)}`,
      `near ${world.enemyNear.toFixed(2)} · keys ${String(world.inventory.keys)}/${String(world.inventory.keysRequired)}`,
      `god ${String(world.settings.godMode)} · muted ${String(world.settings.muted)}`,
    ].join('\n');
    this.frames = 0;
    this.steps = 0;
    this.lastRefresh = now;
  }
}
