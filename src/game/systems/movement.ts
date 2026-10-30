import { limitToUnit, type Vec2 } from '../../core/math';
import { moveBox } from '../collision';
import type { Player } from '../player';
import type { RoomGrid } from '../rooms';

const direction: Vec2 = { x: 0, y: 0 };
const position: Vec2 = { x: 0, y: 0 };

/** Moves the player one fixed step. Diagonal input is not faster. */
export function movementSystem(
  room: RoomGrid,
  player: Player,
  axisX: number,
  axisY: number,
  stepSeconds: number,
): void {
  player.prevX = player.x;
  player.prevY = player.y;

  limitToUnit(axisX, axisY, direction);
  if (direction.x === 0 && direction.y === 0) return;

  const distance = player.speed * stepSeconds;
  position.x = player.x;
  position.y = player.y;
  moveBox(room, position, player.radius, direction.x * distance, direction.y * distance);
  player.x = position.x;
  player.y = position.y;
}
