import type { GameState, Player, Enemy, Item, Tile as TileType } from '../types';
import { Tile } from '../types';
import { generateMap, isMapFullyConnected, getPlayerStart } from './MapGenerator';
import { processCombat, checkLevelUp, applyAugmentEffect, tickPlayerStatusEffects } from './CombatSystem';
import { computeFOV, updateVisibility } from './FOV';
import { ENEMY_DEFS, ITEM_DEFS, createPlayer } from './EntityFactory';
import { AUGMENT_POOL } from './AugmentPool';

// ── Mulberry32 RNG ──────────────────────────────────────────────
function mulberry32(seed: number) {
  let state = seed | 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string, salt: number): number {
  let h = 0;
  const str = `${seed}_${salt}`;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Turn Result ─────────────────────────────────────────────────
export interface TurnResult {
  turnProcessed: boolean;
}

// ── GameEngine ──────────────────────────────────────────────────
export class GameEngine {
  private state: GameState;
  private rng: () => number;
  private rngState: number;

  constructor(seed: string, savedState?: GameState) {
    this.rngState = hashSeed(seed, 0);
    this.rng = mulberry32(this.rngState);

    if (savedState) {
      // Deep clone the saved state to avoid mutation
      this.state = JSON.parse(JSON.stringify(savedState));
      // Re-seed the RNG so further actions are deterministic based on the seed + turn count
      this.rngState = hashSeed(seed, this.state.turnCount + 1);
      this.rng = mulberry32(this.rngState);
    } else {
      // Brand new game
      const map = generateMap(seed, 1);
      const playerStart = getPlayerStart(map);
      const player = createPlayer();
      player.x = playerStart.x;
      player.y = playerStart.y;
      player.floor = 1;

      // Initialize explored/visible tiles
      const h = map.length;
      const w = map[0].length;
      const exploredTiles: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));
      const visibleTiles: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));

      this.state = {
        player,
        enemies: [],
        items: [],
        map,
        seed,
        status: 'playing',
        floor: 1,
        messageLog: [
          '█ 欢迎来到大学地牢！',
          '↑↓←→ 移动/攻击  I 使用药水  空格 等待',
          `你是一名${player.level === 1 ? '大一新生' : '大学生'}，找到 ▼ 楼梯往下一层，活到毕业！`,
        ],
        turnCount: 0,
        totalKills: 0,
        exploredTiles,
        visibleTiles,
      };

      // Place enemies and items
      this.placeEnemies(map);
      this.placeItems(map);

      // Initial FOV computation
      this.updateFOV();
    }
  }

  // ── Public API ────────────────────────────────────────────────

  getState(): GameState {
    // Return a defensive deep copy so callers cannot mutate state directly
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Exposed only for testing — return the raw mutable state.
   * Tests can seed the engine with custom player/enemy/item state.
   */
  getSecretStateForTesting(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  processTurn(action: string): TurnResult {
    if (this.state.status !== 'playing') {
      return { turnProcessed: false };
    }

    // Potion: handled specially before movement
    if (action === 'potion') {
      return this.handlePotion();
    }

    // Wait: skip turn
    if (action === 'wait') {
      this.state.messageLog.push('玩家原地等待了一回合。');
      this.endTurn();
      return { turnProcessed: true };
    }

    // Movement / attack
    const directionMap: Record<string, { dx: number; dy: number }> = {
      ArrowUp: { dx: 0, dy: -1 },
      ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
    };

    const dir = directionMap[action];
    if (!dir) {
      return { turnProcessed: false };
    }

    const { player } = this.state;
    const tx = player.x + dir.dx;
    const ty = player.y + dir.dy;

    // Bounds check
    const map = this.state.map;
    if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length) {
      this.state.messageLog.push('已经到达地图边缘。');
      return { turnProcessed: false };
    }

    const targetTile = map[ty][tx];

    // Wall: blocked
    if (targetTile === Tile.WALL) {
      this.state.messageLog.push('前方是墙壁，无法通过。');
      return { turnProcessed: false };
    }

    // Check if enemy is at target
    const enemyIdx = this.state.enemies.findIndex(e => e.x === tx && e.y === ty && e.hp > 0);
    if (enemyIdx >= 0) {
      // Attack enemy
      const enemy = this.state.enemies[enemyIdx];
      const result = processCombat(player, enemy, this.state.messageLog);

      // Update enemy HP
      if (result.isDead) {
        enemy.hp = 0;
        this.state.messageLog.push(`${enemy.name} 被击败了！`);
        if (result.shouldShowAugments) {
          // Mark state to show augments; UI should pick up on this
          this.state.messageLog.push('请选择一个强化！');
        }
      } else {
        enemy.hp = result.enemyHp;
      }

      // Update player from combat result
      Object.assign(this.state.player, result.player);

      // Check player death
      if (result.playerDead) {
        this.state.status = 'dead';
      }

      // Remove dead enemies and count kills
      const killed = this.state.enemies.filter(e => e.hp <= 0).length;
      this.state.totalKills += killed;
      this.state.enemies = this.state.enemies.filter(e => e.hp > 0);

      this.endTurn();
      return { turnProcessed: true };
    }

    // Move player to target tile (FLOOR or STAIRS)
    player.x = tx;
    player.y = ty;

    // Check item pickup
    this.checkItemPickup(tx, ty);

    // Check stairs — auto descend
    if (targetTile === Tile.STAIRS_DOWN) {
      this.state.messageLog.push('▼ 你走下了楼梯，进入下一层...');
      this.descend();
      return { turnProcessed: true };
    }

    this.endTurn();
    return { turnProcessed: true };
  }

  selectAugment(augmentId: string): void {
    const augment = AUGMENT_POOL.find(a => a.id === augmentId);
    if (!augment) {
      this.state.messageLog.push('无效的强化选择。');
      return;
    }

    this.state.player = applyAugmentEffect(this.state.player, augment);
    this.state.messageLog.push(`获得强化: ${augment.name}——${augment.description}`);
  }

  descend(): void {
    this.state.floor += 1;

    // Generate new map for the new floor
    const map = generateMap(this.state.seed, this.state.floor);
    const playerStart = getPlayerStart(map);

    // Initialize explored/visible for new map
    const h = map.length;
    const w = map[0].length;
    const exploredTiles: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));
    const visibleTiles: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));

    // Update state
    this.state.map = map;
    this.state.exploredTiles = exploredTiles;
    this.state.visibleTiles = visibleTiles;
    this.state.enemies = [];
    this.state.items = [];
    this.state.player.x = playerStart.x;
    this.state.player.y = playerStart.y;
    this.state.player.floor = this.state.floor;

    // Place new enemies and items
    this.placeEnemies(map);
    this.placeItems(map);

    // Update FOV
    this.updateFOV();

    this.state.messageLog.push(`下到了第 ${this.state.floor} 层。`);
  }

  getSerializableState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  // ── Private methods ───────────────────────────────────────────

  private handlePotion(): TurnResult {
    const { player } = this.state;

    // Find first potion in inventory
    const potionIdx = player.inventory.findIndex(item => item.type === 'potion');
    if (potionIdx < 0) {
      this.state.messageLog.push('背包里没有药水。');
      return { turnProcessed: false };
    }

    const potion = player.inventory[potionIdx];

    // Remove potion from inventory
    player.inventory.splice(potionIdx, 1);

    // Apply potion effect
    const { stat, value } = potion.effect;
    if (stat === 'hp') {
      player.hp = Math.min(player.maxHp, player.hp + value);
      this.state.messageLog.push(`使用了 ${potion.name}，恢复了 ${value} 点精力值。`);
    } else if (stat === 'attack') {
      player.attack += value;
      this.state.messageLog.push(`使用了 ${potion.name}，攻击力 +${value}。`);
    } else if (stat === 'defense') {
      player.defense += value;
      this.state.messageLog.push(`使用了 ${potion.name}，防御力 +${value}。`);
    } else if (stat === 'maxHp') {
      player.maxHp += value;
      player.hp = Math.min(player.maxHp, player.hp + value);
      this.state.messageLog.push(`使用了 ${potion.name}，最大精力值 +${value}。`);
    }

    this.endTurn();
    return { turnProcessed: true };
  }

  private checkItemPickup(x: number, y: number): void {
    const { player } = this.state;
    const itemIdx = this.state.items.findIndex(item =>
      // Items are placed at positions via a separate position tracking; we store positions differently
      // Items in this.state.items need position data — we store {item, x, y}
      (item as any).x === x && (item as any).y === y
    );

    if (itemIdx < 0) return;

    const itemWrapper = this.state.items[itemIdx];
    const item: Item = (itemWrapper as any).item || itemWrapper;

    // Remove from ground
    this.state.items.splice(itemIdx, 1);

    if (item.type === 'weapon') {
      // Replace current weapon (if any) with new one
      if (player.weapon) {
        player.attack -= player.weapon.effect.value;
        this.state.messageLog.push(`卸下了 ${player.weapon.name}。`);
      }
      player.weapon = item;
      player.attack += item.effect.value;
      this.state.messageLog.push(`装备了 ${item.name}。${item.description}`);
    } else if (item.type === 'armor') {
      if (player.armor) {
        player.defense -= player.armor.effect.value;
        this.state.messageLog.push(`卸下了 ${player.armor.name}。`);
      }
      player.armor = item;
      player.defense += item.effect.value;
      this.state.messageLog.push(`装备了 ${item.name}。${item.description}`);
    } else if (item.type === 'potion') {
      player.inventory.push(item);
      this.state.messageLog.push(`拾取了 ${item.name}。${item.description}`);
    }
  }

  private placeEnemies(map: TileType[][]): void {
    const floor = this.state.floor;
    const enemyCount = 5 + floor * 2;
    const floorMultiplier = 1 + (floor - 1) * 0.15;

    const playerStart = getPlayerStart(map);
    const h = map.length;
    const w = map[0].length;

    // Collect all floor tiles that are at least 8 tiles away from player start
    const floorTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (map[y][x] === Tile.FLOOR || map[y][x] === Tile.STAIRS_DOWN) {
          const dist = Math.abs(x - playerStart.x) + Math.abs(y - playerStart.y);
          if (dist >= 8) {
            floorTiles.push({ x, y });
          }
        }
      }
    }

    if (floorTiles.length === 0) {
      // Fallback: use any floor tile
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (map[y][x] === Tile.FLOOR || map[y][x] === Tile.STAIRS_DOWN) {
            floorTiles.push({ x, y });
          }
        }
      }
    }

    const placedEnemies: Enemy[] = [];
    const enemyDefIds = Object.keys(ENEMY_DEFS);
    const usedPositions = new Set<string>();

    for (let i = 0; i < enemyCount && floorTiles.length > 0; i++) {
      // Select a random floor tile
      const tileIdx = Math.floor(this.rng() * floorTiles.length);
      const pos = floorTiles[tileIdx];
      const posKey = `${pos.x},${pos.y}`;

      // Avoid placing multiple enemies on same tile
      if (usedPositions.has(posKey)) {
        i--; // retry
        continue;
      }
      usedPositions.add(posKey);

      // Determine enemy type: 15% + floor*3% chance of elite
      const roll = this.rng() * 100;
      let defId: string;

      if (roll < 15 + floor * 3) {
        // Elite
        const eliteDefs = enemyDefIds.filter(id => ENEMY_DEFS[id].type === 'elite');
        if (eliteDefs.length > 0) {
          defId = eliteDefs[Math.floor(this.rng() * eliteDefs.length)];
        } else {
          defId = enemyDefIds[Math.floor(this.rng() * enemyDefIds.length)];
        }
      } else {
        // Normal
        const normalDefs = enemyDefIds.filter(id => ENEMY_DEFS[id].type === 'normal');
        if (normalDefs.length > 0) {
          defId = normalDefs[Math.floor(this.rng() * normalDefs.length)];
        } else {
          defId = enemyDefIds[Math.floor(this.rng() * enemyDefIds.length)];
        }
      }

      const def = ENEMY_DEFS[defId];
      const enemy: Enemy = {
        ...def,
        hp: Math.floor(def.maxHp * floorMultiplier),
        maxHp: Math.floor(def.maxHp * floorMultiplier),
        attack: Math.floor(def.attack * floorMultiplier),
        defense: Math.floor(def.defense * floorMultiplier),
        x: pos.x,
        y: pos.y,
      };

      placedEnemies.push(enemy);
    }

    this.state.enemies = placedEnemies;
  }

  private placeItems(map: TileType[][]): void {
    const h = map.length;
    const w = map[0].length;

    const floorTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (map[y][x] === Tile.FLOOR) {
          floorTiles.push({ x, y });
        }
      }
    }

    const itemDefIds = Object.keys(ITEM_DEFS);
    const placedItems: Item[] = [];
    const usedPositions = new Set<string>();
    const itemCount = 6;

    for (let i = 0; i < itemCount && floorTiles.length > 0; i++) {
      const tileIdx = Math.floor(this.rng() * floorTiles.length);
      const pos = floorTiles[tileIdx];
      const posKey = `${pos.x},${pos.y}`;

      if (usedPositions.has(posKey)) {
        i--;
        continue;
      }
      usedPositions.add(posKey);

      const itemDefId = itemDefIds[Math.floor(this.rng() * itemDefIds.length)];
      const itemDef = ITEM_DEFS[itemDefId];

      // Store position info alongside the item for pickup tracking
      const itemWithPos = {
        ...itemDef,
        x: pos.x,
        y: pos.y,
      } as Item & { x: number; y: number };

      placedItems.push(itemWithPos);
    }

    this.state.items = placedItems as unknown as Item[];
  }

  private processEnemyTurns(): void {
    const { player, enemies } = this.state;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.abs(dx) + Math.abs(dy);

      // Only act if within 10 tiles
      if (dist > 10) continue;

      // Check if adjacent to player
      const isAdjacent = dist === 1;

      if (isAdjacent) {
        // Attack player
        const result = processCombat(player, enemy, this.state.messageLog);

        // Enemy HP is tracked locally; processCombat already handles that
        // But processCombat returns updated enemy HP — we update it
        enemy.hp = result.enemyHp;

        // Update player from combat result
        Object.assign(this.state.player, result.player);

        if (result.isDead) {
          enemy.hp = 0;
          this.state.messageLog.push(`${enemy.name} 被击败了！`);
        }

        if (result.playerDead) {
          this.state.status = 'dead';
          return;
        }
      } else {
        // Move toward player (prefer axis with larger distance)
        let moveX = 0;
        let moveY = 0;

        if (Math.abs(dx) >= Math.abs(dy)) {
          moveX = dx > 0 ? 1 : -1;
        } else {
          moveY = dy > 0 ? 1 : -1;
        }

        const nx = enemy.x + moveX;
        const ny = enemy.y + moveY;

        // Check if target is walkable (FLOOR or STAIRS) and no other enemy there
        const map = this.state.map;
        const inBounds = ny >= 0 && ny < map.length && nx >= 0 && nx < map[0].length;
        if (!inBounds) continue;

        const tile = map[ny][nx];
        const isWalkable = tile === Tile.FLOOR || tile === Tile.STAIRS_DOWN;
        if (!isWalkable) continue;

        // Check no other enemy at target
        const otherEnemy = enemies.find(
          e => e !== enemy && e.x === nx && e.y === ny && e.hp > 0
        );
        if (otherEnemy) continue;

        // Check player is not at target (would be adjacent, not here)
        if (player.x === nx && player.y === ny) continue;

        // Move enemy
        enemy.x = nx;
        enemy.y = ny;
      }
    }

    // Remove dead enemies
    this.state.enemies = this.state.enemies.filter(e => e.hp > 0);
  }

  private endTurn(): void {
    // Process enemy turns
    this.processEnemyTurns();

    // Check for player death
    if (this.state.status === 'dead') return;

    // Tick status effects
    this.state.player = tickPlayerStatusEffects(this.state.player);

    // Library power: every 15 turns, heal 3 HP
    if (this.state.turnCount > 0 && this.state.turnCount % 15 === 0) {
      const hasLibrary = this.state.player.augments.some(a => a.id === 'a_library_power');
      if (hasLibrary) {
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 3);
        this.state.messageLog.push('图书馆之力：回复了 3 点精力值。');
      }
    }

    // Increment turn count
    this.state.turnCount++;

    // Check level up
    const playerBefore = this.state.player;
    this.state.player = checkLevelUp(this.state.player);
    if (this.state.player.level > playerBefore.level) {
      this.state.messageLog.push(`升级了！现在是 ${this.state.player.level} 级。`);
    }

    // Update FOV
    this.updateFOV();

    // Trim message log to 50 entries
    if (this.state.messageLog.length > 50) {
      this.state.messageLog = this.state.messageLog.slice(-20);
    }
  }

  private updateFOV(): void {
    const { player, map } = this.state;
    const fovWindow = computeFOV(player.x, player.y, 8, map);

    // Update visible tiles
    this.state.visibleTiles = fovWindow;

    // Merge into explored tiles
    this.state.exploredTiles = updateVisibility(
      this.state.exploredTiles,
      this.state.visibleTiles,
      player.x,
      player.y,
    );
  }
}
