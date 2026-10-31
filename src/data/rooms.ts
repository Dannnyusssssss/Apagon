/**
 * Room layouts as text grids.
 * '#' wall · '.' floor · 'P' player start (floor) · 'E' possible enemy start (floor).
 */
export interface RoomDef {
  readonly id: string;
  readonly layout: readonly string[];
}

export const TEST_ROOM: RoomDef = {
  id: 'test',
  layout: [
    '####################',
    '#..................#',
    '#..P...............#',
    '#..........##.....E#',
    '#....#.....##......#',
    '#....#.............#',
    '#....#######.......#',
    '#..................#',
    '#..............#...#',
    '#.....##.......#...#',
    '#.....##.......#####',
    '#..................#',
    '#E................E#',
    '####################',
  ],
};
