import { BALANCE } from '../data/balance';
import type { RoomDef } from '../data/rooms';
import { createFlashlight, type Flashlight } from './flashlight';
import { createPlayer, type Player } from './player';
import { parseRoom, type RoomGrid } from './rooms';
import { flashlightSystem } from './systems/flashlight';
import { movementSystem } from './systems/movement';

export interface World {
  readonly room: RoomGrid;
  readonly player: Player;
  readonly flashlight: Flashlight;
}

/** Input already sampled for one logic step. */
export interface StepInput {
  axisX: number;
  axisY: number;
  toggleFlashlight: boolean;
}

export function createWorld(roomDef: RoomDef): World {
  const room = parseRoom(roomDef, BALANCE.world.tileSize);
  const t = room.tileSize;
  const player = createPlayer(
    (room.spawnCol + 0.5) * t,
    (room.spawnRow + 0.5) * t,
    BALANCE.player.radius,
    BALANCE.player.speed,
  );
  return { room, player, flashlight: createFlashlight(BALANCE.flashlight.startsOn) };
}

/** Advances the world one fixed step. System order is declared only here. */
export function stepWorld(world: World, input: StepInput, stepSeconds: number): void {
  flashlightSystem(world.flashlight, input.toggleFlashlight);
  movementSystem(world.room, world.player, input.axisX, input.axisY, stepSeconds);
}
