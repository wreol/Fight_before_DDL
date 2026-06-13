import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/engine/GameEngine';
import { Tile } from '../../src/types';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine('test_seed_12345');
  });

  it('should create a new game with valid initial state', () => {
    const state = engine.getState();
    expect(state.status).toBe('playing');
    expect(state.player.hp).toBe(100);
    expect(state.player.level).toBe(1);
    expect(state.floor).toBe(1);
    expect(state.map.length).toBeGreaterThan(0);
    expect(state.seed).toBe('test_seed_12345');
    expect(state.turnCount).toBe(0);
  });

  it('should process a movement action (ArrowRight)', () => {
    const stateBefore = engine.getState();
    const { x, y } = stateBefore.player;
    const result = engine.processTurn('ArrowRight');
    expect(result.turnProcessed).toBe(true);
    const stateAfter = engine.getState();
    // Either moved or attacked — position should change unless wall/enemy directly right
    expect(stateAfter.turnCount).toBe(stateBefore.turnCount + 1);
  });

  it('should not move into walls', () => {
    // Build a controlled map with a wall directly to the right of the player
    const h = 5;
    const w = 5;
    const testMap: Tile[][] = Array.from({ length: h }, () => new Array(w).fill(Tile.WALL));
    // Carve a small room
    testMap[2][0] = Tile.FLOOR;
    testMap[2][1] = Tile.FLOOR;
    testMap[2][2] = Tile.FLOOR;
    testMap[2][3] = Tile.FLOOR; // this is not WALL — need WALL at [2][1] equivalent
    // Actually: put player at (2,2), make (3,2) a WALL
    // Clear a path
    testMap[2][2] = Tile.FLOOR;
    testMap[2][3] = Tile.WALL; // wall to the right
    testMap[1][2] = Tile.FLOOR;
    testMap[3][2] = Tile.FLOOR;

    // Create a known state
    const savedState = engine.getState();
    savedState.map = testMap;
    savedState.player.x = 2;
    savedState.player.y = 2;
    savedState.enemies = [];
    savedState.items = [];

    const e2 = new GameEngine('wall_test', savedState);
    e2.processTurn('ArrowRight');
    const newState = e2.getState();
    expect(newState.player.x).toBe(2); // didn't move
    expect(newState.player.y).toBe(2);
  });

  it('should descend to next floor when on stairs', () => {
    // Use a fresh engine to find stairs
    const e2 = new GameEngine('descend_test');
    const state = e2.getState();

    // Find stairs position
    let stairsX = -1;
    let stairsY = -1;
    const map = state.map;
    for (let ty = 0; ty < map.length; ty++) {
      for (let tx = 0; tx < map[0].length; tx++) {
        if (map[ty][tx] === Tile.STAIRS_DOWN) {
          stairsX = tx;
          stairsY = ty;
          break;
        }
      }
      if (stairsX >= 0) break;
    }

    if (stairsX >= 0) {
      // Manually move player onto stairs and descend
      state.player.x = stairsX;
      state.player.y = stairsY;
      state.map[stairsY][stairsX] = Tile.STAIRS_DOWN;
      const e3 = new GameEngine('descend_test', state);
      e3.descend();
      expect(e3.getState().floor).toBe(2);
    }
  });

  it('should increment turn count after each action', () => {
    const before = engine.getState().turnCount;
    engine.processTurn('ArrowRight');
    expect(engine.getState().turnCount).toBe(before + 1);
  });

  it('should generate identical maps for same seed', () => {
    const e1 = new GameEngine('deterministic_seed');
    const e2 = new GameEngine('deterministic_seed');
    expect(e1.getState().map).toEqual(e2.getState().map);
  });

  it('should handle potion use from inventory', () => {
    const state = engine.getState();
    // Give the player a potion
    state.player.inventory.push({
      id: 'i_coffee',
      name: '咖啡续命',
      type: 'potion',
      effect: { stat: 'hp', value: 30 },
      description: '恢复 30 精力值',
    });
    state.player.hp = 50;
    // Restore engine with modified state
    const e2 = new GameEngine('test_seed', state);
    const result = e2.processTurn('potion');
    expect(result.turnProcessed).toBe(true);
    expect(e2.getState().player.hp).toBe(80); // 50 + 30 = 80
  });

  it('should select augment correctly', () => {
    const state = engine.getState();
    const hp = state.player.hp;
    engine.selectAugment('a_early_sleep');
    const newState = engine.getState();
    expect(newState.player.maxHp).toBe(108); // 100 + 8
    expect(newState.player.augments.length).toBe(1);
  });

  it('should handle wait action', () => {
    const stateBefore = engine.getState();
    const result = engine.processTurn('wait');
    expect(result.turnProcessed).toBe(true);
    const stateAfter = engine.getState();
    expect(stateAfter.turnCount).toBe(stateBefore.turnCount + 1);
    // Player position unchanged
    expect(stateAfter.player.x).toBe(stateBefore.player.x);
    expect(stateAfter.player.y).toBe(stateBefore.player.y);
  });

  it('should support loading from saved state', () => {
    const fresh = engine.getSecretStateForTesting();

    // Create a saved state manually
    const saved = JSON.parse(JSON.stringify(fresh));
    saved.player.hp = 50;
    saved.turnCount = 10;

    const loaded = new GameEngine('test_seed_12345', saved);
    const loadedState = loaded.getState();
    expect(loadedState.player.hp).toBe(50);
    expect(loadedState.turnCount).toBe(10);
  });

  it('should cap message log at 50 entries', () => {
    const state = engine.getState();
    // Fill message log with 60 entries
    state.messageLog = Array.from({ length: 60 }, (_, i) => `Message ${i}`);
    const e2 = new GameEngine('test_seed', state);

    // Add one more message via an action
    e2.processTurn('wait');
    const msgs = e2.getState().messageLog;
    expect(msgs.length).toBeLessThanOrEqual(50);
  });
});
