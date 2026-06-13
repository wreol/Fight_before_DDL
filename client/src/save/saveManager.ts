import type { GameState } from '../types';

const SAVE_KEY = 'college_dungeon_save';
const SOUL_POINTS_KEY = 'college_dungeon_soul_points';
const UNLOCKS_KEY = 'college_dungeon_unlocks';
const SETTINGS_KEY = 'college_dungeon_settings';
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  gameState: GameState;
  timestamp: number;
}

export interface SoulData {
  points: number;
  unlocks: string[];
}

// Save game state to localStorage
export function saveGame(gameState: GameState): void {
  const data: SaveData = {
    version: SAVE_VERSION,
    gameState,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

// Load game state from localStorage
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
      clearSave();
      return null;
    }
    return data.gameState;
  } catch (e) {
    console.error('Failed to load save:', e);
    return null;
  }
}

// Check if a save exists
export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

// Clear save data
export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

// Soul points management
export function getSoulPoints(): number {
  const raw = localStorage.getItem(SOUL_POINTS_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export function addSoulPoints(amount: number): number {
  const current = getSoulPoints();
  const updated = current + amount;
  localStorage.setItem(SOUL_POINTS_KEY, updated.toString());
  return updated;
}

export function spendSoulPoints(amount: number): boolean {
  const current = getSoulPoints();
  if (current < amount) return false;
  localStorage.setItem(SOUL_POINTS_KEY, (current - amount).toString());
  return true;
}

// Unlock management
export function getUnlocks(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addUnlock(itemId: string): void {
  const unlocks = getUnlocks();
  if (!unlocks.includes(itemId)) {
    unlocks.push(itemId);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(unlocks));
  }
}

export function isUnlocked(itemId: string): boolean {
  return getUnlocks().includes(itemId);
}

// Settings
export interface GameSettings {
  playerName: string;
}

const defaultSettings: GameSettings = {
  playerName: '匿名大学生',
};

export function getSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Partial<GameSettings>): void {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// Calculate soul points from run results
export function calculateSoulPoints(floorReached: number, enemiesKilled: number): number {
  return Math.floor(floorReached * 10 + enemiesKilled * 2);
}
