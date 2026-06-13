import type { Player, Enemy, Augment, StatusEffect } from '../types';

// ──────────────── Types ────────────────

export interface CombatResult {
  player: Player;
  enemyHp: number;
  isDead: boolean;
  playerDead: boolean;
  xpGained: number;
  shouldShowAugments: boolean;
  droppedItems: string[];
}

// ──────────────── Seeded RNG ────────────────

let _seed = 1;

/** Reset the seeded RNG — exposed for tests. */
export function resetCombatRng(seed?: number): void {
  _seed = seed ?? 1;
}

function seededRandom(): number {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}

// ──────────────── Damage Calculation ────────────────

/**
 * Damage = max(1, attacker.atk - defender.def)
 * Crit: 10% chance x1.5 damage (floor)
 */
export function calculateDamage(atk: number, def: number): number {
  const base = Math.max(1, atk - def);
  const roll = seededRandom();
  if (roll < 0.1) {
    return Math.floor(base * 1.5);
  }
  return base;
}

/**
 * Calculate damage and return whether it was a crit.
 */
function calculateDamageWithCrit(atk: number, def: number): { damage: number; isCrit: boolean } {
  const base = Math.max(1, atk - def);
  const roll = seededRandom();
  if (roll < 0.1) {
    return { damage: Math.floor(base * 1.5), isCrit: true };
  }
  return { damage: base, isCrit: false };
}

// ──────────────── Augment Helpers ────────────────

function hasLifesteal(player: Player): boolean {
  return player.augments.some(a => a.effect.stat === 'lifesteal');
}

function getLifestealValue(player: Player): number {
  const aug = player.augments.find(a => a.effect.stat === 'lifesteal');
  return aug ? aug.effect.value : 0;
}

function getXpMultiplier(player: Player): number {
  const aug = player.augments.find(a => a.effect.stat === 'xpMultiplier');
  if (!aug) return 1;
  return aug.effect.value;
}

function hasDeathSave(player: Player): boolean {
  return player.augments.some(a => a.effect.stat === 'deathSave');
}

function getDodgeChance(player: Player): number {
  const aug = player.augments.find(a => a.effect.stat === 'dodgeChance');
  if (!aug) return 0;
  // Apply status effect modifier to dodge
  const dodgeEffect = player.statusEffects.find(s => s.stat === 'dodgeChance');
  let base = aug.effect.value;
  if (dodgeEffect) {
    base *= dodgeEffect.modifier;
  }
  return base;
}

function removeDeathSaveAugment(player: Player): Player {
  const idx = player.augments.findIndex(a => a.effect.stat === 'deathSave');
  if (idx < 0) return player;
  return {
    ...player,
    augments: player.augments.filter((_, i) => i !== idx),
  };
}

// ──────────────── Core Combat Logic ────────────────

/**
 * Process a single round of combat between the player and an enemy.
 *
 * Flow:
 * 1. Player attacks enemy (with possible crit)
 * 2. Check if enemy died
 * 3. If enemy alive: enemy attacks back (with dodge, special abilities, extra strikes)
 * 4. Check player death save
 * 5. Apply lifesteal on kill, XP reward, augment chance
 * 6. Return CombatResult
 */
export function processCombat(
  player: Player,
  enemy: Enemy,
  messageLog: string[],
): CombatResult {
  let currentPlayer = { ...player };
  let currentEnemyHp = enemy.hp;
  let xpGained = 0;
  let droppedItems: string[] = [];
  let shouldShowAugments = false;

  // ── Player attacks ──
  const { damage: playerDamage, isCrit } = calculateDamageWithCrit(currentPlayer.attack, enemy.defense);
  currentEnemyHp -= playerDamage;

  messageLog.push(`玩家攻击了 ${enemy.name}，造成 ${playerDamage} 点伤害。`);
  if (isCrit) {
    messageLog.push('暴击！');
  }

  // ── Check enemy death ──
  if (currentEnemyHp <= 0) {
    currentEnemyHp = 0;

    // Lifesteal on kill
    if (hasLifesteal(currentPlayer)) {
      const heal = getLifestealValue(currentPlayer);
      currentPlayer = {
        ...currentPlayer,
        hp: Math.min(currentPlayer.maxHp, currentPlayer.hp + heal),
      };
      messageLog.push(`吸血回复 ${heal} 点生命值！`);
    }

    // XP reward (apply multiplier)
    const mult = getXpMultiplier(currentPlayer);
    xpGained = Math.floor(enemy.xpReward * mult);
    currentPlayer = {
      ...currentPlayer,
      xp: currentPlayer.xp + xpGained,
    };

    messageLog.push(`击败了 ${enemy.name}！获得 ${xpGained} 经验值。`);

    // Augment reward for elite/boss
    if (enemy.type === 'elite' || enemy.type === 'boss') {
      shouldShowAugments = true;
    }

    return {
      player: currentPlayer,
      enemyHp: 0,
      isDead: true,
      playerDead: false,
      xpGained,
      shouldShowAugments,
      droppedItems,
    };
  }

  // ── Enemy attacks back ──
  currentPlayer = enemyAttackPhase(currentPlayer, enemy, messageLog);

  // ── Check player death ──
  let playerDead = false;
  if (currentPlayer.hp <= 0) {
    if (hasDeathSave(currentPlayer)) {
      currentPlayer = {
        ...currentPlayer,
        hp: 1,
      };
      currentPlayer = removeDeathSaveAugment(currentPlayer);
      messageLog.push('免死金牌触发！以 1 点生命值存活。');
    } else {
      currentPlayer = { ...currentPlayer, hp: 0 };
      playerDead = true;
      messageLog.push('玩家已阵亡。');
    }
  }

  return {
    player: currentPlayer,
    enemyHp: currentEnemyHp,
    isDead: currentEnemyHp <= 0,
    playerDead,
    xpGained: 0,
    shouldShowAugments: false,
    droppedItems,
  };
}

/**
 * Handle enemy attack phase: main hit + special abilities (double_strike, multi_strike)
 * plus debuff application (slow_on_hit, dodge_seal, dot).
 */
function enemyAttackPhase(
  player: Player,
  enemy: Enemy,
  messageLog: string[],
): Player {
  let currentPlayer = { ...player };

  // Build array of attacks
  const attacks: Array<{ damage: number; appliesDebuff: boolean }> = [];

  // Main attack
  const mainDamage = calculateDamage(enemy.attack, currentPlayer.defense);
  attacks.push({ damage: mainDamage, appliesDebuff: true });

  // Check for double_strike or multi_strike
  if (enemy.special) {
    const spec = enemy.special;
    const roll = seededRandom();
    if (roll < spec.chance) {
      if (spec.type === 'double_strike') {
        // value=1 means one extra hit
        const extraCount = spec.value;
        for (let i = 0; i < extraCount; i++) {
          const extraDmg = calculateDamage(enemy.attack, currentPlayer.defense);
          attacks.push({ damage: extraDmg, appliesDebuff: false });
          messageLog.push(`${enemy.name} 发动了双重打击！造成 ${extraDmg} 点额外伤害。`);
        }
      } else if (spec.type === 'multi_strike') {
        // value=3 means 1-3 extra hits (random)
        const maxExtra = spec.value; // e.g. 3
        const extraCount = Math.floor(seededRandom() * maxExtra) + 1; // 1 to 3
        for (let i = 0; i < extraCount; i++) {
          const extraDmg = calculateDamage(enemy.attack, currentPlayer.defense);
          attacks.push({ damage: extraDmg, appliesDebuff: false });
        }
        messageLog.push(`${enemy.name} 发动了多重打击！额外攻击 ${extraCount} 次。`);
      }
    }
  }

  // Apply all attacks with dodge checks
  for (let i = 0; i < attacks.length; i++) {
    const atk = attacks[i];

    // Check dodge (only for first hit? spec says "dodgeChance % to evade")
    // We apply dodge to all hits
    const dodgeChance = getDodgeChance(currentPlayer);
    if (dodgeChance > 0) {
      const dodgeRoll = seededRandom();
      if (dodgeRoll < dodgeChance) {
        messageLog.push('闪避了敌人的攻击！');
        continue;
      }
    }

    currentPlayer = {
      ...currentPlayer,
      hp: currentPlayer.hp - atk.damage,
    };

    if (i === 0) {
      messageLog.push(`${enemy.name} 攻击了玩家，造成 ${atk.damage} 点伤害。`);
    }

    // Applying debuff is tied to the main hit
    if (atk.appliesDebuff && enemy.special) {
      const spec = enemy.special;
      const debuffRoll = seededRandom();
      if (debuffRoll < spec.chance) {
        currentPlayer = applyEnemyDebuff(currentPlayer, spec, messageLog);
      }
    }

    // Stop if player is dead mid-attack sequence
    if (currentPlayer.hp <= 0) break;
  }

  return currentPlayer;
}

// ──────────────── Enemy Debuff Application ────────────────

function applyEnemyDebuff(
  player: Player,
  special: { type: string; chance: number; value: number; duration?: number },
  messageLog: string[],
): Player {
  switch (special.type) {
    case 'slow_on_hit': {
      const dur = special.duration ?? 5;
      const slow: StatusEffect = {
        id: 'se_slow',
        name: '减速',
        stat: 'speed',
        modifier: special.value,
        remainingTurns: dur,
      };
      player = addStatusEffect(player, slow);
      messageLog.push(`玩家被减速了（剩余 ${dur} 回合）！`);
      return player;
    }
    case 'dodge_seal': {
      const dur = special.duration ?? 3;
      const seal: StatusEffect = {
        id: 'se_dodge_seal',
        name: '闪避封印',
        stat: 'dodgeChance',
        modifier: special.value,
        remainingTurns: dur,
      };
      player = addStatusEffect(player, seal);
      messageLog.push(`闪避能力被封印了（剩余 ${dur} 回合）！`);
      return player;
    }
    case 'dot': {
      const dot: StatusEffect = {
        id: 'se_dot',
        name: '持续伤害',
        stat: 'hp',
        modifier: special.value,
        remainingTurns: special.duration ?? 999,
      };
      player = addStatusEffect(player, dot);
      messageLog.push(`受到持续伤害效果（每回合 ${special.value} 点）！`);
      return player;
    }
    default:
      return player;
  }
}

function addStatusEffect(player: Player, effect: StatusEffect): Player {
  const existingIdx = player.statusEffects.findIndex(s => s.id === effect.id);
  if (existingIdx >= 0) {
    const updated = [...player.statusEffects];
    updated[existingIdx] = effect;
    return { ...player, statusEffects: updated };
  }
  return {
    ...player,
    statusEffects: [...player.statusEffects, effect],
  };
}

// ──────────────── Level-Up Logic ────────────────

/**
 * Check if player XP >= xpToNext and level up if so.
 * Level up: level++ (cap 4), maxHp+20, full heal, attack+3, defense+1, xpToNext *= 1.5.
 * XP reset to 0 after leveling (overflow is discarded).
 * At level 4 cap, player stays at level 4.
 */
export function checkLevelUp(player: Player): Player {
  if (player.level >= 4) return player;

  let updated = { ...player };
  while (updated.xp >= updated.xpToNext && updated.level < 4) {
    const overflow = updated.xp - updated.xpToNext;
    updated = {
      ...updated,
      level: updated.level + 1,
      maxHp: updated.maxHp + 20,
      attack: updated.attack + 3,
      defense: updated.defense + 1,
    };
    updated = {
      ...updated,
      hp: updated.maxHp,
      xp: overflow > 0 ? overflow : 0,
      xpToNext: Math.floor(updated.xpToNext * 1.5),
    };
  }
  return updated;
}

// ──────────────── Augment Application ────────────────

/**
 * Apply an augment's effect to the player.
 * Returns a new Player object with the augment added to augments array
 * and stat effects applied.
 */
export function applyAugmentEffect(player: Player, augment: Augment): Player {
  let updated = { ...player };

  switch (augment.effect.stat) {
    case 'maxHp': {
      updated = {
        ...updated,
        maxHp: updated.maxHp + augment.effect.value,
        hp: updated.hp + augment.effect.value,
      };
      break;
    }
    case 'hp': {
      updated = {
        ...updated,
        hp: Math.min(updated.maxHp, updated.hp + augment.effect.value),
      };
      break;
    }
    case 'attack': {
      updated = {
        ...updated,
        attack: updated.attack + augment.effect.value,
      };
      break;
    }
    case 'defense': {
      updated = {
        ...updated,
        defense: updated.defense + augment.effect.value,
      };
      break;
    }
    // xpMultiplier, dodgeChance, lifesteal, deathSave are passive
    default:
      break;
  }

  updated = {
    ...updated,
    augments: [...updated.augments, augment],
  };

  return updated;
}

// ──────────────── Status Effect Ticking ────────────────

/**
 * Tick down a status effect by 1 turn.
 * Returns the updated effect with remainingTurns decremented,
 * or null if the effect has expired (remainingTurns reached 0).
 */
export function applyStatusEffectTick(effect: StatusEffect): StatusEffect | null {
  const newTurns = effect.remainingTurns - 1;
  if (newTurns <= 0) {
    return null;
  }
  return {
    ...effect,
    remainingTurns: newTurns,
  };
}

/**
 * Tick all status effects on the player. DOT effects deal damage.
 * Returns updated player.
 */
export function tickPlayerStatusEffects(player: Player): Player {
  const effects = player.statusEffects
    .map(e => applyStatusEffectTick(e))
    .filter((e): e is StatusEffect => e !== null);

  let hp = player.hp;

  // Handle DOT damage
  for (const effect of effects) {
    if (effect.id === 'se_dot') {
      hp -= effect.modifier;
    }
  }

  return {
    ...player,
    statusEffects: effects,
    hp: Math.max(0, hp),
  };
}
