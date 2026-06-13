import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDamage, processCombat, checkLevelUp, applyAugmentEffect, applyStatusEffectTick, resetCombatRng } from '../../src/engine/CombatSystem';
import type { Player, Enemy, Augment, StatusEffect } from '../../src/types';

const makePlayer = (overrides?: Partial<Player>): Player => ({
  hp: 100, maxHp: 100, attack: 10, defense: 2, level: 1,
  xp: 0, xpToNext: 50, floor: 1, x: 5, y: 5,
  inventory: [], weapon: null, armor: null, augments: [], statusEffects: [],
  ...overrides,
});

const makeEnemy = (overrides?: Partial<Enemy>): Enemy => ({
  id: 'e_test', name: 'Test Enemy', type: 'normal',
  hp: 25, maxHp: 25, attack: 8, defense: 1,
  xpReward: 15, special: null, x: 6, y: 5,
  ...overrides,
});

// Use a seed whose first several rolls are all >= 0.1 (non-crit)
// so calculateDamage consistently returns base damage.
const NON_CRIT_SEED = 12778;

describe('calculateDamage', () => {
  beforeEach(() => {
    resetCombatRng(NON_CRIT_SEED);
  });

  it('should calculate atk - def, minimum 1', () => {
    expect(calculateDamage(10, 2)).toBe(8);
    expect(calculateDamage(5, 10)).toBe(1);
    expect(calculateDamage(3, 3)).toBe(1);
  });

  it('should return full atk when def is 0', () => {
    expect(calculateDamage(15, 0)).toBe(15);
  });
});

describe('processCombat', () => {
  it('should reduce enemy HP when player attacks', () => {
    const player = makePlayer();
    const enemy = makeEnemy();
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.enemyHp).toBeLessThan(enemy.hp);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should reduce player HP when enemy attacks back', () => {
    const player = makePlayer();
    const enemy = makeEnemy();
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.player.hp).toBeLessThan(player.hp);
  });

  it('should kill enemy when HP reaches 0', () => {
    const player = makePlayer({ attack: 100 });
    const enemy = makeEnemy({ hp: 1 });
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.isDead).toBe(true);
    expect(result.xpGained).toBeGreaterThan(0);
  });

  it('should kill player when HP reaches 0', () => {
    const player = makePlayer({ hp: 1 });
    const enemy = makeEnemy({ attack: 100 });
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.playerDead).toBe(true);
  });

  it('should grant XP on kill', () => {
    const player = makePlayer({ attack: 100, xp: 0 });
    const enemy = makeEnemy({ hp: 1, xpReward: 50 });
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.xpGained).toBe(50);
    expect(result.player.xp).toBe(50);
  });

  it('should trigger augment display for elite/boss kills', () => {
    const player = makePlayer({ attack: 100 });
    const enemy = makeEnemy({ hp: 1, type: 'elite' });
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.shouldShowAugments).toBe(true);
  });

  it('should NOT trigger augments for normal enemy kills', () => {
    const player = makePlayer({ attack: 100 });
    const enemy = makeEnemy({ hp: 1, type: 'normal' });
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.shouldShowAugments).toBe(false);
  });

  it('should apply lifesteal augment on kill', () => {
    const player = makePlayer({ attack: 100, hp: 50, maxHp: 100, augments: [{ id: 'a_dorm_god', name: '室友带饭', rarity: 'rare', effect: { stat: 'lifesteal', value: 4 }, description: '', stackable: false }] });
    const enemy = makeEnemy({ hp: 1 });
    const messages: string[] = [];
    const result = processCombat(player, enemy, messages);
    expect(result.player.hp).toBeGreaterThan(50); // healed by lifesteal
  });
});

describe('checkLevelUp', () => {
  it('should level up when XP reaches threshold', () => {
    const player = makePlayer({ xp: 50, xpToNext: 50, level: 1, maxHp: 100, hp: 80 });
    const updated = checkLevelUp(player);
    expect(updated.level).toBe(2);
    expect(updated.maxHp).toBeGreaterThan(100);
    expect(updated.attack).toBeGreaterThan(10);
    expect(updated.xp).toBe(0);
    expect(updated.xpToNext).toBe(75);
    expect(updated.hp).toBe(updated.maxHp); // full heal on level up
  });

  it('should not level up when XP insufficient', () => {
    const player = makePlayer({ xp: 40, xpToNext: 50 });
    const updated = checkLevelUp(player);
    expect(updated.level).toBe(1);
  });

  it('should cap at level 4', () => {
    const player = makePlayer({ xp: 200, xpToNext: 200, level: 4 });
    const updated = checkLevelUp(player);
    expect(updated.level).toBe(4);
  });
});

describe('applyAugmentEffect', () => {
  it('should increase maxHp and heal', () => {
    const player = makePlayer({ maxHp: 100, hp: 100 });
    const aug: Augment = { id: 'a_test', name: 'Test', rarity: 'common', effect: { stat: 'maxHp', value: 10 }, description: '', stackable: true };
    const updated = applyAugmentEffect(player, aug);
    expect(updated.maxHp).toBe(110);
    expect(updated.hp).toBe(110);
  });

  it('should increase attack', () => {
    const player = makePlayer({ attack: 10 });
    const aug: Augment = { id: 'a_test2', name: 'Test2', rarity: 'common', effect: { stat: 'attack', value: 3 }, description: '', stackable: true };
    const updated = applyAugmentEffect(player, aug);
    expect(updated.attack).toBe(13);
    expect(updated.augments.length).toBe(1);
  });
});

describe('applyStatusEffectTick', () => {
  it('should decrement remaining turns', () => {
    const effect: StatusEffect = { id: 'se_test', name: 'Slow', stat: 'speed', modifier: 0.5, remainingTurns: 3 };
    const updated = applyStatusEffectTick(effect);
    expect(updated!.remainingTurns).toBe(2);
  });

  it('should return null when effect expires', () => {
    const effect: StatusEffect = { id: 'se_test', name: 'Slow', stat: 'speed', modifier: 0.5, remainingTurns: 1 };
    const updated = applyStatusEffectTick(effect);
    expect(updated).toBeNull();
  });
});
