import { Tile } from '../types';

/**
 * Bresenham-based line-of-sight check from (x0,y0) to (x1,y1).
 * Returns true if the line from start to end hits no WALL tiles.
 * The destination tile itself is included in the check — if it is
 * a WALL, sight is blocked UNLESS the destination IS the source.
 */
export function hasLineOfSight(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  map: Tile[][],
): boolean {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  let x = x0;
  let y = y0;

  const maxY = map.length;
  const maxX = maxY > 0 ? map[0].length : 0;

  while (true) {
    // Check bounds
    if (x < 0 || x >= maxX || y < 0 || y >= maxY) return false;
    // Check if current tile is a wall (but allow starting tile)
    if (map[y][x] === Tile.WALL && !(x === x0 && y === y0)) return false;
    // Reached destination
    if (x === x1 && y === y1) return true;

    const e2 = 2 * err;
    if (e2 >= dy) {
      if (x === x1) break;
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      if (y === y1) break;
      err += dx;
      y += sy;
    }
  }

  return true;
}

/**
 * Compute the circular Field-of-View for a player at (px,py) with the
 * given radius.  Returns a (radius*2+1) x (radius*2+1) boolean window
 * where each element indicates whether the corresponding map tile is
 * currently visible.
 *
 * Visibility is a two-step check:
 *   1. The tile must be within the circular radius (Euclidean distance).
 *   2. Bresenham LOS from player to tile must be unobstructed by WALLs.
 */
export function computeFOV(
  px: number,
  py: number,
  radius: number,
  map: Tile[][],
): boolean[][] {
  const size = radius * 2 + 1;
  const result: boolean[][] = [];

  // Pre-compute tile coordinates for each cell in the window
  for (let wy = 0; wy < size; wy++) {
    const row: boolean[] = [];
    const my = py - radius + wy; // map Y

    for (let wx = 0; wx < size; wx++) {
      const mx = px - radius + wx; // map X

      // Quick distance check — skip tiles outside the circle
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist > radius) {
        row.push(false);
        continue;
      }

      // Within radius — check Bresenham LOS
      const visible = hasLineOfSight(px, py, mx, my, map);
      row.push(visible);
    }
    result.push(row);
  }

  return result;
}

/**
 * Merge the current FOV window into the explored-tiles map.
 * Any tile that IS currently visible becomes explored.
 * Previously explored tiles are preserved even if no longer visible.
 *
 * Returns a **new** explored array (does not mutate the original).
 */
export function updateVisibility(
  exploredTiles: boolean[][],
  visibleTiles: boolean[][],
  playerX: number,
  playerY: number,
): boolean[][] {
  const visRows = visibleTiles.length;
  if (visRows === 0) return exploredTiles.map((row) => [...row]);

  const visCols = visibleTiles[0].length;
  const radius = Math.floor(visRows / 2);

  const rows = exploredTiles.length;
  const cols = rows > 0 ? exploredTiles[0].length : 0;

  // Deep-copy the explored array
  const result: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    const rowCopy = [...exploredTiles[y]];
    for (let x = 0; x < cols; x++) {
      // Map global (x,y) into the visible window coordinates
      const wx = x - (playerX - radius);
      const wy = y - (playerY - radius);

      if (wx >= 0 && wx < visCols && wy >= 0 && wy < visRows) {
        if (visibleTiles[wy][wx]) {
          rowCopy[x] = true; // visible => explored
        }
      }
    }
    result.push(rowCopy);
  }

  return result;
}
