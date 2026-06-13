import { describe, it, expect } from 'vitest';
import { computeFOV, updateVisibility } from '../../src/engine/FOV';
import { Tile } from '../../src/types';

describe('computeFOV', () => {
  it('should return a 2D boolean array centered on player', () => {
    const map: Tile[][] = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => Tile.FLOOR));
    const result = computeFOV(10, 10, 7, map);
    // result is a window around player: (radius*2+1) x (radius*2+1) = 15x15
    expect(result.length).toBe(15);
    expect(result[0].length).toBe(15);
    expect(result[7][7]).toBe(true); // center = player, always visible
  });

  it('should show tiles within radius and not beyond', () => {
    const map: Tile[][] = Array.from({ length: 30 }, () => Array.from({ length: 30 }, () => Tile.FLOOR));
    const result = computeFOV(15, 15, 7, map);
    // Tile at radius+1 should not be visible
    expect(result[0][0]).toBe(false); // corner at distance ~10 > 7
  });

  it('should block LOS at walls', () => {
    const map: Tile[][] = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => Tile.FLOOR));
    map[5][7] = Tile.WALL; // wall to the right of player
    const result = computeFOV(5, 5, 7, map);
    // Tile beyond the wall should not be visible
    const wallIdx = 7 - 5 + 7; // offset in result array
    const beyondWallIdx = 8 - 5 + 7;
    if (beyondWallIdx < result[0].length) {
      expect(result[7][beyondWallIdx]).toBe(false);
    }
  });
});

describe('updateVisibility', () => {
  it('should merge visible tiles into explored set', () => {
    const explored: boolean[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false));
    const visible: boolean[][] = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => true)); // 3x3 all visible
    const newExplored = updateVisibility(explored, visible, 2, 2);
    // The center of the explored map should now be true
    expect(newExplored[2][2]).toBe(true);
  });

  it('should keep previously explored tiles even if not visible', () => {
    const explored: boolean[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => true));
    const visible: boolean[][] = Array.from({ length: 1 }, () => Array.from({ length: 1 }, () => true));
    const newExplored = updateVisibility(explored, visible, 2, 2);
    expect(newExplored[0][0]).toBe(true);
  });
});
