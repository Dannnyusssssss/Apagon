import { createCamera, followTarget, screenToWorld } from '../core/camera';
import { lerp, lerpAngle, type Vec2 } from '../core/math';
import { renderScale } from '../core/resolution';
import { BALANCE } from '../data/balance';
import { levelAt, type LevelDef, type LevelPalette } from '../data/levels';
import { isBatteryLow } from '../game/battery';
import { hasAllKeys, isAvailable, type Item } from '../game/items';
import {
  isWall,
  roomHeight,
  roomWidth,
  tileAt,
  TILE_DOOR,
  TILE_FLOOR,
  TILE_ROCK,
  TILE_TREE,
  type RoomGrid,
} from '../game/rooms';
import { castCone, castVisibility } from '../game/visibility';
import { currentLightRadius, type World } from '../game/world';
import { Hud } from './hud';
import { Lighting, type LightShape, type ViewTransform } from './lighting';
import {
  createBatterySprite,
  createDoorSprite,
  createEnemySprite,
  createKeySprite,
  createFaceSprite,
  createFlashlightSprite,
  createGateSprite,
  createPlayerSprite,
  createRockSprite,
  createTreeSprite,
  FACE,
  FLASHLIGHT_ASPECT,
  type FlashlightLook,
} from './sprites';

/** Character layout, as fractions of the drawn body radius. */
const HANDS = {
  radius: 0.24,
  /** The hand holding the flashlight sits ahead and to the right of the facing direction. */
  holdAngle: 0.6,
  holdDistance: 0.85,
  freeAngle: -1.9,
  freeDistance: 0.9,
  /** Flashlight length; it starts a bit behind the hand. */
  flashlightLength: 1.7,
  flashlightBack: 0.2,
} as const;
/** Blink: once every this many seconds, for a short moment (never when scared). */
const BLINK_EVERY = 3.7;
const BLINK_FOR = 0.13;

const COLORS = {
  skin: '#e2c39a',
  skinEdge: '#6b5238',
  pupil: '#1a100a',
} as const;

/** Drawn size of keys and batteries, as a fraction of the tile. */
const ITEM_SIZE_FRACTION = 0.7;

/** Height of the lighter strip drawn on top of each wall tile, as a fraction of the tile. */
const WALL_TOP_FRACTION = 0.18;

/** Draws the world. Reads state only; never modifies it. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly lighting = new Lighting();
  private readonly playerSprite = createPlayerSprite();
  private readonly faces = {
    calm: createFaceSprite('calm', false),
    worried: createFaceSprite('worried', false),
    scared: createFaceSprite('scared', false),
  };
  private readonly blinks = {
    calm: createFaceSprite('calm', true),
    worried: createFaceSprite('worried', true),
    scared: createFaceSprite('scared', true),
  };
  private readonly flashlights: Record<FlashlightLook, HTMLCanvasElement> = {
    on: createFlashlightSprite('on'),
    low: createFlashlightSprite('low'),
    off: createFlashlightSprite('off'),
  };
  private readonly enemySprite = createEnemySprite();
  private readonly keySprite = createKeySprite();
  private readonly batterySprite = createBatterySprite();
  private readonly doorSprite = createDoorSprite(false);
  private readonly doorReadySprite = createDoorSprite(true);
  private readonly gateSprite = createGateSprite(false);
  private readonly gateReadySprite = createGateSprite(true);
  private readonly treeSprite = createTreeSprite();
  private readonly rockSprite = createRockSprite();
  private palette: LevelPalette = levelAt(0).palette;
  private gateExit = false;
  private penetration: number = BALANCE.visibility.wallPenetration;
  private readonly hud = new Hud();
  private readonly view: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  private readonly circlePolygon = new Float32Array(BALANCE.visibility.rayCount * 2);
  /** The origin plus one vertex per ray over the arc. */
  private readonly conePolygon = new Float32Array((BALANCE.visibility.coneRayCount + 1) * 2);
  private readonly haloPolygon = new Float32Array(BALANCE.visibility.haloRayCount * 2);
  /** The flashlight: the cone, the classic circle, or the faint halo when off. */
  private readonly beam: LightShape = {
    kind: 'circle',
    x: 0,
    y: 0,
    radius: 0,
    angle: 0,
    strength: 1,
    glowAlpha: 0,
    polygon: this.circlePolygon,
  };
  /** Cone mode only: the small halo around the player. */
  private readonly halo: LightShape = {
    kind: 'circle',
    x: 0,
    y: 0,
    radius: BALANCE.flashlight.haloRadius,
    angle: 0,
    strength: BALANCE.flashlight.haloStrength,
    glowAlpha: 0,
    polygon: this.haloPolygon,
  };
  private readonly lights: readonly LightShape[] = [this.beam, this.halo];
  private readonly camera = createCamera();
  /** Canvas pixels per CSS pixel. */
  private dpr = 1;
  /** The part of the map on screen this frame, in world units. */
  private viewLeft = 0;
  private viewTop = 0;
  private viewRight = 0;
  private viewBottom = 0;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;
    this.resize();
  }

  /** Writes the world point under a position in CSS pixels, as last drawn, into `out`. */
  pointToWorld(screenX: number, screenY: number, out: Vec2): Vec2 {
    return screenToWorld(this.camera, screenX, screenY, this.cssWidth, this.cssHeight, out);
  }

  /** Colors and exit of the level being played. */
  setLevel(level: LevelDef): void {
    this.palette = level.palette;
    this.gateExit = level.exit === 'gate';
    this.penetration = level.lightPenetration ?? BALANCE.visibility.wallPenetration;
    this.hud.setExit(level.exit);
  }

  /** Matches the backing store to the element size and the capped pixel density. */
  resize(): void {
    this.cssWidth = Math.max(1, this.canvas.clientWidth);
    this.cssHeight = Math.max(1, this.canvas.clientHeight);
    this.dpr = renderScale(
      window.devicePixelRatio,
      this.cssWidth,
      this.cssHeight,
      BALANCE.view.maxRenderScale,
      BALANCE.view.maxRenderPixels,
    );
    const w = Math.round(this.cssWidth * this.dpr);
    const h = Math.round(this.cssHeight * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.lighting.resize(w, h);
    }
    this.hud.resize(this.dpr);
    const shortSide = Math.min(this.cssWidth, this.cssHeight);
    this.camera.scale = shortSide / (BALANCE.view.tilesOnShortSide * BALANCE.world.tileSize);
  }

  render(world: World, alpha: number): void {
    const { ctx, camera, dpr, view } = this;
    const { room, player, flashlight } = world;
    const px = lerp(player.prevX, player.x, alpha);
    const py = lerp(player.prevY, player.y, alpha);
    const aim = lerpAngle(flashlight.prevAim, flashlight.aim, alpha);

    followTarget(camera, px, py, roomWidth(room), roomHeight(room), this.cssWidth, this.cssHeight);

    view.scale = camera.scale * dpr;
    view.offsetX = this.canvas.width / 2 - camera.x * view.scale;
    view.offsetY = this.canvas.height / 2 - camera.y * view.scale;

    this.viewLeft = -view.offsetX / view.scale;
    this.viewTop = -view.offsetY / view.scale;
    this.viewRight = (this.canvas.width - view.offsetX) / view.scale;
    this.viewBottom = (this.canvas.height - view.offsetY) / view.scale;

    // Usually the map covers the whole screen and this would be drawn over at once.
    if (
      this.viewLeft < 0 ||
      this.viewTop < 0 ||
      this.viewRight > roomWidth(room) ||
      this.viewBottom > roomHeight(room)
    ) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this.palette.background;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    this.drawRoom(room);
    this.drawDoor(world);
    this.drawItems(world.items, room.tileSize);
    for (const enemy of world.enemies) {
      const ex = lerp(enemy.prevX, enemy.x, alpha);
      const ey = lerp(enemy.prevY, enemy.y, alpha);
      if (this.isOnScreen(ex, ey, enemy.radius)) {
        this.drawBody(this.enemySprite, ex, ey, enemy.radius);
      }
    }
    this.drawPlayer(world, px, py, aim);

    const count = this.updateLights(world, px, py, aim);
    this.lighting.draw(ctx, view, this.lights, count);
    this.hud.draw(ctx, world, this.canvas.width, this.canvas.height);
  }

  private isOnScreen(x: number, y: number, radius: number): boolean {
    return (
      x + radius > this.viewLeft &&
      x - radius < this.viewRight &&
      y + radius > this.viewTop &&
      y - radius < this.viewBottom
    );
  }

  /**
   * Fills the light shapes for this frame with the same pure visibility the game logic
   * uses, at the interpolated position and aim. Returns how many lights to draw.
   */
  private updateLights(world: World, px: number, py: number, aim: number): number {
    const { room, flashlight } = world;
    const { beam, halo } = this;
    const cfg = BALANCE.flashlight;
    const { penetration } = this;
    const cone = flashlight.on && !world.settings.classicLight;
    beam.x = px;
    beam.y = py;
    beam.angle = aim;
    if (flashlight.on) {
      beam.radius = currentLightRadius(flashlight);
      beam.strength = flashlight.strength;
      beam.glowAlpha = cfg.warmGlowAlpha * flashlight.strength;
    } else {
      beam.radius = cfg.offHaloRadius;
      beam.strength = cfg.offHaloStrength;
      beam.glowAlpha = 0;
    }
    if (!cone) {
      beam.kind = 'circle';
      beam.polygon = this.circlePolygon;
      castVisibility(room, px, py, beam.radius, penetration, beam.polygon);
      return 1;
    }
    beam.kind = 'cone';
    beam.polygon = this.conePolygon;
    castCone(room, px, py, beam.radius, aim, cfg.coneSoftOuter, penetration, beam.polygon);
    halo.x = px;
    halo.y = py;
    castVisibility(room, px, py, halo.radius, penetration, halo.polygon);
    return 2;
  }

  private drawDoor(world: World): void {
    const { door, tileSize: t } = world.room;
    const ready = hasAllKeys(world.inventory);
    const sprite = this.gateExit
      ? ready
        ? this.gateReadySprite
        : this.gateSprite
      : ready
        ? this.doorReadySprite
        : this.doorSprite;
    this.ctx.drawImage(sprite, door.col * t, door.row * t, t, t);
  }

  private drawItems(items: readonly Item[], tileSize: number): void {
    const half = (tileSize * ITEM_SIZE_FRACTION) / 2;
    for (const item of items) {
      if (!isAvailable(item) || !this.isOnScreen(item.x, item.y, half)) continue;
      const sprite = item.kind === 'key' ? this.keySprite : this.batterySprite;
      this.ctx.drawImage(sprite, item.x - half, item.y - half, half * 2, half * 2);
    }
  }

  /** Free hand, body, face with live pupils, then the flashlight and the hand holding it. */
  private drawPlayer(world: World, x: number, y: number, aim: number): void {
    const { ctx } = this;
    const { player, flashlight, mood } = world;
    const r = BALANCE.player.drawRadius;
    const angle = Math.atan2(player.facingY, player.facingX);

    this.drawHand(x, y, angle + HANDS.freeAngle, HANDS.freeDistance * r, r);
    this.drawBody(this.playerSprite, x, y, r);

    const blinking = mood !== 'scared' && world.elapsedSeconds % BLINK_EVERY < BLINK_FOR;
    this.drawBody(blinking ? this.blinks[mood] : this.faces[mood], x, y, r);
    if (!blinking) {
      // The eyes follow the beam when it is aimed apart from the walking direction.
      const lookX = (world.pointerAiming ? Math.cos(aim) : player.facingX) * FACE.look * r;
      const lookY = (world.pointerAiming ? Math.sin(aim) : player.facingY) * FACE.look * r;
      const pupil = FACE.pupil[mood] * r;
      ctx.fillStyle = COLORS.pupil;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.arc(x + side * FACE.eyeX * r + lookX, y + FACE.eyeY * r + lookY, pupil, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Flashlight in the right hand, pointing where the beam points.
    const handAngle = aim + HANDS.holdAngle;
    const hx = x + Math.cos(handAngle) * HANDS.holdDistance * r;
    const hy = y + Math.sin(handAngle) * HANDS.holdDistance * r;
    const look: FlashlightLook = !flashlight.on
      ? 'off'
      : isBatteryLow(flashlight.battery, BALANCE.battery.lowThreshold)
        ? 'low'
        : 'on';
    const length = HANDS.flashlightLength * r;
    const width = length * FLASHLIGHT_ASPECT;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(aim);
    ctx.drawImage(this.flashlights[look], -HANDS.flashlightBack * r, -width / 2, length, width);
    ctx.restore();
    this.drawHand(hx, hy, 0, 0, r);
  }

  private drawHand(cx: number, cy: number, angle: number, distance: number, r: number): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.skin;
    ctx.strokeStyle = COLORS.skinEdge;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * distance,
      cy + Math.sin(angle) * distance,
      HANDS.radius * r,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }

  private drawBody(sprite: HTMLCanvasElement, x: number, y: number, radius: number): void {
    this.ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  }

  private drawRoom(room: RoomGrid): void {
    const { ctx, palette } = this;
    const t = room.tileSize;

    // Only the tiles on screen: the larger maps have many more than fit in view.
    const firstCol = Math.max(0, Math.floor(this.viewLeft / t));
    const firstRow = Math.max(0, Math.floor(this.viewTop / t));
    const lastCol = Math.min(room.cols - 1, Math.floor(this.viewRight / t));
    const lastRow = Math.min(room.rows - 1, Math.floor(this.viewBottom / t));
    const left = firstCol * t;
    const top = firstRow * t;
    const right = (lastCol + 1) * t;
    const bottom = (lastRow + 1) * t;

    ctx.fillStyle = palette.floor;
    ctx.fillRect(left, top, right - left, bottom - top);

    ctx.strokeStyle = palette.floorLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = Math.max(1, firstCol); col <= lastCol; col++) {
      ctx.moveTo(col * t, top);
      ctx.lineTo(col * t, bottom);
    }
    for (let row = Math.max(1, firstRow); row <= lastRow; row++) {
      ctx.moveTo(left, row * t);
      ctx.lineTo(right, row * t);
    }
    ctx.stroke();

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const tile = tileAt(room, col, row);
        if (tile === TILE_FLOOR || tile === TILE_DOOR) continue;
        const x = col * t;
        const y = row * t;
        ctx.fillStyle = palette.wall;
        ctx.fillRect(x, y, t, t);
        if (tile === TILE_TREE) {
          ctx.drawImage(this.treeSprite, x, y, t, t);
        } else if (tile === TILE_ROCK) {
          ctx.drawImage(this.rockSprite, x, y, t, t);
        } else if (!isWall(room, col, row - 1)) {
          ctx.fillStyle = palette.wallTop;
          ctx.fillRect(x, y, t, t * WALL_TOP_FRACTION);
        }
        if (!isWall(room, col, row + 1)) {
          ctx.fillStyle = palette.wallShadow;
          ctx.fillRect(x, y + t, t, t * WALL_TOP_FRACTION);
        }
      }
    }
  }
}
