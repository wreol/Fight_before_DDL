import { create } from 'zustand';
import { GameEngine } from '../engine/GameEngine';
import type { GameState } from '../types';

interface GameStore {
  // State
  engine: GameEngine | null;
  gameState: GameState | null;

  // Actions
  startNewGame: (seed: string) => void;
  continueGame: (savedState: GameState) => void;
  processTurn: (action: string) => void;
  selectAugment: (augmentId: string) => void;
  descend: () => void;
  setGameState: (state: GameState) => void;
  returnToMenu: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  gameState: null,

  startNewGame: (seed: string) => {
    const engine = new GameEngine(seed);
    set({ engine, gameState: engine.getState() });
  },

  continueGame: (savedState: GameState) => {
    const engine = new GameEngine(savedState.seed, savedState);
    set({ engine, gameState: engine.getState() });
  },

  processTurn: (action: string) => {
    const { engine } = get();
    if (!engine) return;
    engine.processTurn(action);
    set({ gameState: engine.getState() });
  },

  selectAugment: (augmentId: string) => {
    const { engine } = get();
    if (!engine) return;
    engine.selectAugment(augmentId);
    set({ gameState: engine.getState() });
  },

  descend: () => {
    const { engine } = get();
    if (!engine) return;
    engine.descend();
    set({ gameState: engine.getState() });
  },

  setGameState: (gameState: GameState) => {
    set({ gameState });
  },

  returnToMenu: () => {
    set({ engine: null, gameState: null });
  },
}));
