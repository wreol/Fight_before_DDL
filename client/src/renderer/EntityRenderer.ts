import type { GameState, Enemy, Item } from '../types';

export class EntityRenderer {
  private ctx: CanvasRenderingContext2D;
  private tileSize: number = 20;

  constructor(ctx: CanvasRenderingContext2D, tileSize: number = 20) {
    this.ctx = ctx;
    this.tileSize = tileSize;
  }

  render(state: GameState): void {
    const { player, enemies, items, visibleTiles } = state;
    const ctx = this.ctx;
    const t = this.tileSize;

    // Render items on ground (only if visible)
    if (items) {
      let blinkPhase = Date.now() / 1000 * Math.PI * 2; // 2s blink cycle
      for (const item of items) {
        const ix = (item as any).x;
        const iy = (item as any).y;
        if (ix === undefined || iy === undefined) continue;

        // Visibility check
        if (iy >= 0 && iy < (visibleTiles?.length ?? 0) && ix >= 0 && ix < (visibleTiles?.[0]?.length ?? 0)) {
          if (!visibleTiles[iy][ix]) continue;
        }

        // Blink animation: alpha oscillates 0.6 ↔ 1.0
        const alpha = 0.6 + 0.4 * (Math.sin(blinkPhase + ix + iy) * 0.5 + 0.5);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${t * 0.7}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', ix * t + t / 2, iy * t + t / 2);
        ctx.globalAlpha = 1;
      }
    }

    // Render enemies (only if visible)
    if (enemies) {
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        const vx = enemy.x, vy = enemy.y;
        if (vy >= 0 && vy < (visibleTiles?.length ?? 0) && vx >= 0 && vx < (visibleTiles?.[0]?.length ?? 0)) {
          if (!visibleTiles[vy][vx]) continue; // skip if not visible
        }

        const px = enemy.x * t;
        const py = enemy.y * t;

        // Color by type
        let color = '#f23f43'; // normal = red
        if (enemy.type === 'elite') color = '#f0b232';
        if (enemy.type === 'boss') color = '#ff6b9d';

        // Render enemy name (first 1-2 chars)
        const label = enemy.name.length > 2 ? enemy.name.substring(0, 2) : enemy.name;
        ctx.fillStyle = color;
        ctx.font = `bold ${t * 0.65}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px + t / 2, py + t / 2);

        // Health bar below enemy
        const hpPct = enemy.hp / enemy.maxHp;
        const barWidth = t * 0.8;
        const barHeight = 3;
        const barX = px + (t - barWidth) / 2;
        const barY = py + t - 4;
        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hpPct > 0.5 ? '#23a55a' : hpPct > 0.25 ? '#f0b232' : '#f23f43';
        ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
      }
    }

    // Render player
    const px = player.x * t;
    const py = player.y * t;

    // Player glow
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00d4ff';
    ctx.font = `bold ${t * 0.75}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('@', px + t / 2, py + t / 2);

    // Reset shadow for subsequent draws
    ctx.shadowBlur = 0;
  }
}
