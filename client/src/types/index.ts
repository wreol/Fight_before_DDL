// === Tile ===
export enum Tile {
  WALL = 0,
  FLOOR = 1,
  STAIRS_DOWN = 2,
  DOOR = 3,
}

// === Effect ===
export interface Effect {
  stat: 'hp' | 'maxHp' | 'attack' | 'defense' | 'xpMultiplier' | 'dodgeChance' | 'lifesteal' | 'deathSave';
  value: number;
  duration?: number; // undefined = permanent
}

// === Item ===
export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion';
  effect: Effect;
  description: string;
}

// === Augment ===
export interface Augment {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  effect: Effect;
  description: string;
  stackable: boolean;
}

// === StatusEffect ===
export interface StatusEffect {
  id: string;
  name: string;
  stat: 'speed' | 'dodgeChance' | 'attack';
  modifier: number; // multiplier (0.5 = half)
  remainingTurns: number;
}

// === SpecialAbility ===
export type SpecialAbilityType = 'double_strike' | 'slow_on_hit' | 'dodge_seal' | 'dot' | 'multi_strike';

export interface SpecialAbility {
  type: SpecialAbilityType;
  chance: number;   // 0-1 probability
  value: number;    // effect magnitude
  duration?: number; // for debuffs
}

// === Enemy Definition (template) ===
export interface EnemyDef {
  id: string;
  name: string;
  type: 'normal' | 'elite' | 'boss';
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  special: SpecialAbility | null;
}

// === Live Enemy Instance ===
export interface Enemy {
  id: string;
  name: string;
  type: 'normal' | 'elite' | 'boss';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  special: SpecialAbility | null;
  x: number;
  y: number;
}

// === Player ===
export interface Player {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;      // 1-4
  xp: number;
  xpToNext: number;
  floor: number;
  x: number;
  y: number;
  inventory: Item[];
  weapon: Item | null;
  armor: Item | null;
  augments: Augment[];
  statusEffects: StatusEffect[];
}

// === GameState ===
export interface GameState {
  player: Player;
  enemies: Enemy[];
  items: Item[];       // items on the ground
  map: Tile[][];
  seed: string;
  status: 'playing' | 'dead' | 'won';
  floor: number;
  messageLog: string[];
  turnCount: number;
  exploredTiles: boolean[][];
  visibleTiles: boolean[][];
}

// === Soul Shop ===
export interface SoulShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: Effect;
  unlocked: boolean;
}

// === API Types ===
export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  floor_reached: number;
  enemies_killed: number;
  score: number;
  died_to: string;
}

export interface LeaderboardResponse {
  date: string;
  entries: LeaderboardEntry[];
}

export interface SeedResponse {
  date: string;
  seed: string;
}

export interface ShareCardResponse {
  card_id: string;
  url: string;
}

export interface RunData {
  player_name: string;
  floor_reached: number;
  enemies_killed: number;
  died_to: string;
  score: number;
  seed: string;
}
