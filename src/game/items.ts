import { nextInt, type Rng } from '../core/rng';
import { areaAt, type RoomGrid, type TileCoord } from './rooms';

export type ItemKind = 'key' | 'battery';

export interface Item {
  readonly kind: ItemKind;
  /** Center, in world units. */
  readonly x: number;
  readonly y: number;
  /** Area that holds the spot, or null. Keys are picked one per area. */
  readonly area: string | null;
  /** Placed in this run (spots not picked stay empty). */
  active: boolean;
  taken: boolean;
}

/** One item per possible spot, created once; `placeItems` decides which are used in a run. */
export function createItems(room: RoomGrid): Item[] {
  const t = room.tileSize;
  const place = (kind: ItemKind, tile: TileCoord): Item => ({
    kind,
    x: (tile.col + 0.5) * t,
    y: (tile.row + 0.5) * t,
    area: areaAt(room, tile.col, tile.row),
    active: false,
    taken: false,
  });
  return [
    ...room.keys.map((k) => place('key', k)),
    ...room.batteries.map((b) => place('battery', b)),
  ];
}

/** True when the item is on the map and can be picked up. */
export function isAvailable(item: Item): boolean {
  return item.active && !item.taken;
}

/** Keys needed to open the door: one per area with key spots, or every spot without areas. */
export function keysRequired(room: RoomGrid): number {
  if (room.areas.length === 0) return room.keys.length;
  let count = 0;
  for (const area of room.areas) {
    if (room.keys.some((k) => areaAt(room, k.col, k.row) === area.id)) count++;
  }
  return count;
}

/**
 * Chooses the spots used in this run with the seeded RNG:
 * one key per area (every key spot when there are no areas)
 * and `room.batteryCount` batteries among the battery spots.
 */
export function placeItems(room: RoomGrid, items: readonly Item[], rng: Rng): void {
  for (const item of items) {
    item.active = false;
    item.taken = false;
  }

  if (room.areas.length === 0) {
    for (const item of items) if (item.kind === 'key') item.active = true;
  } else {
    for (const area of room.areas) {
      const spots = items.filter((i) => i.kind === 'key' && i.area === area.id);
      if (spots.length === 0) continue;
      const chosen = spots[nextInt(rng, spots.length)];
      if (chosen) chosen.active = true;
    }
  }

  const batteries = items.filter((i) => i.kind === 'battery');
  const count = Math.min(room.batteryCount, batteries.length);
  for (let k = 0; k < count; k++) {
    const j = k + nextInt(rng, batteries.length - k);
    const picked = batteries[j];
    const swap = batteries[k];
    if (!picked || !swap) continue;
    batteries[k] = picked;
    batteries[j] = swap;
    picked.active = true;
  }
}

/** Keys the player carries, out of the keys the room needs. */
export interface Inventory {
  keys: number;
  readonly keysRequired: number;
}

export function createInventory(required: number): Inventory {
  return { keys: 0, keysRequired: required };
}

export function hasAllKeys(inventory: Inventory): boolean {
  return inventory.keys >= inventory.keysRequired;
}

export function missingKeys(inventory: Inventory): number {
  return Math.max(0, inventory.keysRequired - inventory.keys);
}
