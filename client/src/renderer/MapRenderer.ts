import { Tile, type GameState } from '../types';

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize: number = 20;
  private mapWidth: number = 50;
  private mapHeight: number = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    this.canvas.width = this.mapWidth * this.tileSize;
    this.canvas.height = this.mapHeight * this.tileSize;
  }

  render(state: GameState): void {
    const { map, exploredTiles, visibleTiles } = state;
    const ctx = this.ctx;

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[0].length; x++) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const explored = exploredTiles[y]?.[x] ?? false;
        const visible = visibleTiles[y]?.[x] ?? false;
        const tile = map[y][x];

        if (!explored) {
          // Unexplored: pure black
          ctx.fillStyle = '#0a0a0f';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          continue;
        }

        if (tile === Tile.WALL) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          ctx.strokeStyle = '#2a2a3e';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px + 0.5, py + 0.5, this.tileSize - 1, this.tileSize - 1);
        } else {
          // Floor / Stairs / Door — draw floor base
          ctx.fillStyle = '#16213e';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);

          // Faint grid lines
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, this.tileSize, this.tileSize);

          if (tile === Tile.STAIRS_DOWN) {
            // Stairs marker
            ctx.fillStyle = '#ffffff';
            ctx.font = `${this.tileSize * 0.7}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▼', px + this.tileSize / 2, py + this.tileSize / 2);
          }
        }

        // FOV dim overlay for explored but not visible tiles
        if (!visible) {
          ctx.fillStyle = 'rgba(10,10,15,0.7)';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
        }
      }
    }
  }
}
