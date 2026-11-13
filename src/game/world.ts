import type { Vec2 } from '../core/math';
import { createRng, nextInt, type Rng } from '../core/rng';
import { BALANCE } from '../data/balance';
import type { LevelDef, LevelTuning } from '../data/levels';
import type { RoomDef } from '../data/rooms';
import { lightRadius, type BatteryConfig } from './battery';
import { createEnemy, placeEnemy, type Enemy } from './enemy';
import { clearEvents, createEvents, type WorldEvents } from './events';
import { createFlashlight, resetFlashlight, type Flashlight } from './flashlight';
import { lightModeProfile } from './lightModes';
import { playerMood, type Mood } from './mood';
import {
  createInventory,
  createItems,
  keysRequired,
  placeItems,
  type Inventory,
  type Item,
} from './items';
import {
  createDistanceField,
  invalidateDistanceField,
  updateDistanceField,
  type DistanceField,
} from './pathfinding';
import { createPlayer, type Player } from './player';
import { parseRoom, type RoomGrid } from './rooms';
import { batterySystem } from './systems/battery';
import { catchSystem } from './systems/catch';
import { enemySystem } from './systems/enemy';
import { aimSystem, flashlightSystem } from './systems/flashlight';
import { flickerSystem } from './systems/flicker';
import { createInteractState, interactSystem, type InteractState } from './systems/interact';
import { movementSystem } from './systems/movement';
import { separationSystem } from './systems/separation';
import { visibilitySystem } from './systems/visibility';
import {
  enemyDirectionSystem,
  enemyNearSystem,
  nearestEnemy,
  snapEnemyDirection,
} from './systems/warning';

export type WorldStatus = 'playing' | 'lost' | 'won';

export interface WorldSettings {
  /** Removes the flashlight flicker (photosensitivity option). */
  reduceFlicker: boolean;
  /** Sound off. Not used by the logic; kept here so every view reads one place. */
  muted: boolean;
  /** Debug only: the enemy cannot catch the player. */
  godMode: boolean;
  /** Classic round light (easier) instead of the cone. Change it with `setLightMode`. */
  classicLight: boolean;
}

export interface WorldOptions {
  /** Seed for every gameplay random choice. */
  seed: number;
  reduceFlicker: boolean;
  muted?: boolean;
  godMode?: boolean;
  classicLight?: boolean;
  /** Difficulty of the level; what it leaves out comes from `BALANCE.levels`. */
  tuning?: LevelTuning;
}

export interface World {
  readonly room: RoomGrid;
  readonly player: Player;
  readonly flashlight: Flashlight;
  /** Each one has its own light state and habit; they share `field`. At least one. */
  readonly enemies: readonly Enemy[];
  /** The closest enemy: the sound and the warnings follow this one. */
  nearestEnemy: Enemy;
  readonly tuning: Required<LevelTuning>;
  /** Battery values of the light mode, adjusted by the level. Set by `setLightMode`. */
  battery: BatteryConfig;
  readonly items: readonly Item[];
  readonly inventory: Inventory;
  readonly interact: InteractState;
  readonly field: DistanceField;
  readonly rng: Rng;
  readonly settings: WorldSettings;
  /** Filled by the steps, cleared by the reader (sound). */
  readonly events: WorldEvents;
  status: WorldStatus;
  /** Seconds of play in this run (logic steps only, so pauses do not count). */
  elapsedSeconds: number;
  /** 0 (far or none) to 1 (touching): drives the visual "enemy near" signal. */
  enemyNear: number;
  /** Unit vector from the player toward the enemy, turning smoothly: side of the directional shade. */
  readonly enemyDirection: Vec2;
  /** Face of the player character. */
  mood: Mood;
  /** True while the beam follows the mouse and not the walking direction. */
  pointerAiming: boolean;
}

/** Input already sampled for one logic step. */
export interface StepInput {
  axisX: number;
  axisY: number;
  toggleFlashlight: boolean;
  interact: boolean;
  /** World point the mouse is on, when aiming with it. Ignored with the classic light. */
  aimAt?: Vec2 | null;
}

const DEFAULT_OPTIONS: WorldOptions = { seed: 1, reduceFlicker: false };

export function createWorld(roomDef: RoomDef, options: WorldOptions = DEFAULT_OPTIONS): World {
  const room = parseRoom(roomDef, BALANCE.world.tileSize);
  const tuning = { ...BALANCE.levels, ...options.tuning };
  const { enemyCount } = tuning;
  if (!Number.isInteger(enemyCount) || enemyCount < 1 || enemyCount > room.enemySpawns.length) {
    throw new Error(`Room "${roomDef.id}" has too few enemy spawns for ${String(enemyCount)}`);
  }
  const enemies = Array.from({ length: enemyCount }, () =>
    createEnemy(BALANCE.enemy.radius, BALANCE.enemy.speed),
  );
  const first = enemies[0];
  if (!first) throw new Error('A world needs an enemy');
  const world: World = {
    room,
    player: createPlayer(0, 0, BALANCE.player.radius, BALANCE.player.speed),
    flashlight: createFlashlight(BALANCE.flashlight.startsOn),
    enemies,
    nearestEnemy: first,
    tuning,
    battery: BALANCE.battery,
    items: createItems(room),
    inventory: createInventory(keysRequired(room)),
    interact: createInteractState(),
    field: createDistanceField(room),
    rng: createRng(options.seed),
    settings: {
      reduceFlicker: options.reduceFlicker,
      muted: options.muted ?? false,
      godMode: options.godMode ?? false,
      classicLight: options.classicLight ?? false,
    },
    events: createEvents(),
    status: 'playing',
    elapsedSeconds: 0,
    enemyNear: 0,
    enemyDirection: { x: 0, y: 1 },
    mood: 'calm',
    pointerAiming: false,
  };
  resetWorld(world);
  return world;
}

/** A world for a level of the game, with its map and difficulty. */
export function createLevelWorld(level: LevelDef, options: Omit<WorldOptions, 'tuning'>): World {
  return createWorld(level.room, { ...options, tuning: level });
}

/**
 * Puts everything back at the start of a run. The enemy starts are picked with the
 * world RNG, all different; each enemy waits a little longer than the previous one.
 */
export function resetWorld(world: World): void {
  const { room, player } = world;
  const t = room.tileSize;

  player.x = player.prevX = (room.spawnCol + 0.5) * t;
  player.y = player.prevY = (room.spawnRow + 0.5) * t;
  player.facingX = 0;
  player.facingY = 1;

  const spawns = [...room.enemySpawns];
  world.enemies.forEach((enemy, index) => {
    const [spawn] = spawns.splice(nextInt(world.rng, spawns.length), 1);
    if (!spawn) throw new Error('Room has no enemy spawn');
    const delay = BALANCE.enemy.startDelaySeconds + index * BALANCE.enemy.extraStartDelaySeconds;
    placeEnemy(enemy, (spawn.col + 0.5) * t, (spawn.row + 0.5) * t, delay);
  });

  resetFlashlight(
    world.flashlight,
    BALANCE.flashlight.startsOn,
    Math.atan2(player.facingY, player.facingX),
  );
  setLightMode(world, world.settings.classicLight);
  placeItems(room, world.items, world.rng);
  world.inventory.keys = 0;
  world.interact.prompt = 'none';
  world.interact.itemIndex = -1;
  invalidateDistanceField(world.field);
  world.status = 'playing';
  world.elapsedSeconds = 0;
  world.enemyNear = 0;
  world.nearestEnemy = nearestEnemy(player, world.enemies, world.nearestEnemy);
  snapEnemyDirection(player, world.nearestEnemy, world.enemyDirection);
  world.mood = 'calm';
  world.pointerAiming = false;
  clearEvents(world.events);
}

/**
 * Switches between the cone and the classic circle, with the difficulty of each,
 * adjusted by the level. Works mid-run.
 */
export function setLightMode(world: World, classicLight: boolean): void {
  world.settings.classicLight = classicLight;
  const mode = lightModeProfile(classicLight);
  const { enemySpeedFactor, batterySecondsFactor } = world.tuning;
  for (const enemy of world.enemies) enemy.speed = mode.enemySpeed * enemySpeedFactor;
  world.battery = {
    ...mode.battery,
    drainSeconds: mode.battery.drainSeconds * batterySecondsFactor,
  };
}

/** Current flashlight radius, shrinking with the battery charge. */
export function currentLightRadius(flashlight: Flashlight): number {
  return lightRadius(
    flashlight.battery,
    BALANCE.flashlight.radius,
    BALANCE.battery.minRadiusFraction,
  );
}

/** Advances the world one fixed step. System order is declared only here. */
export function stepWorld(world: World, input: StepInput, stepSeconds: number): void {
  const { room, player, enemies, flashlight, field } = world;

  if (world.status !== 'playing') {
    // Frozen: keep interpolation still.
    player.prevX = player.x;
    player.prevY = player.y;
    holdEnemies(enemies);
    flashlight.prevAim = flashlight.aim;
    return;
  }

  const { events } = world;
  const mode = lightModeProfile(world.settings.classicLight);
  const wasOn = flashlight.on;
  const startX = player.x;
  const startY = player.y;

  world.elapsedSeconds += stepSeconds;
  flashlightSystem(flashlight, input.toggleFlashlight, BALANCE.flashlight, stepSeconds);
  if (flashlight.on !== wasOn) events.lightToggled++;
  const hadCharge = flashlight.battery > 0;
  batterySystem(flashlight, world.battery, stepSeconds);
  if (hadCharge && flashlight.battery === 0) events.batteryEmptied++;
  movementSystem(room, player, input.axisX, input.axisY, stepSeconds);
  events.moving = player.x !== startX || player.y !== startY;
  const aimAt = world.settings.classicLight ? null : (input.aimAt ?? null);
  world.pointerAiming = aimAt !== null;
  aimSystem(
    flashlight,
    player,
    aimAt ? BALANCE.flashlight.pointerTurnRate : BALANCE.flashlight.turnRate,
    stepSeconds,
    aimAt,
    BALANCE.flashlight.pointerDeadZone,
  );
  const result = interactSystem(
    room,
    player,
    world.items,
    world.inventory,
    flashlight,
    world.interact,
    BALANCE.interact.distance,
    BALANCE.battery.rechargeAmount,
    input.interact,
  );
  if (result === 'key') events.keyPicked++;
  else if (result === 'battery') events.batteryPicked++;
  else if (result === 'locked') events.doorLocked++;
  else if (result === 'opened') {
    events.doorOpened++;
    world.status = 'won';
    holdEnemies(enemies);
    return;
  }
  updateDistanceField(
    field,
    room,
    Math.floor(player.x / room.tileSize),
    Math.floor(player.y / room.tileSize),
  );
  const litRadius = currentLightRadius(flashlight) * BALANCE.visibility.litRadiusFraction;
  let anyLit = false;
  for (const enemy of enemies) {
    const wasLit = enemy.lit;
    visibilitySystem(
      room,
      flashlight,
      player,
      enemy,
      litRadius,
      world.settings.classicLight,
      BALANCE.flashlight.coneHalfAngle,
    );
    if (enemy.lit && !wasLit) events.enemyLit++;
    if (enemy.lit) anyLit = true;
    enemySystem(room, field, enemy, player, flashlight.on, mode.enemy, stepSeconds);
  }
  separationSystem(room, enemies, player, BALANCE.enemy, stepSeconds);
  flickerSystem(flashlight, anyLit, world.settings.reduceFlicker, BALANCE.flicker, stepSeconds);
  world.nearestEnemy = nearestEnemy(player, enemies, world.nearestEnemy);
  world.enemyNear = enemyNearSystem(player, world.nearestEnemy, BALANCE.warning.enemyNearDistance);
  enemyDirectionSystem(
    player,
    world.nearestEnemy,
    world.enemyDirection,
    BALANCE.warning.directionTurnRate,
    stepSeconds,
  );
  world.mood = playerMood(flashlight.battery, world.enemyNear, BALANCE.mood);
  if (!world.settings.godMode) {
    for (const enemy of enemies) {
      if (catchSystem(player, enemy, BALANCE.enemy.catchDistance)) {
        events.caught++;
        world.status = 'lost';
        break;
      }
    }
  }
}

function holdEnemies(enemies: readonly Enemy[]): void {
  for (const enemy of enemies) {
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
  }
}
