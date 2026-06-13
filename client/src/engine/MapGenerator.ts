import { Tile } from '../types';

// ── mulberry32 PRNG ──────────────────────────────────────────────
function mulberry32(seed: number) {
  let state = seed | 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Hash seed+floor into a stable integer ─────────────────────────
function hashSeed(seed: string, floor: number): number {
  let h = 0;
  const str = `${seed}_${floor}`;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// ── BSP types ─────────────────────────────────────────────────────
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number; // center x
  cy: number; // center y
}

interface BSPNode {
  rect: Rect;
  left: BSPNode | null;
  right: BSPNode | null;
  room: Room | null;
}

// ── BSP split ─────────────────────────────────────────────────────
function splitNode(node: BSPNode, depth: number, maxDepth: number, rng: () => number): void {
  if (depth >= maxDepth) return;

  const { x, y, w, h } = node.rect;
  const splitH = w >= h * 1.25 || (w >= h && rng() < 0.5);
  const minRoom = 5; // minimum size for a split area (room + padding)

  if (splitH) {
    if (w < minRoom * 2) return; // too narrow to split
    // pick a split point that leaves at least minRoom on each side
    const splitMin = x + minRoom;
    const splitMax = x + w - minRoom;
    if (splitMax <= splitMin) return;
    const split = splitMin + Math.floor(rng() * (splitMax - splitMin));
    node.left = { rect: { x, y, w: split - x, h }, left: null, right: null, room: null };
    node.right = { rect: { x: split, y, w: x + w - split, h }, left: null, right: null, room: null };
  } else {
    if (h < minRoom * 2) return; // too short to split
    const splitMin = y + minRoom;
    const splitMax = y + h - minRoom;
    if (splitMax <= splitMin) return;
    const split = splitMin + Math.floor(rng() * (splitMax - splitMin));
    node.left = { rect: { x, y, w, h: split - y }, left: null, right: null, room: null };
    node.right = { rect: { x, y: split, w, h: y + h - split }, left: null, right: null, room: null };
  }

  splitNode(node.left, depth + 1, maxDepth, rng);
  splitNode(node.right, depth + 1, maxDepth, rng);
}

// ── Place rooms in leaf nodes ─────────────────────────────────────
function createRooms(node: BSPNode, rng: () => number): Room[] {
  const rooms: Room[] = [];
  createRoomsRec(node, rng, rooms);
  return rooms;
}

function createRoomsRec(node: BSPNode, rng: () => number, rooms: Room[]): void {
  if (node.left && node.right) {
    createRoomsRec(node.left, rng, rooms);
    createRoomsRec(node.right, rng, rooms);
    return;
  }

  // Leaf node: place a random room inside it
  const { x, y, w, h } = node.rect;
  const padding = 1;
  const minSize = 4;
  // ensure we have enough space
  const usableW = w - padding * 2;
  const usableH = h - padding * 2;

  let roomW: number, roomH: number;
  if (usableW < minSize || usableH < minSize) {
    // Not enough space, create a minimal room
    roomW = Math.max(3, usableW);
    roomH = Math.max(3, usableH);
  } else {
    roomW = minSize + Math.floor(rng() * Math.min(usableW - minSize + 1, 5));
    roomH = minSize + Math.floor(rng() * Math.min(usableH - minSize + 1, 5));
  }

  const roomX = x + padding + Math.floor(rng() * (usableW - roomW + 1));
  const roomY = y + padding + Math.floor(rng() * (usableH - roomH + 1));

  const room: Room = {
    x: roomX,
    y: roomY,
    w: roomW,
    h: roomH,
    cx: Math.floor(roomX + roomW / 2),
    cy: Math.floor(roomY + roomH / 2),
  };

  node.room = room;
  rooms.push(room);
}

// ── Kruskal MST for corridor connections ──────────────────────────
interface Edge {
  a: number;
  b: number;
  dist: number;
}

class UnionFind {
  parent: number[];
  rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  union(x: number, y: number): boolean {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return false;
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
    return true;
  }
}

function buildMST(rooms: Room[]): [number, number][] {
  const edges: Edge[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const dx = rooms[i].cx - rooms[j].cx;
      const dy = rooms[i].cy - rooms[j].cy;
      edges.push({ a: i, b: j, dist: dx * dx + dy * dy });
    }
  }
  edges.sort((a, b) => a.dist - b.dist);

  const uf = new UnionFind(rooms.length);
  const mst: [number, number][] = [];

  for (const edge of edges) {
    if (uf.union(edge.a, edge.b)) {
      mst.push([edge.a, edge.b]);
      if (mst.length >= rooms.length - 1) break;
    }
  }

  return mst;
}

// ── L-shaped corridors ────────────────────────────────────────────
function carveCorridor(map: Tile[][], x1: number, y1: number, x2: number, y2: number, rng: () => number): void {
  // L-shaped: first horizontal then vertical, or vice versa
  const goHorizontalFirst = rng() < 0.5;

  const setFloor = (x: number, y: number) => {
    if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
      if (map[y][x] === Tile.WALL) {
        map[y][x] = Tile.FLOOR;
      }
    }
  };

  if (goHorizontalFirst) {
    // horizontal then vertical
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    for (let x = startX; x <= endX; x++) setFloor(x, y1);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    for (let y = startY; y <= endY; y++) setFloor(x2, y);
  } else {
    // vertical then horizontal
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    for (let y = startY; y <= endY; y++) setFloor(x1, y);
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    for (let x = startX; x <= endX; x++) setFloor(x, y2);
  }
}

// ── Carve rooms into map ──────────────────────────────────────────
function carveRoom(map: Tile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
        map[y][x] = Tile.FLOOR;
      }
    }
  }
}

// ── BFS connectivity check ────────────────────────────────────────
export function isMapFullyConnected(map: Tile[][]): boolean {
  const h = map.length;
  const w = map[0].length;

  // Find first floor tile
  let startX = -1, startY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (map[y][x] === Tile.FLOOR || map[y][x] === Tile.STAIRS_DOWN || map[y][x] === Tile.DOOR) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) return false; // no floor tiles at all

  const visited: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));
  const queue: [number, number][] = [[startX, startY]];
  visited[startY][startX] = true;

  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx]) {
        if (map[ny][nx] === Tile.FLOOR || map[ny][nx] === Tile.STAIRS_DOWN || map[ny][nx] === Tile.DOOR) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  // Check all floor-like tiles are visited
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((map[y][x] === Tile.FLOOR || map[y][x] === Tile.STAIRS_DOWN || map[y][x] === Tile.DOOR) && !visited[y][x]) {
        return false;
      }
    }
  }

  return true;
}

// ── Get player start (first room center) ──────────────────────────
export function getPlayerStart(map: Tile[][]): { x: number; y: number } {
  // Find first floor tile (top-left most)
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (map[y][x] === Tile.FLOOR) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

// ── Main generator ────────────────────────────────────────────────
export function generateMap(
  seed: string,
  floor: number,
  width: number = 50,
  height: number = 40,
): Tile[][] {
  const baseSeed = hashSeed(seed, floor);
  const rng = mulberry32(baseSeed);

  // 1. Initialize full WALL map
  const map: Tile[][] = Array.from({ length: height }, () => new Array(width).fill(Tile.WALL));

  // 2. Build BSP tree
  const root: BSPNode = {
    rect: { x: 0, y: 0, w: width, h: height },
    left: null,
    right: null,
    room: null,
  };

  // Floor scaling: deeper floors get more splits (more rooms)
  const maxDepth = 3 + Math.min(floor, 3); // ranges 3..6, giving 8..64 leaf nodes
  splitNode(root, 0, maxDepth, rng);

  // 3. Place rooms in leaf nodes
  const rooms = createRooms(root, rng);

  // 4. Ensure minimum rooms by merging or adjusting
  // BSP naturally gives enough rooms with maxDepth >= 3

  // 5. Carve rooms
  for (const room of rooms) {
    carveRoom(map, room);
  }

  // 6. Build MST and carve corridors
  const connections = buildMST(rooms);
  for (const [a, b] of connections) {
    carveCorridor(map, rooms[a].cx, rooms[a].cy, rooms[b].cx, rooms[b].cy, rng);
  }

  // 7. Place stairs in the room farthest from the first room
  if (rooms.length > 0) {
    const firstRoom = rooms[0];
    let farthestIdx = 0;
    let farthestDist = 0;
    for (let i = 1; i < rooms.length; i++) {
      const dx = rooms[i].cx - firstRoom.cx;
      const dy = rooms[i].cy - firstRoom.cy;
      const dist = dx * dx + dy * dy;
      if (dist > farthestDist) {
        farthestDist = dist;
        farthestIdx = i;
      }
    }
    const stairsRoom = rooms[farthestIdx];
    map[stairsRoom.cy][stairsRoom.cx] = Tile.STAIRS_DOWN;
  }

  // 8. Verify connectivity — if not fully connected, add extra corridors
  if (!isMapFullyConnected(map)) {
    // Fallback: connect remaining components
    ensureConnectivity(map, rooms, rng);
  }

  return map;
}

// ── Fallback connectivity helper ──────────────────────────────────
function ensureConnectivity(map: Tile[][], rooms: Room[], rng: () => number): void {
  // Find all connected components of floor tiles
  const h = map.length;
  const w = map[0].length;
  const visited: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));

  const components: [number, number][][] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!visited[y][x] && (map[y][x] === Tile.FLOOR || map[y][x] === Tile.STAIRS_DOWN || map[y][x] === Tile.DOOR)) {
        // BFS this component
        const comp: [number, number][] = [];
        const queue: [number, number][] = [[x, y]];
        visited[y][x] = true;
        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          comp.push([cx, cy]);
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx]) {
              if (map[ny][nx] === Tile.FLOOR || map[ny][nx] === Tile.STAIRS_DOWN || map[ny][nx] === Tile.DOOR) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
              }
            }
          }
        }
        components.push(comp);
      }
    }
  }

  // Connect each isolated component to the first one via a corridor
  if (components.length > 1) {
    for (let i = 1; i < components.length; i++) {
      const [ax, ay] = components[0][0]; // first tile of main component
      const [bx, by] = components[i][0]; // first tile of isolated component
      carveCorridor(map, ax, ay, bx, by, rng);
    }
  }
}
