import { isWall, type RoomGrid } from './rooms';

/** Marks tiles that cannot be reached from the origin. */
export const UNREACHABLE = -1;

/**
 * Tile distances (4-neighbour steps) from an origin tile, computed by BFS.
 * Buffers are allocated once per room and reused on every update.
 */
export interface DistanceField {
  readonly cols: number;
  readonly rows: number;
  readonly distances: Int32Array;
  readonly queue: Int32Array;
  originCol: number;
  originRow: number;
}

export function createDistanceField(room: RoomGrid): DistanceField {
  const size = room.cols * room.rows;
  return {
    cols: room.cols,
    rows: room.rows,
    distances: new Int32Array(size).fill(UNREACHABLE),
    queue: new Int32Array(size),
    originCol: -1,
    originRow: -1,
  };
}

/** Forces the next update to recompute, even if the origin did not change. */
export function invalidateDistanceField(field: DistanceField): void {
  field.originCol = -1;
  field.originRow = -1;
}

/** Recomputes the field only when the origin tile changes. */
export function updateDistanceField(
  field: DistanceField,
  room: RoomGrid,
  originCol: number,
  originRow: number,
): void {
  if (field.originCol === originCol && field.originRow === originRow) return;
  field.originCol = originCol;
  field.originRow = originRow;

  const { cols, distances, queue } = field;
  distances.fill(UNREACHABLE);
  if (isWall(room, originCol, originRow)) return;

  let head = 0;
  let tail = 0;
  const start = originRow * cols + originCol;
  distances[start] = 0;
  queue[tail++] = start;

  while (head < tail) {
    const index = queue[head++] ?? 0;
    const col = index % cols;
    const row = (index - col) / cols;
    const next = (distances[index] ?? 0) + 1;
    tail = visit(room, field, col + 1, row, next, tail);
    tail = visit(room, field, col - 1, row, next, tail);
    tail = visit(room, field, col, row + 1, next, tail);
    tail = visit(room, field, col, row - 1, next, tail);
  }
}

function visit(
  room: RoomGrid,
  field: DistanceField,
  col: number,
  row: number,
  distance: number,
  tail: number,
): number {
  if (isWall(room, col, row)) return tail;
  const index = row * field.cols + col;
  if (field.distances[index] !== UNREACHABLE) return tail;
  field.distances[index] = distance;
  field.queue[tail] = index;
  return tail + 1;
}

export function distanceAt(field: DistanceField, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= field.cols || row >= field.rows) return UNREACHABLE;
  return field.distances[row * field.cols + col] ?? UNREACHABLE;
}
