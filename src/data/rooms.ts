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
 * 'K' possible key spot (floor) · 'B' possible battery spot (floor) · 'D' exit door (solid).
 *
 * With areas, each run places one key in every area that has 'K' spots, picked
 * with the seeded RNG; without areas, every 'K' is a key. `batteryCount` batteries
 * are picked among the 'B' spots; without it, every 'B' is a battery.
 */
export interface RoomDef {
  readonly id: string;
  readonly layout: readonly string[];
  readonly areas?: readonly AreaDef[];
  readonly batteryCount?: number;
}

/**
 * The house: three rooms with a fixed layout.
 * Entrance (top left, start) · living room (top right) · basement (bottom, exit on the left).
 * Each run: one key per room and 3 batteries, at different spots among the marked ones.
 * Two openings lead to the basement, so the enemy can be led around a loop.
 */
export const HOUSE: RoomDef = {
  id: 'house',
  layout: [
    '####################################',
    '#.....B...K.#......B..............K#',
    '#...........#.................##...#',
    '#..P........#...##............##...#',
    '#...............##....#####.K......#',
    '#...............##....#####....B...#',
    '#...###..K..#...##.................#',
    '#...###.....#...........E........K.#',
    '#K......B...#.......K..............#',
    '#####..#######################..####',
    '#..................................#',
    '#....K.........#.........B.##......#',
    '#.......###....#...........##.....K#',
    '#.......###....#...........##......#',
    'D..............#...................#',
    '#............B......#####..........#',
    '#...........K.......#####..........#',
    '#..B..............K..............E.#',
    '#.................................B#',
    '####################################',
  ],
  areas: [
    { id: 'entrance', col: 1, row: 1, cols: 11, rows: 8 },
    { id: 'living', col: 13, row: 1, cols: 22, rows: 8 },
    { id: 'basement', col: 1, row: 10, cols: 34, rows: 9 },
  ],
  batteryCount: 3,
};
