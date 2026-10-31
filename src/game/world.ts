import { createRng, nextInt, type Rng } from '../core/rng';
import { BALANCE } from '../data/balance';
import type { RoomDef } from '../data/rooms';
import { lightRadius } from './battery';
import { createEnemy, placeEnemy, type Enemy } from './enemy';
import { clearEvents, createEvents, type WorldEvents } from './events';
import { createFlashlight, resetFlashlight, type Flashlight } from './flashlight';
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
import { flashlightSystem } from './systems/flashlight';
import { flickerSystem } from './systems/flicker';
import { createInteractState, interactSystem, type InteractState } from './systems/interact';
import { movementSystem } from './systems/movement';
import { visibilitySystem } from './systems/visibility';
import { enemyNearSystem } from './systems/warning';

export type WorldStatus = 'playing' | 'lost' | 'won';

export interface WorldSettings {
  /** Removes the flashlight flicker (photosensitivity option). */
  reduceFlicker: boolean;
  /** Sound off. Not used by the logic; kept here so every view reads one place. */
  muted: boolean;
  /** Debug only: the enemy cannot catch the player. */
  godMode: boolean;
}

export interface WorldOptions {
  /** Seed for every gameplay random choice. */
  seed: number;
  reduceFlicker: boolean;
  muted?: boolean;
  godMode?: boolean;
}

export interface World {
  readonly room: RoomGrid;
  readonly player: Player;
  readonly flashlight: Flashlight;
  readonly enemy: Enemy;
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
}

/** Input already sampled for one logic step. */
export interface StepInput {
  axisX: number;
  axisY: number;
  toggleFlashlight: boolean;
  interact: boolean;
}

const DEFAULT_OPTIONS: WorldOptions = { seed: 1, reduceFlicker: false };

export function createWorld(roomDef: RoomDef, options: WorldOptions = DEFAULT_OPTIONS): World {
  const room = parseRoom(roomDef, BALANCE.world.tileSize);
  const world: World = {
    room,
    player: createPlayer(0, 0, BALANCE.player.radius, BALANCE.player.speed),
    flashlight: createFlashlight(BALANCE.flashlight.startsOn),
    enemy: createEnemy(BALANCE.enemy.radius, BALANCE.enemy.speed),
    items: createItems(room),
    inventory: createInventory(keysRequired(room)),
    interact: createInteractState(),
    field: createDistanceField(room),
    rng: createRng(options.seed),
    settings: {
      reduceFlicker: options.reduceFlicker,
      muted: options.muted ?? false,
      godMode: options.godMode ?? false,
    },
    events: createEvents(),
    status: 'playing',
    elapsedSeconds: 0,
    enemyNear: 0,
  };
  resetWorld(world);
  return world;
}

/** Puts everything back at the start of a run. The enemy start is picked with the world RNG. */
export function resetWorld(world: World): void {
  const { room, player, enemy } = world;
  const t = room.tileSize;

  player.x = player.prevX = (room.spawnCol + 0.5) * t;
  player.y = player.prevY = (room.spawnRow + 0.5) * t;

  const spawn =
    room.enemySpawns[nextInt(world.rng, room.enemySpawns.length)] ?? room.enemySpawns[0];
  if (!spawn) throw new Error('Room has no enemy spawn');
  placeEnemy(enemy, (spawn.col + 0.5) * t, (spawn.row + 0.5) * t, BALANCE.enemy.startDelaySeconds);

  resetFlashlight(world.flashlight, BALANCE.flashlight.startsOn);
  placeItems(room, world.items, world.rng);
  world.inventory.keys = 0;
  world.interact.prompt = 'none';
  world.interact.itemIndex = -1;
  invalidateDistanceField(world.field);
  world.status = 'playing';
  world.elapsedSeconds = 0;
  world.enemyNear = 0;
  clearEvents(world.events);
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
  const { room, player, enemy, flashlight, field } = world;

  if (world.status !== 'playing') {
    // Frozen: keep interpolation still.
    player.prevX = player.x;
    player.prevY = player.y;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    return;
  }

  const { events } = world;
  const wasOn = flashlight.on;
  const wasLit = enemy.lit;
  const startX = player.x;
  const startY = player.y;

  world.elapsedSeconds += stepSeconds;
  flashlightSystem(flashlight, input.toggleFlashlight);
  if (flashlight.on !== wasOn) events.lightToggled++;
  const hadCharge = flashlight.battery > 0;
  batterySystem(flashlight, BALANCE.battery, stepSeconds);
  if (hadCharge && flashlight.battery === 0) events.batteryEmptied++;
  movementSystem(room, player, input.axisX, input.axisY, stepSeconds);
  events.moving = player.x !== startX || player.y !== startY;
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
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    return;
  }
  updateDistanceField(
    field,
    room,
    Math.floor(player.x / room.tileSize),
    Math.floor(player.y / room.tileSize),
  );
  const litRadius = currentLightRadius(flashlight) * BALANCE.visibility.litRadiusFraction;
  visibilitySystem(room, flashlight, player, enemy, litRadius);
  if (enemy.lit && !wasLit) events.enemyLit++;
  enemySystem(room, field, enemy, player, flashlight.on, BALANCE.enemy, stepSeconds);
  flickerSystem(flashlight, enemy.lit, world.settings.reduceFlicker, BALANCE.flicker, stepSeconds);
  world.enemyNear = enemyNearSystem(player, enemy, BALANCE.warning.enemyNearDistance);
  if (!world.settings.godMode && catchSystem(player, enemy, BALANCE.enemy.catchDistance)) {
    events.caught++;
    world.status = 'lost';
  }
}
