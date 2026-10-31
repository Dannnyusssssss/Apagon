import { createCamera, followTarget } from '../core/camera';
import { lerp } from '../core/math';
import { BALANCE } from '../data/balance';
import { isWall, roomHeight, roomWidth, type RoomGrid } from '../game/rooms';
import { castVisibility } from '../game/visibility';
import type { World } from '../game/world';
import { Lighting, type LightShape, type ViewTransform } from './lighting';
import { createEnemySprite, createPlayerSprite } from './sprites';

const COLORS = {
  background: '#050506',
  floor: '#2a2621',
  floorLine: 'rgba(0, 0, 0, 0.35)',
  wall: '#4b4f58',
  wallTop: '#6b707c',
  wallShadow: 'rgba(0, 0, 0, 0.45)',
} as const;

/** Height of the lighter strip drawn on top of each wall tile, as a fraction of the tile. */
const WALL_TOP_FRACTION = 0.18;

/** Draws the world. Reads state only; never modifies it. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly lighting = new Lighting();
  private readonly playerSprite = createPlayerSprite();
  private readonly enemySprite = createEnemySprite();
  private readonly view: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  private readonly light: LightShape = {
    x: 0,
    y: 0,
    radius: 0,
    strength: 1,
    glowAlpha: 0,
    polygon: new Float32Array(BALANCE.visibility.rayCount * 2),
  };
  private readonly camera = createCamera();
  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;
    this.resize();
  }

  /** Matches the backing store to the element size and devicePixelRatio. */
  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.cssWidth = Math.max(1, this.canvas.clientWidth);
    this.cssHeight = Math.max(1, this.canvas.clientHeight);
    const w = Math.round(this.cssWidth * this.dpr);
    const h = Math.round(this.cssHeight * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.lighting.resize(w, h);
    }
    const shortSide = Math.min(this.cssWidth, this.cssHeight);
    this.camera.scale = shortSide / (BALANCE.view.tilesOnShortSide * BALANCE.world.tileSize);
  }

  render(world: World, alpha: number): void {
    const { ctx, camera, dpr, view, light } = this;
    const { room, player, enemy, flashlight } = world;
    const px = lerp(player.prevX, player.x, alpha);
    const py = lerp(player.prevY, player.y, alpha);

    followTarget(camera, px, py, roomWidth(room), roomHeight(room), this.cssWidth, this.cssHeight);

    view.scale = camera.scale * dpr;
    view.offsetX = this.canvas.width / 2 - camera.x * view.scale;
    view.offsetY = this.canvas.height / 2 - camera.y * view.scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    this.drawRoom(room);
    this.drawBody(
      this.enemySprite,
      lerp(enemy.prevX, enemy.x, alpha),
      lerp(enemy.prevY, enemy.y, alpha),
      enemy.radius,
    );
    this.drawBody(this.playerSprite, px, py, player.radius);

    const cfg = BALANCE.flashlight;
    light.x = px;
    light.y = py;
    if (flashlight.on) {
      light.radius = cfg.radius;
      light.strength = flashlight.strength;
      light.glowAlpha = cfg.warmGlowAlpha * flashlight.strength;
    } else {
      light.radius = cfg.offHaloRadius;
      light.strength = cfg.offHaloStrength;
      light.glowAlpha = 0;
    }
    // Same pure visibility the game logic uses, at the interpolated position.
    castVisibility(room, px, py, light.radius, BALANCE.visibility.wallPenetration, light.polygon);
    this.lighting.draw(ctx, view, light);
  }

  private drawBody(sprite: HTMLCanvasElement, x: number, y: number, radius: number): void {
    this.ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  }

  private drawRoom(room: RoomGrid): void {
    const { ctx } = this;
    const t = room.tileSize;

    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, room.cols * t, room.rows * t);

    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 1; col < room.cols; col++) {
      ctx.moveTo(col * t, 0);
      ctx.lineTo(col * t, room.rows * t);
    }
    for (let row = 1; row < room.rows; row++) {
      ctx.moveTo(0, row * t);
      ctx.lineTo(room.cols * t, row * t);
    }
    ctx.stroke();

    for (let row = 0; row < room.rows; row++) {
      for (let col = 0; col < room.cols; col++) {
        if (!isWall(room, col, row)) continue;
        const x = col * t;
        const y = row * t;
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, t, t);
        if (!isWall(room, col, row - 1)) {
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(x, y, t, t * WALL_TOP_FRACTION);
        }
        if (!isWall(room, col, row + 1)) {
          ctx.fillStyle = COLORS.wallShadow;
          ctx.fillRect(x, y + t, t, t * WALL_TOP_FRACTION);
        }
      }
    }
  }
}
