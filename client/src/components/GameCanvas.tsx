import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { MapRenderer } from '../renderer/MapRenderer';
import { EntityRenderer } from '../renderer/EntityRenderer';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRendererRef = useRef<MapRenderer | null>(null);
  const entityRendererRef = useRef<EntityRenderer | null>(null);
  const gameState = useGameStore(s => s.gameState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    mapRendererRef.current = new MapRenderer(canvas);
    entityRendererRef.current = new EntityRenderer(ctx);
  }, []);

  useEffect(() => {
    if (!gameState || !mapRendererRef.current || !entityRendererRef.current) return;
    mapRendererRef.current.render(gameState);
    entityRendererRef.current.render(gameState);
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      className="border border-[#3f4147] rounded-lg"
      style={{ imageRendering: 'pixelated' }}
      width={1000}
      height={800}
    />
  );
}
