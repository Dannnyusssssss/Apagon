import type { RoomGrid, TileCoord } from './rooms';

export type ItemKind = 'key' | 'battery';

export interface Item {
  readonly kind: ItemKind;
  /** Center, in world units. */
  readonly x: number;
  readonly y: number;
  taken: boolean;
}

/** Creates the room items once; `resetItems` makes them available again. */
export function createItems(room: RoomGrid): Item[] {
  const t = room.tileSize;
  const place = (kind: ItemKind, tile: TileCoord): Item => ({
    kind,
    x: (tile.col + 0.5) * t,
    y: (tile.row + 0.5) * t,
    taken: false,
  });
  return [
    ...room.keys.map((k) => place('key', k)),
    ...room.batteries.map((b) => place('battery', b)),
  ];
}

export function resetItems(items: readonly Item[]): void {
  for (const item of items) item.taken = false;
}

/** Keys the player carries, out of the keys the room has. */
export interface Inventory {
  keys: number;
  readonly keysRequired: number;
}

export function createInventory(keysRequired: number): Inventory {
  return { keys: 0, keysRequired };
}

export function hasAllKeys(inventory: Inventory): boolean {
  return inventory.keys >= inventory.keysRequired;
}

export function missingKeys(inventory: Inventory): number {
  return Math.max(0, inventory.keysRequired - inventory.keys);
}
