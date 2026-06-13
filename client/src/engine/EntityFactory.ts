import type { EnemyDef, Item, Player } from '../types';

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  e_morning_class: {
    id: 'e_morning_class', name: '早八点名', type: 'normal',
    maxHp: 25, attack: 10, defense: 1, xpReward: 15,
    special: { type: 'double_strike', chance: 0.3, value: 1 },
  },
  e_canteen: {
    id: 'e_canteen', name: '食堂饭菜', type: 'normal',
    maxHp: 20, attack: 5, defense: 0, xpReward: 10,
    special: { type: 'slow_on_hit', chance: 1.0, value: 0.5, duration: 5 },
  },
  e_phys_test: {
    id: 'e_phys_test', name: '体测 1000m', type: 'normal',
    maxHp: 30, attack: 14, defense: 3, xpReward: 20,
    special: { type: 'dodge_seal', chance: 1.0, value: 0, duration: 3 },
  },
  e_slacker: {
    id: 'e_slacker', name: '划水队友', type: 'elite',
    maxHp: 40, attack: 6, defense: 2, xpReward: 35,
    special: { type: 'dot', chance: 1.0, value: 4, duration: 999 },
  },
  e_midterm: {
    id: 'e_midterm', name: '期中考试', type: 'elite',
    maxHp: 50, attack: 18, defense: 5, xpReward: 50,
    special: null,
  },
  e_final_week: {
    id: 'e_final_week', name: '期末周', type: 'boss',
    maxHp: 80, attack: 25, defense: 8, xpReward: 100,
    special: { type: 'multi_strike', chance: 1.0, value: 3 },
  },
};

export const ITEM_DEFS: Record<string, Item> = {
  i_coffee: { id: 'i_coffee', name: '咖啡续命', type: 'potion', effect: { stat: 'hp', value: 30 }, description: '恢复 30 精力值' },
  i_milk_tea: { id: 'i_milk_tea', name: '奶茶', type: 'potion', effect: { stat: 'hp', value: 15 }, description: '恢复 15 精力值，+2 攻击持续 10 回合' },
  i_headphones: { id: 'i_headphones', name: '降噪耳机', type: 'weapon', effect: { stat: 'attack', value: 5 }, description: '+5 攻击力' },
  i_notes: { id: 'i_notes', name: '学霸笔记', type: 'weapon', effect: { stat: 'attack', value: 8 }, description: '+8 攻击力' },
  i_thick_face: { id: 'i_thick_face', name: '厚脸皮', type: 'armor', effect: { stat: 'defense', value: 3 }, description: '+3 防御' },
  i_makeup_exam: { id: 'i_makeup_exam', name: '补考机会', type: 'armor', effect: { stat: 'defense', value: 5 }, description: '+5 防御' },
  i_dorm_delivery: { id: 'i_dorm_delivery', name: '室友带饭', type: 'potion', effect: { stat: 'hp', value: 999 }, description: '恢复全部精力值' },
};

export function createPlayer(): Player {
  return {
    hp: 100, maxHp: 100, attack: 10, defense: 2,
    level: 1, xp: 0, xpToNext: 50, floor: 1,
    x: 0, y: 0,
    inventory: [], weapon: null, armor: null,
    augments: [], statusEffects: [],
  };
}

export function createEnemyFromDef(def: EnemyDef, x: number, y: number, floorMultiplier: number) {
  return {
    ...def,
    hp: Math.floor(def.maxHp * floorMultiplier),
    maxHp: Math.floor(def.maxHp * floorMultiplier),
    attack: Math.floor(def.attack * floorMultiplier),
    defense: Math.floor(def.defense * floorMultiplier),
    x, y,
  };
}
