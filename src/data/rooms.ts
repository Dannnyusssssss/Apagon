/** A named rectangle of the map (in tiles), used to tell which room the player is in. */
export interface AreaDef {
  readonly id: string;
  readonly col: number;
  readonly row: number;
  readonly cols: number;
  readonly rows: number;
}

/**
 * Map layouts as text grids.
 * '#' wall · '.' floor · 'P' player start (floor) · 'E' possible enemy start (floor)
 * 'K' key (floor) · 'B' battery (floor) · 'D' exit door (solid until the run is won).
 */
export interface RoomDef {
  readonly id: string;
  readonly layout: readonly string[];
  readonly areas?: readonly AreaDef[];
}

/**
 * The house: three rooms with a fixed layout.
 * Entrance (top left, start) · living room (top right) · basement (bottom, exit on the left).
 * One key per room. Two openings lead to the basement, so the enemy can be led around a loop.
 */
export const HOUSE: RoomDef = {
  id: 'house',
  layout: [
    '####################################',
    '#.........K.#......B...............#',
    '#...........#.................##...#',
    '#..P........#...##............##...#',
    '#...............##....#####........#',
    '#...............##....#####........#',
    '#...###.....#...##.................#',
    '#...###.....#...........E........K.#',
    '#.......B...#......................#',
    '#####..#######################..####',
    '#..................................#',
    '#..............#.........B.##......#',
    '#.......###....#...........##......#',
    '#.......###....#...........##......#',
    'D..............#...................#',
    '#...................#####..........#',
    '#...................#####..........#',
    '#..B..............K..............E.#',
    '#..................................#',
    '####################################',
  ],
  areas: [
    { id: 'entrance', col: 1, row: 1, cols: 11, rows: 8 },
    { id: 'living', col: 13, row: 1, cols: 22, rows: 8 },
    { id: 'basement', col: 1, row: 10, cols: 34, rows: 9 },
  ],
};
