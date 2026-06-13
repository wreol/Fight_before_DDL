import type { Augment } from '../types';

export const AUGMENT_POOL: Augment[] = [
  {
    id: 'a_early_sleep',
    name: '早睡早起',
    rarity: 'common',
    effect: { stat: 'maxHp', value: 8 },
    description: '+8 最大精力值',
    stackable: true,
  },
  {
    id: 'a_notes_boost',
    name: '学霸笔记',
    rarity: 'common',
    effect: { stat: 'attack', value: 3 },
    description: '+3 攻击力',
    stackable: true,
  },
  {
    id: 'a_thick_face',
    name: '厚脸皮+',
    rarity: 'common',
    effect: { stat: 'defense', value: 2 },
    description: '+2 防御',
    stackable: true,
  },
  {
    id: 'a_confidence',
    name: '自信满满',
    rarity: 'common',
    effect: { stat: 'maxHp', value: 5 },
    description: '+5 最大精力值',
    stackable: true,
  },
  {
    id: 'a_dorm_god',
    name: '室友带饭',
    rarity: 'rare',
    effect: { stat: 'lifesteal', value: 4 },
    description: '击杀敌人回复 4 精力',
    stackable: false,
  },
  {
    id: 'a_leave_slip',
    name: '请假条',
    rarity: 'rare',
    effect: { stat: 'dodgeChance', value: 15 },
    description: '15% 概率闪避攻击',
    stackable: false,
  },
  {
    id: 'a_teacher_save',
    name: '老师捞人',
    rarity: 'rare',
    effect: { stat: 'deathSave', value: 1 },
    description: '受到致命伤害时保留 1 点精力（一次性）',
    stackable: false,
  },
  {
    id: 'a_credit_transfer',
    name: '学分转换',
    rarity: 'rare',
    effect: { stat: 'xpMultiplier', value: 20 },
    description: '+20% XP 获取',
    stackable: false,
  },
  {
    id: 'a_library_power',
    name: '图书馆之力',
    rarity: 'legendary',
    effect: { stat: 'hp', value: 3 },
    description: '每 15 步 +3 精力',
    stackable: false,
  },
  {
    id: 'a_full_scholarship',
    name: '满绩传说',
    rarity: 'legendary',
    effect: { stat: 'maxHp', value: 5 },
    description: '+5 所有属性',
    stackable: false,
  },
];

/**
 * Get 3 random unique augment choices based on enemy type.
 *
 * Rarity weights:
 *   Elite: common 60%, rare 35%, legendary 5%
 *   Boss:  rare 60%, legendary 40%
 *
 * Falls back to any rarity if the target rarity pool is exhausted.
 */
export function getAugmentChoices(enemyType: 'elite' | 'boss'): Augment[] {
  const chosen: Augment[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < 3; i++) {
    let augment: Augment | null = null;

    const roll = Math.random() * 100;

    if (enemyType === 'elite') {
      if (roll < 60) {
        augment = pickFromPool('common', usedIds);
      } else if (roll < 95) {
        augment = pickFromPool('rare', usedIds);
      } else {
        augment = pickFromPool('legendary', usedIds);
      }
    } else {
      // boss
      if (roll < 60) {
        augment = pickFromPool('rare', usedIds);
      } else {
        augment = pickFromPool('legendary', usedIds);
      }
    }

    // Fallback: if target rarity exhausted, pick any unused
    if (augment === null) {
      augment = pickFromPool(undefined, usedIds);
    }

    if (augment === null) {
      // All augments exhausted — break out
      break;
    }

    chosen.push(augment);
    usedIds.add(augment.id);
  }

  // If we have fewer than 3 (very unlikely with 10 augments), fill with
  // already-used ones by cycling through the pool.
  while (chosen.length < 3 && AUGMENT_POOL.length > 0) {
    const pick = AUGMENT_POOL[chosen.length % AUGMENT_POOL.length];
    if (!chosen.some(c => c.id === pick.id)) {
      chosen.push(pick);
    } else {
      // Find first augment not already in choices
      const alt = AUGMENT_POOL.find(a => !chosen.some(c => c.id === a.id));
      if (alt) {
        chosen.push(alt);
      } else {
        // Truly all used — just push a duplicate as last resort
        chosen.push(pick);
      }
    }
  }

  return chosen;
}

/**
 * Pick a random augment from the pool, optionally filtered by rarity.
 * Skips augments whose IDs are in `usedIds`.
 * Returns null if none available.
 */
function pickFromPool(
  rarity: 'common' | 'rare' | 'legendary' | undefined,
  usedIds: Set<string>,
): Augment | null {
  let candidates = AUGMENT_POOL.filter(a => !usedIds.has(a.id));

  if (rarity !== undefined) {
    candidates = candidates.filter(a => a.rarity === rarity);
  }

  if (candidates.length === 0) {
    return null;
  }

  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}
