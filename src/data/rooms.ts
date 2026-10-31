/**
 * Room layouts as text grids.
 * '#' wall · '.' floor · 'P' player start (floor) · 'E' possible enemy start (floor)
 * 'K' key (floor) · 'B' battery (floor) · 'D' exit door (solid until the run is won).
 */
export interface RoomDef {
  readonly id: string;
  readonly layout: readonly string[];
}

export const TEST_ROOM: RoomDef = {
  id: 'test',
  layout: [
    '####################',
    '#................K.#',
    '#..P...............#',
    '#..........##.....E#',
    '#....#..B..##......#',
    '#....#.............#',
    '#....#######.......#',
    '#..................#',
    '#..............#...D',
    '#..K..##.......#...#',
    '#.....##.......#####',
    '#...........K......#',
    '#E..........B.....E#',
    '####################',
  ],
};
