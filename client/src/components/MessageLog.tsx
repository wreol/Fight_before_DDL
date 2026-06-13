import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export default function MessageLog() {
  const gameState = useGameStore(s => s.gameState);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState?.messageLog]);

  if (!gameState) return null;

  return (
    <div
      ref={scrollRef}
      className="bg-[rgba(0,0,0,0.7)] border-t border-[#3f4147] px-3 py-1.5 h-24 overflow-y-auto font-mono text-xs"
    >
      {gameState.messageLog.map((msg, i) => (
        <div
          key={i}
          className="py-0.5 text-[#dbdee1]"
        >
          {msg}
        </div>
      ))}
    </div>
  );
}
