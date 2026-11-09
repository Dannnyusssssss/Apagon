import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { HOUSE } from '../src/data/rooms';
import { createEnemy } from '../src/game/enemy';
import { createPlayer } from '../src/game/player';
import { enemyDirectionSystem, snapEnemyDirection } from '../src/game/systems/warning';
import { createWorld, resetWorld } from '../src/game/world';
import { firstEnemy } from './helpers';

const STEP = BALANCE.simulation.stepSeconds;
const RATE = BALANCE.warning.directionTurnRate;

describe('enemy direction (directional shade)', () => {
  it('ends up pointing at the enemy', () => {
    const player = createPlayer(100, 100, 14, 180);
    const enemy = createEnemy(15, 165);
    enemy.x = 100;
    enemy.y = 300;
    const dir = { x: 1, y: 0 };
    for (let i = 0; i < 120; i++) enemyDirectionSystem(player, enemy, dir, RATE, STEP);
    expect(dir.x).toBeCloseTo(0, 6);
    expect(dir.y).toBeCloseTo(1, 6);
  });

  it('turns at most the turn rate per second, so it never jumps sides', () => {
    const player = createPlayer(0, 0, 14, 180);
    const enemy = createEnemy(15, 165);
    enemy.x = -200;
    enemy.y = 1;
    const dir = { x: 1, y: 0 };
    enemyDirectionSystem(player, enemy, dir, RATE, STEP);
    expect(Math.abs(Math.atan2(dir.y, dir.x))).toBeCloseTo(RATE * STEP, 9);
    expect(Math.hypot(dir.x, dir.y)).toBeCloseTo(1, 9);
  });

  it('keeps the direction when the enemy is exactly on the player', () => {
    const player = createPlayer(50, 50, 14, 180);
    const enemy = createEnemy(15, 165);
    enemy.x = 50;
    enemy.y = 50;
    const dir = { x: 0, y: -1 };
    enemyDirectionSystem(player, enemy, dir, RATE, STEP);
    snapEnemyDirection(player, enemy, dir);
    expect(dir).toEqual({ x: 0, y: -1 });
  });

  it('points straight at the enemy after a world reset', () => {
    const world = createWorld(HOUSE, { seed: 7, reduceFlicker: false });
    world.enemyDirection.x = 1;
    world.enemyDirection.y = 0;
    resetWorld(world);
    const dx = firstEnemy(world).x - world.player.x;
    const dy = firstEnemy(world).y - world.player.y;
    const length = Math.hypot(dx, dy);
    expect(world.enemyDirection.x).toBeCloseTo(dx / length, 9);
    expect(world.enemyDirection.y).toBeCloseTo(dy / length, 9);
  });
});
