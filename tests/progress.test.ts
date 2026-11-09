import { describe, expect, it } from 'vitest';
import {
  addAttemptTime,
  canContinue,
  continueRun,
  debugRun,
  newGameRun,
  recordLevelWin,
  type ProgressRecord,
} from '../src/save/progress';

const LEVELS = 3;

function emptyRecord(): ProgressRecord {
  return { unlockedLevel: 1, bestLevelTimes: [null, null, null], bestFullRunSeconds: null };
}

describe('starting a run', () => {
  it('"New game" starts at the first level and counts as a full run', () => {
    expect(newGameRun(true)).toEqual({
      levelIndex: 0,
      fullRun: true,
      recording: true,
      totalSeconds: 0,
    });
  });

  it('"Continue" starts at the highest level and never counts as a full run', () => {
    const run = continueRun(3, true);
    expect(run.levelIndex).toBe(2);
    expect(run.fullRun).toBe(false);
  });

  it('offers "Continue" only with progress', () => {
    expect(canContinue(emptyRecord())).toBe(false);
    expect(canContinue({ ...emptyRecord(), unlockedLevel: 2 })).toBe(true);
  });
});

describe('recordLevelWin', () => {
  it('unlocks the next level and keeps the best time', () => {
    const record = emptyRecord();
    const run = newGameRun(true);
    addAttemptTime(run, 50);
    const first = recordLevelWin(run, record, 50, LEVELS);
    expect(record.unlockedLevel).toBe(2);
    expect(record.bestLevelTimes[0]).toBe(50);
    expect(first).toMatchObject({
      bestLevelSeconds: 50,
      newLevelBest: true,
      finished: false,
      changed: true,
    });

    const slower = recordLevelWin(run, record, 70, LEVELS);
    expect(record.bestLevelTimes[0]).toBe(50);
    expect(slower).toMatchObject({ bestLevelSeconds: 50, newLevelBest: false, changed: false });
  });

  it('never lowers the unlocked level when an earlier level is won again', () => {
    const record = { ...emptyRecord(), unlockedLevel: 3 };
    recordLevelWin(newGameRun(true), record, 40, LEVELS);
    expect(record.unlockedLevel).toBe(3);
  });

  it('does not unlock past the last level', () => {
    const record = { ...emptyRecord(), unlockedLevel: 3 };
    const result = recordLevelWin(continueRun(3, true), record, 40, LEVELS);
    expect(record.unlockedLevel).toBe(3);
    expect(result.finished).toBe(true);
  });

  it('saves the full run only when the game was played from the start', () => {
    const record = emptyRecord();
    const run = newGameRun(true);
    for (const seconds of [50, 60, 70]) {
      addAttemptTime(run, seconds);
      const result = recordLevelWin(run, record, seconds, LEVELS);
      if (result.finished) {
        expect(result.newFullRunBest).toBe(true);
        expect(result.bestFullRunSeconds).toBe(180);
      } else {
        run.levelIndex++;
      }
    }
    expect(record.bestFullRunSeconds).toBe(180);
    expect(record.bestLevelTimes).toEqual([50, 60, 70]);

    const continued = continueRun(3, true);
    addAttemptTime(continued, 10);
    const result = recordLevelWin(continued, record, 10, LEVELS);
    expect(result.newFullRunBest).toBe(false);
    expect(record.bestFullRunSeconds).toBe(180);
    // The level itself did improve.
    expect(record.bestLevelTimes[2]).toBe(10);
  });

  it('counts failed attempts in the full run, so dying costs time', () => {
    const record = emptyRecord();
    const run = newGameRun(true);
    run.levelIndex = 2;
    addAttemptTime(run, 30); // caught
    addAttemptTime(run, 40); // won
    recordLevelWin(run, record, 40, LEVELS);
    expect(record.bestFullRunSeconds).toBe(70);
    // Only the winning attempt counts for the level.
    expect(record.bestLevelTimes[2]).toBe(40);
  });

  it('leaves the saved progress alone while debugging', () => {
    const record = { ...emptyRecord(), bestLevelTimes: [null, 90, null] };
    const run = debugRun(2);
    expect(run.levelIndex).toBe(1);
    addAttemptTime(run, 5);
    const result = recordLevelWin(run, record, 5, LEVELS);
    expect(record).toEqual({ ...emptyRecord(), bestLevelTimes: [null, 90, null] });
    expect(result).toMatchObject({ bestLevelSeconds: 90, newLevelBest: false, changed: false });
  });
});
