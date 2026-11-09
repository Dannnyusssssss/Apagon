import { HOUSE, type RoomDef } from './rooms';

export type LevelId = 'house' | 'deep' | 'forest';

/** How the exit looks and how the prompt names it. Works the same in every level. */
export type ExitKind = 'door' | 'gate';

/** Ground and wall colors of a level. */
export interface LevelPalette {
  readonly background: string;
  readonly floor: string;
  readonly floorLine: string;
  readonly wall: string;
  readonly wallTop: string;
  readonly wallShadow: string;
}

/**
 * Difficulty of a level. Factors multiply the values of the active light mode,
 * so a level works with the cone and with the classic light.
 * Values left out come from `BALANCE.levels`.
 */
export interface LevelTuning {
  readonly enemyCount?: number;
  readonly enemySpeedFactor?: number;
  /** Multiplies the seconds of light from a full charge. */
  readonly batterySecondsFactor?: number;
}

export interface LevelDef extends LevelTuning {
  readonly id: LevelId;
  readonly room: RoomDef;
  readonly palette: LevelPalette;
  readonly exit: ExitKind;
  /**
   * How far the drawn light enters solid tiles, under one tile so it never shows what is
   * behind them. Only the look: what the light touches is decided in the game logic.
   * Left out, it comes from `BALANCE.visibility.wallPenetration`.
   */
  readonly lightPenetration?: number;
}

/**
 * The deep basement: rooms joined by narrow tunnels with several loops.
 * West, center and east hold one key each. Fewer batteries than the house.
 */
const DEEP: RoomDef = {
  id: 'deep',
  layout: [
    '########################################',
    '#........###........###.......##.......#',
    '#.P......###......K...........##....E..#',
    '#...##.........##...###...#...##.......#',
    '#...##.......B......###...#........#...#',
    '#........###........###.......##...#...#',
    '#B.....K.######.#######.B...K.##...#...#',
    '###..##########.#######.......##.......#',
    '###..######.........#####.######.B...K.#',
    '###..######.......B.#####.######.......#',
    '#.......###...###...#####.#########..###',
    '#.....B.......###...###......######..###',
    '#.......###.K..............K.######..###',
    '#.......###.........###..##..###.......#',
    '#.K.....#########.#####..##............#',
    '#.......#########.#####.E....###.B.....#',
    '####.############.#####......###.....K.#',
    '####.#########.......#####.#####.......#',
    '#..........###.......#####.#########.###',
    '#..........###...#...###........####.###',
    '#....##..........#.........##...##.....#',
    '#..........###.B............E..........D',
    '#........K.###.....K.###........##.....#',
    '########################################',
  ],
  areas: [
    { id: 'west', col: 1, row: 1, cols: 10, rows: 22 },
    { id: 'center', col: 11, row: 1, cols: 12, rows: 22 },
    { id: 'east', col: 23, row: 1, cols: 16, rows: 22 },
  ],
  batteryCount: 2,
};

/**
 * The forest at night: open ground with trees and rocks, split by long lines of
 * trees with gaps. Clearing (start), thicket and old road hold one key each.
 * The exit is a gate on the east side. Two enemies with separate starts.
 */
const FOREST: RoomDef = {
  id: 'forest',
  layout: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T.............T..............T.............T',
    'T.............T..........T.T.T........R.T..T',
    'T.....K.......T..............T.T...K.......T',
    'T..T..........T.....E....K.R.T.............T',
    'T.....K.......T.T..........................D',
    'T........T....T....K.R..T..R..T............T',
    'T......T...R..T........................E...T',
    'T................TTTTTTTTT...T..K.....T.R..T',
    'T..TTTTTTTT...T..............T......K......T',
    'T....................T..B....T....T....B...T',
    'T..T..........T..............T.............T',
    'T....T..T.....T...K..T..T....T...TTTTTTTT..T',
    'T.K...........T..............T.T...........T',
    'T......T......T.T.....E......T...........T.T',
    'T....T....K...T.........T....T.T.R.........T',
    'T.............T.T.........K................T',
    'T....B.................R....R..T.....K.....T',
    'T...........B..............................T',
    'T.T.....T........TTTTTTTTT.T.T......R......T',
    'T....R....T...T..............T...B.....B...T',
    'T.......K.....T............T.T.T.........R.T',
    'T.T.T.........T...T..B.......T...T.........T',
    'T.............T............K.T..........E..T',
    'T..P..........T..T.R..K..T...T.T...........T',
    'T.......T..K..T............R.T...K..T....R.T',
    'T.............T..............T.............T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  areas: [
    { id: 'clearing', col: 1, row: 1, cols: 13, rows: 26 },
    { id: 'thicket', col: 15, row: 1, cols: 14, rows: 26 },
    { id: 'road', col: 30, row: 1, cols: 13, rows: 26 },
  ],
  batteryCount: 4,
};

/** The levels, in play order. The cover and the first screen belong to the first one. */
export const LEVELS: readonly LevelDef[] = [
  {
    id: 'house',
    room: HOUSE,
    exit: 'door',
    palette: {
      background: '#050506',
      floor: '#2a2621',
      floorLine: 'rgba(0, 0, 0, 0.35)',
      wall: '#4b4f58',
      wallTop: '#6b707c',
      wallShadow: 'rgba(0, 0, 0, 0.45)',
    },
  },
  {
    id: 'deep',
    room: DEEP,
    exit: 'door',
    enemySpeedFactor: 1.06,
    batterySecondsFactor: 0.85,
    palette: {
      background: '#030505',
      floor: '#1e2523',
      floorLine: 'rgba(0, 0, 0, 0.4)',
      wall: '#39473f',
      wallTop: '#587064',
      wallShadow: 'rgba(0, 0, 0, 0.5)',
    },
  },
  {
    id: 'forest',
    room: FOREST,
    exit: 'gate',
    enemyCount: 2,
    // Enough to see the crowns and the rocks, not only their shadows.
    lightPenetration: 34,
    palette: {
      background: '#020403',
      floor: '#17241a',
      floorLine: 'rgba(0, 0, 0, 0.12)',
      wall: '#101a12',
      wallTop: '#22352a',
      wallShadow: 'rgba(0, 0, 0, 0.35)',
    },
  },
];

export const LEVEL_COUNT = LEVELS.length;

/** The level at a position in the play order, always a valid one. */
export function levelAt(index: number): LevelDef {
  const level = LEVELS[Math.min(LEVEL_COUNT - 1, Math.max(0, index))];
  if (!level) throw new Error('No levels defined');
  return level;
}
