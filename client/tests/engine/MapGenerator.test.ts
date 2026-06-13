import { describe, it, expect } from 'vitest';
import { generateMap, isMapFullyConnected } from '../../src/engine/MapGenerator';
import { Tile } from '../../src/types';

describe('MapGenerator', () => {
  describe('generateMap', () => {
    it('should generate a 50x40 map', () => {
      const map = generateMap('test_seed', 1);
      expect(map.length).toBe(40);
      expect(map[0].length).toBe(50);
    });

    it('should produce identical maps for the same seed+floor', () => {
      const map1 = generateMap('same_seed', 1);
      const map2 = generateMap('same_seed', 1);
      expect(map1).toEqual(map2);
    });

    it('should produce different maps for different seeds', () => {
      const map1 = generateMap('seed_a', 1);
      const map2 = generateMap('seed_b', 1);
      expect(map1.flat().join()).not.toEqual(map2.flat().join());
    });

    it('should have at least 5 rooms (floor tile groups)', () => {
      const map = generateMap('test_seed', 1);
      const floorCount = map.flat().filter(t => t === Tile.FLOOR).length;
      expect(floorCount).toBeGreaterThanOrEqual(80); // 5 rooms × 4×4 = 80
    });

    it('should place exactly one stairs down', () => {
      const map = generateMap('test_seed', 1);
      const stairsCount = map.flat().filter(t => t === Tile.STAIRS_DOWN).length;
      expect(stairsCount).toBe(1);
    });

    it('should generate fully connected maps (all floor tiles reachable)', () => {
      for (let i = 0; i < 10; i++) {
        const map = generateMap(`connect_test_${i}`, 1);
        expect(isMapFullyConnected(map)).toBe(true);
      }
    });

    it('should place stairs far from the first room', () => {
      const map = generateMap('test_seed', 1);
      let stairsX = 0, stairsY = 0, firstFloorX = -1, firstFloorY = -1;
      for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
          if (map[y][x] === Tile.STAIRS_DOWN) { stairsY = y; stairsX = x; }
          if (firstFloorX === -1 && map[y][x] === Tile.FLOOR) { firstFloorY = y; firstFloorX = x; }
        }
      }
      const dist = Math.abs(stairsX - firstFloorX) + Math.abs(stairsY - firstFloorY);
      expect(dist).toBeGreaterThan(10);
    });
  });
});
