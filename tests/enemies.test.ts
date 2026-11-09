import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { RoomDef } from '../src/data/rooms';
import { lightModeProfile } from '../src/game/lightModes';
import { nearestEnemy } from '../src/game/systems/warning';
import {
  createWorld,
  resetWorld,
  setLightMode,
  stepWorld,
  type StepInput,
  type World,
} from '../src/game/world';

const STEP = BALANCE.simulation.stepSeconds;
const IDLE: StepInput = { axisX: 0, axisY: 0, toggleFlashlight: false, interact: false };

const ROOM: RoomDef = {
  id: 'field',
  layout: [
    '##############################',
    '#P...........................#',
    '#............................#',
    '#............................#',
    '#E..........................E#',
    '#............................#',
    '#E.........................K.#',
    '#D############################',
  ],
};

const T = BALANCE.world.tileSize;

function twoEnemies(seed = 1, classicLight = false): World {
  return createWorld(ROOM, { seed, reduceFlicker: false, classicLight, tuning: { enemyCount: 2 } });
}

/** Both enemies of a two-enemy world. */
function pair(w: World): [World['nearestEnemy'], World['nearestEnemy']] {
  const [a, b] = w.enemies;
  if (!a || !b) throw new Error('Expected two enemies');
  return [a, b];
}

/** Sets everything still except what the test moves: light off, enemies ready. */
function release(w: World): void {
  for (const enemy of w.enemies) enemy.startTimer = 0;
}

describe('several enemies in a world', () => {
  it('creates as many as the level asks for, one by default', () => {
    expect(createWorld(ROOM, { seed: 1, reduceFlicker: false }).enemies).toHaveLength(1);
    expect(twoEnemies().enemies).toHaveLength(2);
  });

  it('rejects a count the map has no starts for', () => {
    for (const enemyCount of [0, -1, 1.5, 4]) {
      expect(() =>
        createWorld(ROOM, { seed: 1, reduceFlicker: false, tuning: { enemyCount } }),
      ).toThrow();
    }
  });

  it('always starts them at different spots', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const [a, b] = pair(twoEnemies(seed));
      expect(a.x !== b.x || a.y !== b.y).toBe(true);
    }
  });

  it('makes the second one wait longer, again after each reset', () => {
    const w = twoEnemies();
    const check = (): void => {
      const [a, b] = pair(w);
      expect(a.startTimer).toBe(BALANCE.enemy.startDelaySeconds);
      expect(b.startTimer).toBe(
        BALANCE.enemy.startDelaySeconds + BALANCE.enemy.extraStartDelaySeconds,
      );
    };
    check();
    stepWorld(w, IDLE, STEP);
    resetWorld(w);
    check();
  });

  it('repeats the same starts for the same seed', () => {
    const [a1, b1] = pair(twoEnemies(9));
    const [a2, b2] = pair(twoEnemies(9));
    expect([a1.x, a1.y, b1.x, b1.y]).toEqual([a2.x, a2.y, b2.x, b2.y]);
  });

  it('applies the speed of the mode and the level to all of them', () => {
    const w = createWorld(ROOM, {
      seed: 1,
      reduceFlicker: false,
      tuning: { enemyCount: 2, enemySpeedFactor: 1.5, batterySecondsFactor: 0.5 },
    });
    const cone = lightModeProfile(false);
    const classic = lightModeProfile(true);
    for (const enemy of w.enemies) expect(enemy.speed).toBe(cone.enemySpeed * 1.5);
    expect(w.battery.drainSeconds).toBe(cone.battery.drainSeconds * 0.5);
    setLightMode(w, true);
    for (const enemy of w.enemies) expect(enemy.speed).toBe(classic.enemySpeed * 1.5);
    expect(w.battery.drainSeconds).toBe(classic.battery.drainSeconds * 0.5);
  });

  it('drains the battery at the pace of the level', () => {
    const w = createWorld(ROOM, {
      seed: 1,
      reduceFlicker: false,
      godMode: true,
      tuning: { batterySecondsFactor: 0.5 },
    });
    const seconds = lightModeProfile(false).battery.drainSeconds * 0.25;
    for (let i = 0; i < Math.round(seconds / STEP); i++) stepWorld(w, IDLE, STEP);
    expect(w.flashlight.battery).toBeCloseTo(0.5, 2);
  });
});

describe('their own light state', () => {
  /** Player at the center aiming right: `lit` is ahead, `other` behind. */
  function aimed(): { w: World; lit: World['nearestEnemy']; other: World['nearestEnemy'] } {
    const w = twoEnemies();
    const [lit, other] = pair(w);
    release(w);
    w.player.x = w.player.prevX = 14.5 * T;
    w.player.y = w.player.prevY = 3.5 * T;
    w.player.facingX = 1;
    w.player.facingY = 0;
    w.flashlight.aim = w.flashlight.prevAim = 0;
    lit.x = lit.prevX = w.player.x + 2 * T;
    lit.y = lit.prevY = w.player.y;
    other.x = other.prevX = w.player.x - 6 * T;
    other.y = other.prevY = w.player.y;
    return { w, lit, other };
  }

  it('freezes only the one in the beam', () => {
    const { w, lit, other } = aimed();
    const litX = lit.x;
    const otherX = other.x;
    for (let i = 0; i < 30; i++) stepWorld(w, IDLE, STEP);
    expect(lit.lit).toBe(true);
    expect(other.lit).toBe(false);
    expect(lit.x).toBe(litX);
    expect(other.x).toBeGreaterThan(otherX);
  });

  it('builds the habit of light only in the one that is lit', () => {
    const { w, lit, other } = aimed();
    for (let i = 0; i < 30; i++) stepWorld(w, IDLE, STEP);
    expect(lit.litTime).toBeGreaterThan(0);
    expect(other.litTime).toBe(0);
  });

  it('counts each enemy entering the light', () => {
    const { w, lit, other } = aimed();
    other.x = other.prevX = lit.x;
    other.y = other.prevY = lit.y + T;
    stepWorld(w, IDLE, STEP);
    expect(w.events.enemyLit).toBe(2);
  });

  it('flickers while any of them is lit', () => {
    const { w } = aimed();
    let dimmed = false;
    for (let i = 0; i < 60; i++) {
      stepWorld(w, IDLE, STEP);
      if (w.flashlight.strength < 1) dimmed = true;
    }
    expect(dimmed).toBe(true);
  });
});

describe('catching', () => {
  it('ends the run when any of them reaches the player', () => {
    for (const index of [0, 1]) {
      const w = twoEnemies();
      const enemy = w.enemies[index];
      if (!enemy) throw new Error('missing enemy');
      enemy.x = w.player.x;
      enemy.y = w.player.y;
      stepWorld(w, IDLE, STEP);
      expect(w.status).toBe('lost');
      expect(w.events.caught).toBe(1);
    }
  });
});

describe('nearest enemy', () => {
  it('finds the closest one', () => {
    const w = twoEnemies();
    const [a, b] = pair(w);
    a.x = w.player.x + 300;
    a.y = w.player.y;
    b.x = w.player.x + 100;
    b.y = w.player.y;
    expect(nearestEnemy(w.player, w.enemies, a)).toBe(b);
    b.x = w.player.x + 500;
    expect(nearestEnemy(w.player, w.enemies, b)).toBe(a);
  });

  it('keeps the current one on a tie, so the sound does not hop', () => {
    const w = twoEnemies();
    const [a, b] = pair(w);
    a.x = w.player.x + 200;
    a.y = w.player.y;
    b.x = w.player.x - 200;
    b.y = w.player.y;
    expect(nearestEnemy(w.player, w.enemies, a)).toBe(a);
    expect(nearestEnemy(w.player, w.enemies, b)).toBe(b);
  });

  it('drives the warning level and the direction in the world', () => {
    const w = twoEnemies();
    const [a, b] = pair(w);
    for (const enemy of w.enemies) enemy.startTimer = 1e9;
    a.x = w.player.x + 20 * T;
    a.y = w.player.y;
    b.x = w.player.x + 2 * T;
    b.y = w.player.y;
    stepWorld(w, IDLE, STEP);
    expect(w.nearestEnemy).toBe(b);
    expect(w.enemyNear).toBeGreaterThan(0.5);
  });
});

describe('keeping them apart', () => {
  /** Runs with both enemies chasing and the light off, returns the final gap. */
  function chase(startGap: number): number {
    const w = createWorld(ROOM, {
      seed: 1,
      reduceFlicker: false,
      godMode: true,
      tuning: { enemyCount: 2 },
    });
    const [a, b] = pair(w);
    release(w);
    w.flashlight.on = false;
    a.x = a.prevX = 20.5 * T;
    a.y = a.prevY = 4.5 * T;
    b.x = b.prevX = a.x + startGap;
    b.y = b.prevY = a.y;
    for (let i = 0; i < 180; i++) stepWorld(w, IDLE, STEP);
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  it('stops two enemies on the same spot from merging', () => {
    expect(chase(0)).toBeGreaterThan(BALANCE.enemy.separationDistance * 0.5);
  });

  it('pulls apart two that start close', () => {
    expect(chase(10)).toBeGreaterThan(BALANCE.enemy.separationDistance * 0.5);
  });

  it('never moves an enemy held by the light', () => {
    const w = twoEnemies();
    const [a, b] = pair(w);
    release(w);
    w.player.x = w.player.prevX = 5.5 * T;
    w.player.y = w.player.prevY = 3.5 * T;
    w.player.facingX = 1;
    w.player.facingY = 0;
    w.flashlight.aim = w.flashlight.prevAim = 0;
    // Both in the beam, one right behind the other.
    a.x = a.prevX = w.player.x + 2 * T;
    a.y = a.prevY = w.player.y;
    b.x = b.prevX = a.x + 20;
    b.y = b.prevY = a.y;
    const bx = b.x;
    const ax = a.x;
    for (let i = 0; i < 30; i++) stepWorld(w, IDLE, STEP);
    expect(a.x).toBe(ax);
    expect(b.x).toBe(bx);
  });

  it('does not change anything with a single enemy', () => {
    const w = createWorld(ROOM, { seed: 2, reduceFlicker: false, godMode: true });
    const enemy = w.enemies[0];
    if (!enemy) throw new Error('missing enemy');
    enemy.startTimer = 1e9;
    const { x, y } = enemy;
    for (let i = 0; i < 30; i++) stepWorld(w, IDLE, STEP);
    expect([enemy.x, enemy.y]).toEqual([x, y]);
  });

  it('never pushes the front enemy toward the player', () => {
    const w = twoEnemies();
    const [front, rear] = pair(w);
    for (const enemy of w.enemies) enemy.startTimer = 0;
    // Enemies frozen by nothing, on a line right of the player: the rear one gives way.
    w.player.x = w.player.prevX = 2.5 * T;
    w.player.y = w.player.prevY = 3.5 * T;
    w.player.facingX = -1;
    w.player.facingY = 0;
    w.flashlight.aim = w.flashlight.prevAim = Math.PI;
    front.x = front.prevX = 15.5 * T;
    front.y = front.prevY = 3.5 * T;
    rear.x = rear.prevX = front.x + 10;
    rear.y = rear.prevY = front.y;
    const speed = front.speed * STEP;
    const startX = front.x;
    stepWorld(w, IDLE, STEP);
    expect(startX - front.x).toBeLessThanOrEqual(speed + 1e-9);
  });
});
