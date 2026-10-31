import { createRng, nextInt, type Rng } from '../core/rng';
import { BALANCE } from '../data/balance';
import type { RoomDef } from '../data/rooms';
import { createEnemy, placeEnemy, type Enemy } from './enemy';
import { createFlashlight, resetFlashlight, type Flashlight } from './flashlight';
import {
  createDistanceField,
  invalidateDistanceField,
  updateDistanceField,
  type DistanceField,
} from './pathfinding';
import { createPlayer, type Player } from './player';
import { parseRoom, type RoomGrid } from './rooms';
import { catchSystem } from './systems/catch';
import { enemySystem } from './systems/enemy';
import { flashlightSystem } from './systems/flashlight';
import { flickerSystem } from './systems/flicker';
import { movementSystem } from './systems/movement';
import { visibilitySystem } from './systems/visibility';

export type WorldStatus = 'playing' | 'lost';

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
  readonly field: DistanceField;
  readonly rng: Rng;
  readonly settings: WorldSettings;
  status: WorldStatus;
}

/** Input already sampled for one logic step. */
export interface StepInput {
  axisX: number;
  axisY: number;
  toggleFlashlight: boolean;
}

const DEFAULT_OPTIONS: WorldOptions = { seed: 1, reduceFlicker: false };

const LIT_RADIUS = BALANCE.flashlight.radius * BALANCE.visibility.litRadiusFraction;

export function createWorld(roomDef: RoomDef, options: WorldOptions = DEFAULT_OPTIONS): World {
  const room = parseRoom(roomDef, BALANCE.world.tileSize);
  const world: World = {
    room,
    player: createPlayer(0, 0, BALANCE.player.radius, BALANCE.player.speed),
    flashlight: createFlashlight(BALANCE.flashlight.startsOn),
    enemy: createEnemy(BALANCE.enemy.radius, BALANCE.enemy.speed),
    field: createDistanceField(room),
    rng: createRng(options.seed),
    settings: { reduceFlicker: options.reduceFlicker },
    status: 'playing',
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
  invalidateDistanceField(world.field);
  world.status = 'playing';
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

  flashlightSystem(flashlight, input.toggleFlashlight);
  movementSystem(room, player, input.axisX, input.axisY, stepSeconds);
  updateDistanceField(
    field,
    room,
    Math.floor(player.x / room.tileSize),
    Math.floor(player.y / room.tileSize),
  );
  visibilitySystem(room, flashlight, player, enemy, LIT_RADIUS);
  enemySystem(room, field, enemy, player, BALANCE.enemy.freezeAfterLightSeconds, stepSeconds);
  flickerSystem(flashlight, enemy.lit, world.settings.reduceFlicker, BALANCE.flicker, stepSeconds);
  if (catchSystem(player, enemy, BALANCE.enemy.catchDistance)) world.status = 'lost';
}
