import { isNewBest, type SaveData } from './storage';

/** What is kept between visits: the highest level reached and the best times. */
export type ProgressRecord = Pick<
  SaveData,
  'unlockedLevel' | 'bestLevelTimes' | 'bestFullRunSeconds'
>;

/** The game being played now. Lost on reload, by design. */
export interface RunProgress {
  /** Position in the play order (0 is the first level). */
  levelIndex: number;
  /** Started with "New game": its total can become the best full run. */
  readonly fullRun: boolean;
  /** False while debugging: nothing of this run reaches the record. */
  readonly recording: boolean;
  /** Seconds played in this run, failed attempts included: dying must cost time. */
  totalSeconds: number;
}

export function newGameRun(recording: boolean): RunProgress {
  return { levelIndex: 0, fullRun: true, recording, totalSeconds: 0 };
}

/** Plays from the highest unlocked level. Never counts as a full run. */
export function continueRun(unlockedLevel: number, recording: boolean): RunProgress {
  return { levelIndex: unlockedLevel - 1, fullRun: false, recording, totalSeconds: 0 };
}

/** Jumps to a level for testing; the saved progress stays as it is. */
export function debugRun(levelNumber: number): RunProgress {
  return { levelIndex: levelNumber - 1, fullRun: false, recording: false, totalSeconds: 0 };
}

/** True when there is progress to continue from. */
export function canContinue(record: ProgressRecord): boolean {
  return record.unlockedLevel > 1;
}

/** Adds an attempt to the run total, whether it was won or lost. */
export function addAttemptTime(run: RunProgress, seconds: number): void {
  run.totalSeconds += seconds;
}

export interface LevelResult {
  /** Best time of this level, after counting this attempt. */
  readonly bestLevelSeconds: number | null;
  readonly newLevelBest: boolean;
  /** True when this was the last level. */
  readonly finished: boolean;
  readonly bestFullRunSeconds: number | null;
  readonly newFullRunBest: boolean;
  /** True when the record changed and has to be saved. */
  readonly changed: boolean;
}

/**
 * Counts a won level: unlocks the next one and updates the best times.
 * Call it after `addAttemptTime`, so the run total includes this attempt.
 */
export function recordLevelWin(
  run: RunProgress,
  record: ProgressRecord,
  seconds: number,
  levelCount: number,
): LevelResult {
  const { levelIndex } = run;
  const finished = levelIndex >= levelCount - 1;
  const previousBest = record.bestLevelTimes[levelIndex] ?? null;
  if (!run.recording) {
    return {
      bestLevelSeconds: previousBest,
      newLevelBest: false,
      finished,
      bestFullRunSeconds: record.bestFullRunSeconds,
      newFullRunBest: false,
      changed: false,
    };
  }

  const newLevelBest = isNewBest(seconds, previousBest);
  if (newLevelBest) record.bestLevelTimes[levelIndex] = seconds;

  const unlocked = Math.min(levelCount, levelIndex + 2);
  const newUnlock = unlocked > record.unlockedLevel;
  if (newUnlock) record.unlockedLevel = unlocked;

  const newFullRunBest =
    finished && run.fullRun && isNewBest(run.totalSeconds, record.bestFullRunSeconds);
  if (newFullRunBest) record.bestFullRunSeconds = run.totalSeconds;

  return {
    bestLevelSeconds: newLevelBest ? seconds : previousBest,
    newLevelBest,
    finished,
    bestFullRunSeconds: record.bestFullRunSeconds,
    newFullRunBest,
    changed: newLevelBest || newUnlock || newFullRunBest,
  };
}
