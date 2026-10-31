/**
 * What happened during logic steps, for sound and other feedback.
 * Counters are added by the world and cleared by whoever reads them,
 * so nothing is allocated per step.
 */
export interface WorldEvents {
  keyPicked: number;
  batteryPicked: number;
  doorLocked: number;
  doorOpened: number;
  caught: number;
  /** The enemy entered the light (start of a flicker). */
  enemyLit: number;
  lightToggled: number;
  batteryEmptied: number;
  /** True when the player moved in the last step. */
  moving: boolean;
}

export function createEvents(): WorldEvents {
  return {
    keyPicked: 0,
    batteryPicked: 0,
    doorLocked: 0,
    doorOpened: 0,
    caught: 0,
    enemyLit: 0,
    lightToggled: 0,
    batteryEmptied: 0,
    moving: false,
  };
}

export function clearEvents(events: WorldEvents): void {
  events.keyPicked = 0;
  events.batteryPicked = 0;
  events.doorLocked = 0;
  events.doorOpened = 0;
  events.caught = 0;
  events.enemyLit = 0;
  events.lightToggled = 0;
  events.batteryEmptied = 0;
  events.moving = false;
}
