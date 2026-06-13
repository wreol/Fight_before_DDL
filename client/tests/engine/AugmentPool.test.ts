import { describe, it, expect } from 'vitest';
import { getAugmentChoices, AUGMENT_POOL } from '../../src/engine/AugmentPool';

describe('AUGMENT_POOL', () => {
  it('should contain at least 9 augments', () => {
    expect(AUGMENT_POOL.length).toBeGreaterThanOrEqual(9);
  });

  it('should all have unique IDs', () => {
    const ids = AUGMENT_POOL.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have all three rarities', () => {
    const rarities = new Set(AUGMENT_POOL.map(a => a.rarity));
    expect(rarities.has('common')).toBe(true);
    expect(rarities.has('rare')).toBe(true);
    expect(rarities.has('legendary')).toBe(true);
  });
});

describe('getAugmentChoices', () => {
  it('should return exactly 3 augments', () => {
    const choices = getAugmentChoices('elite');
    expect(choices).toHaveLength(3);
  });

  it('should return 3 unique augments (no duplicates)', () => {
    const choices = getAugmentChoices('boss');
    const ids = choices.map(c => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('elite should give mostly common/rare', () => {
    let legendaryCount = 0;
    for (let i = 0; i < 50; i++) {
      const choices = getAugmentChoices('elite');
      legendaryCount += choices.filter(c => c.rarity === 'legendary').length;
    }
    expect(legendaryCount).toBeLessThan(25); // 5% of 150 = 7.5, 25 is very generous
  });

  it('boss should give more legendary', () => {
    let legendaryCount = 0;
    for (let i = 0; i < 50; i++) {
      const choices = getAugmentChoices('boss');
      legendaryCount += choices.filter(c => c.rarity === 'legendary').length;
    }
    expect(legendaryCount).toBeGreaterThan(20); // 40% of 150 = 60
  });
});
