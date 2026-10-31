import { rechargeBattery } from '../battery';
import type { Flashlight } from '../flashlight';
import { hasAllKeys, type Inventory, type Item } from '../items';
import type { Player } from '../player';
import type { RoomGrid } from '../rooms';

/** What pressing E would do right now. */
export type Prompt = 'none' | 'pickKey' | 'pickBattery' | 'openDoor' | 'doorLocked';

/** What happened when E was pressed this step. */
export type InteractResult = 'none' | 'key' | 'battery' | 'locked' | 'opened';

export interface InteractState {
  prompt: Prompt;
  /** Index of the item E would pick up, or -1. */
  itemIndex: number;
}

export function createInteractState(): InteractState {
  return { prompt: 'none', itemIndex: -1 };
}

/**
 * Finds what is in reach (the closest item first, then the door) and,
 * when E was pressed, does it. Returns 'opened' when the run is won.
 */
export function interactSystem(
  room: RoomGrid,
  player: Player,
  items: readonly Item[],
  inventory: Inventory,
  flashlight: Flashlight,
  state: InteractState,
  reach: number,
  rechargeAmount: number,
  pressed: boolean,
): InteractResult {
  findTarget(room, player, items, inventory, state, reach);
  if (!pressed) return 'none';

  const item = items[state.itemIndex];
  if (item) {
    item.taken = true;
    if (item.kind === 'key') inventory.keys++;
    else rechargeBattery(flashlight, rechargeAmount);
    findTarget(room, player, items, inventory, state, reach);
    return item.kind;
  }
  if (state.prompt === 'openDoor') return 'opened';
  if (state.prompt === 'doorLocked') return 'locked';
  return 'none';
}

function findTarget(
  room: RoomGrid,
  player: Player,
  items: readonly Item[],
  inventory: Inventory,
  state: InteractState,
  reach: number,
): void {
  let bestIndex = -1;
  let bestSq = reach * reach;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.taken) continue;
    const dx = item.x - player.x;
    const dy = item.y - player.y;
    const sq = dx * dx + dy * dy;
    if (sq <= bestSq) {
      bestSq = sq;
      bestIndex = i;
    }
  }

  state.itemIndex = bestIndex;
  const best = items[bestIndex];
  if (best) {
    state.prompt = best.kind === 'key' ? 'pickKey' : 'pickBattery';
  } else if (doorDistance(room, player) <= reach) {
    state.prompt = hasAllKeys(inventory) ? 'openDoor' : 'doorLocked';
  } else {
    state.prompt = 'none';
  }
}

/** Distance from the player center to the closest point of the door tile. */
function doorDistance(room: RoomGrid, player: Player): number {
  const t = room.tileSize;
  const left = room.door.col * t;
  const top = room.door.row * t;
  const dx = Math.max(left - player.x, 0, player.x - (left + t));
  const dy = Math.max(top - player.y, 0, player.y - (top + t));
  return Math.sqrt(dx * dx + dy * dy);
}
