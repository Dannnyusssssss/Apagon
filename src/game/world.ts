import { createRng, nextInt, type Rng } from '../core/rng';
import { BALANCE } from '../data/balance';
import type { RoomDef } from '../data/rooms';
import { lightRadius } from './battery';
import { createEnemy, placeEnemy, type Enemy } from './enemy';
import { createFlashlight, resetFlashlight, type Flashlight } from './flashlight';
import { createInventory, createItems, resetItems, type Inventory, type Item } from './items';
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
}

export interface WorldOptions {
  /** Seed for every gameplay random choice. */
  seed: number;
  reduceFlicker: boolean;
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
    inventory: createInventory(room.keys.length),
    interact: createInteractState(),
    field: createDistanceField(room),
    rng: createRng(options.seed),
    settings: { reduceFlicker: options.reduceFlicker },
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
  resetItems(world.items);
  world.inventory.keys = 0;
  world.interact.prompt = 'none';
  world.interact.itemIndex = -1;
  invalidateDistanceField(world.field);
  world.status = 'playing';
  world.elapsedSeconds = 0;
  world.enemyNear = 0;
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

  world.elapsedSeconds += stepSeconds;
  flashlightSystem(flashlight, input.toggleFlashlight);
  batterySystem(flashlight, BALANCE.battery, stepSeconds);
  movementSystem(room, player, input.axisX, input.axisY, stepSeconds);
  const opened = interactSystem(
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
  if (opened) {
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
  enemySystem(room, field, enemy, player, BALANCE.enemy.freezeAfterLightSeconds, stepSeconds);
  flickerSystem(flashlight, enemy.lit, world.settings.reduceFlicker, BALANCE.flicker, stepSeconds);
  world.enemyNear = enemyNearSystem(player, enemy, BALANCE.warning.enemyNearDistance);
  if (catchSystem(player, enemy, BALANCE.enemy.catchDistance)) world.status = 'lost';
}
