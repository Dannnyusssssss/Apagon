/** Face of the player character, from calm to scared. */
export type Mood = 'calm' | 'worried' | 'scared';

export interface MoodConfig {
  /** Battery at or below which the character looks worried / scared. */
  readonly worriedBattery: number;
  readonly scaredBattery: number;
  /** "Enemy near" level at or above which the character looks worried / scared. */
  readonly worriedNear: number;
  readonly scaredNear: number;
}

/** The scariest of what the battery and the enemy suggest. */
export function playerMood(battery: number, enemyNear: number, config: MoodConfig): Mood {
  if (battery <= config.scaredBattery || enemyNear >= config.scaredNear) return 'scared';
  if (battery <= config.worriedBattery || enemyNear >= config.worriedNear) return 'worried';
  return 'calm';
}
