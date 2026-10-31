import { describe, expect, it } from 'vitest';
import {
  createEnemyAudioOutput,
  createEnemyAudioState,
  distanceGain,
  enemyBreathVolume,
  enemyStepInterval,
  enemyStepVolume,
  occlusionCutoff,
  resetEnemyAudio,
  stepOcclusion,
  stereoPan,
  updateEnemyAudio,
  type EnemyAudioConfig,
} from '../src/audio/spatial';
import { BALANCE } from '../src/data/balance';
import { createEnemy } from '../src/game/enemy';
import { createPlayer } from '../src/game/player';
import { parseRoom } from '../src/game/rooms';

const STEP = BALANCE.simulation.stepSeconds;
const CFG: EnemyAudioConfig = {
  ...BALANCE.enemyAudio,
  fastRatio: BALANCE.enemy.darkSpeedMultiplier,
};
const T = 48;

// Wall in column 4 (rows 1-3) between the left and right halves; the bottom row is open.
const ROOM = parseRoom(
  {
    id: 'spatial',
    layout: [
      '###################',
      '#P..#.............#',
      '#...#............E#',
      '#.K.#.............#',
      '#.................#',
      '#D#################',
    ],
  },
  T,
);

interface Point {
  x: number;
  y: number;
}

function center(col: number, row: number): Point {
  return { x: (col + 0.5) * T, y: (row + 0.5) * T };
}

interface RunResult {
  steps: number;
  breaths: number;
  stepVolume: number;
  breathVolume: number;
  gain: number;
}

/** Runs the enemy audio with the enemy moving at `ratio` of its speed (0 = standing still). */
function run(
  seconds: number,
  ratio: number,
  enemyAt = center(3, 1),
  playerAt = center(1, 1),
): RunResult {
  const player = createPlayer(playerAt.x, playerAt.y, 14, 180);
  const enemy = createEnemy(15, BALANCE.enemy.speed);
  const state = createEnemyAudioState();
  const out = createEnemyAudioOutput();
  const result: RunResult = { steps: 0, breaths: 0, stepVolume: 0, breathVolume: 0, gain: 0 };
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    // Only the distance moved in one step matters to the audio, so it shuffles on the spot.
    enemy.prevX = enemyAt.x;
    enemy.prevY = enemyAt.y;
    enemy.x = enemyAt.x;
    enemy.y = enemyAt.y + enemy.speed * ratio * STEP;
    updateEnemyAudio(state, CFG, ROOM, player, enemy, STEP, out);
    if (out.step) {
      result.steps++;
      result.stepVolume = out.stepVolume;
    }
    if (out.breath) {
      result.breaths++;
      result.breathVolume = out.breathVolume;
    }
    result.gain = out.gain;
  }
  return result;
}

function placeAt(enemy: ReturnType<typeof createEnemy>, at: Point): void {
  enemy.x = enemy.prevX = at.x;
  enemy.y = enemy.prevY = at.y;
}

describe('stereo pan', () => {
  it('is negative on the left, positive on the right and centered above or below', () => {
    expect(stereoPan(-200, 200, CFG.maxPan, CFG.panMinDistance)).toBeCloseTo(-CFG.maxPan, 9);
    expect(stereoPan(200, 200, CFG.maxPan, CFG.panMinDistance)).toBeCloseTo(CFG.maxPan, 9);
    expect(stereoPan(0, 150, CFG.maxPan, CFG.panMinDistance)).toBe(0);
  });

  it('is symmetric and never passes the max pan', () => {
    const cases: [number, number][] = [
      [30, 60],
      [100, 141],
      [5, 5],
      [300, 300],
    ];
    for (const [dx, d] of cases) {
      const right = stereoPan(dx, d, CFG.maxPan, CFG.panMinDistance);
      expect(stereoPan(-dx, d, CFG.maxPan, CFG.panMinDistance)).toBeCloseTo(-right, 9);
      expect(Math.abs(right)).toBeLessThanOrEqual(CFG.maxPan);
    }
  });

  it('shrinks very close, so it does not swap ears when on top of the player', () => {
    expect(Math.abs(stereoPan(4, 4, CFG.maxPan, CFG.panMinDistance))).toBeLessThan(0.1);
    expect(stereoPan(0, 0, CFG.maxPan, CFG.panMinDistance)).toBe(0);
  });
});

describe('distance gain', () => {
  it('is 1 touching, falls steadily and is 0 from the hearing distance', () => {
    expect(distanceGain(0, CFG.hearingDistance, CFG.distanceCurve)).toBe(1);
    let previous = 1;
    for (let d = 20; d < CFG.hearingDistance; d += 20) {
      const gain = distanceGain(d, CFG.hearingDistance, CFG.distanceCurve);
      expect(gain).toBeLessThan(previous);
      expect(gain).toBeGreaterThan(0);
      previous = gain;
    }
    expect(distanceGain(CFG.hearingDistance, CFG.hearingDistance, CFG.distanceCurve)).toBe(0);
    expect(distanceGain(1000, CFG.hearingDistance, CFG.distanceCurve)).toBe(0);
  });

  it('hears the enemy up to 8 tiles', () => {
    expect(CFG.hearingDistance).toBe(8 * BALANCE.world.tileSize);
  });
});

describe('occlusion', () => {
  it('moves gradually toward muffled and back', () => {
    const once = stepOcclusion(0, true, CFG.occlusionRate, STEP);
    expect(once).toBeGreaterThan(0);
    expect(once).toBeLessThan(0.2);
    let value = 0;
    for (let i = 0; i < 60; i++) value = stepOcclusion(value, true, CFG.occlusionRate, STEP);
    expect(value).toBe(1);
    for (let i = 0; i < 60; i++) value = stepOcclusion(value, false, CFG.occlusionRate, STEP);
    expect(value).toBe(0);
  });

  it('lowers the cutoff from open to muffled', () => {
    expect(occlusionCutoff(0, CFG.openCutoff, CFG.occludedCutoff)).toBeCloseTo(CFG.openCutoff, 6);
    expect(occlusionCutoff(1, CFG.openCutoff, CFG.occludedCutoff)).toBeCloseTo(
      CFG.occludedCutoff,
      6,
    );
    const half = occlusionCutoff(0.5, CFG.openCutoff, CFG.occludedCutoff);
    expect(half).toBeLessThan(CFG.openCutoff);
    expect(half).toBeGreaterThan(CFG.occludedCutoff);
  });

  it('muffles and quiets the enemy behind a wall, using the line of sight', () => {
    const at = center(3, 1);
    const player = createPlayer(at.x, at.y, 14, 180);
    const enemy = createEnemy(15, BALANCE.enemy.speed);
    placeAt(enemy, center(5, 1));
    const state = createEnemyAudioState();
    const out = createEnemyAudioOutput();
    updateEnemyAudio(state, CFG, ROOM, player, enemy, STEP, out);
    // The first step only starts to muffle: no sudden change.
    expect(out.cutoff).toBeLessThan(CFG.openCutoff);
    expect(out.cutoff).toBeGreaterThan(CFG.occludedCutoff * 2);
    for (let i = 0; i < 60; i++) updateEnemyAudio(state, CFG, ROOM, player, enemy, STEP, out);
    expect(out.cutoff).toBeCloseTo(CFG.occludedCutoff, 6);
    const clearGain = distanceGain(2 * T, CFG.hearingDistance, CFG.distanceCurve);
    expect(out.gain).toBeCloseTo(clearGain * CFG.occludedGain, 9);
  });

  it('keeps a clear line unmuffled', () => {
    const at = center(1, 1);
    const player = createPlayer(at.x, at.y, 14, 180);
    const enemy = createEnemy(15, BALANCE.enemy.speed);
    placeAt(enemy, center(3, 2));
    const state = createEnemyAudioState();
    const out = createEnemyAudioOutput();
    for (let i = 0; i < 30; i++) updateEnemyAudio(state, CFG, ROOM, player, enemy, STEP, out);
    expect(out.cutoff).toBeCloseTo(CFG.openCutoff, 6);
    expect(out.pan).toBeGreaterThan(0);
  });
});

describe('enemy footsteps', () => {
  it('stay silent while it stands still', () => {
    expect(enemyStepInterval(0, CFG)).toBe(Infinity);
    expect(run(5, 0).steps).toBe(0);
  });

  it('come faster and louder in the dark than at normal speed', () => {
    const dark = BALANCE.enemy.darkSpeedMultiplier;
    expect(enemyStepInterval(dark, CFG)).toBeLessThan(enemyStepInterval(1, CFG));
    expect(enemyStepVolume(dark, CFG)).toBeGreaterThan(enemyStepVolume(1, CFG));
    expect(run(10, dark).steps).toBeGreaterThan(run(10, 1).steps);
  });

  it('are slow and soft while creeping in the light, never slower than the cap', () => {
    const creep = BALANCE.enemy.creepFraction;
    expect(enemyStepInterval(creep, CFG)).toBeGreaterThan(enemyStepInterval(1, CFG));
    expect(enemyStepInterval(creep, CFG)).toBeLessThanOrEqual(CFG.stepMaxInterval);
    expect(enemyStepVolume(creep, CFG)).toBeLessThan(enemyStepVolume(1, CFG));
    const slow = run(10, creep);
    expect(slow.steps).toBeGreaterThan(0);
    expect(slow.steps).toBeLessThan(run(10, 1).steps);
  });

  it('stay quieter than the player footsteps', () => {
    expect(CFG.stepVolumeFast).toBeLessThan(BALANCE.audio.stepVolume);
  });
});

describe('enemy breath', () => {
  it('keeps breathing, very low, while standing still', () => {
    const still = run(10, 0);
    expect(still.breaths).toBeGreaterThan(0);
    expect(still.breathVolume).toBeCloseTo(CFG.breathVolume * CFG.stillBreathFraction, 9);
    expect(enemyBreathVolume(false, CFG)).toBeLessThan(enemyBreathVolume(true, CFG));
  });

  it('breathes more often while moving', () => {
    expect(run(20, 1).breaths).toBeGreaterThan(run(20, 0).breaths);
  });

  it('is not heard at all beyond 8 tiles', () => {
    const far = run(10, 1, center(17, 2), center(1, 4));
    expect(far.gain).toBe(0);
    expect(far.breaths).toBe(0);
    expect(far.steps).toBe(0);
  });

  it('starts over with a reset', () => {
    const state = createEnemyAudioState();
    state.occlusion = 1;
    state.stepTimer = 0.3;
    state.breathTimer = 2;
    resetEnemyAudio(state);
    expect(state).toEqual(createEnemyAudioState());
  });
});
