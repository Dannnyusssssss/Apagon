import { BALANCE } from '../data/balance';
import type { BatteryConfig } from './battery';
import type { EnemyConfig } from './systems/enemy';

/** Difficulty tied to the light shape. Built once; nothing is created per step. */
export interface LightModeProfile {
  readonly enemySpeed: number;
  readonly battery: BatteryConfig;
  readonly enemy: EnemyConfig;
}

const CONE = BALANCE.lightModes.cone;

/** Classic circle: the base values (the difficulty before the cone existed). */
const CLASSIC_PROFILE: LightModeProfile = {
  enemySpeed: BALANCE.enemy.speed,
  battery: BALANCE.battery,
  enemy: BALANCE.enemy,
};

/** Cone: rebalanced, because the beam stops the enemy less often. */
const CONE_PROFILE: LightModeProfile = {
  enemySpeed: CONE.enemySpeed,
  battery: { ...BALANCE.battery, drainSeconds: CONE.drainSeconds },
  enemy: { ...BALANCE.enemy, lightAdaptSeconds: CONE.lightAdaptSeconds },
};

export function lightModeProfile(classicLight: boolean): LightModeProfile {
  return classicLight ? CLASSIC_PROFILE : CONE_PROFILE;
}
