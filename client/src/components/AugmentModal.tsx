import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getAugmentChoices } from '../engine/AugmentPool';
import type { Augment } from '../types';

export default function AugmentModal() {
  const gameState = useGameStore((s) => s.gameState);
  const selectAugment = useGameStore((s) => s.selectAugment);
  const [choices, setChoices] = useState<Augment[]>([]);
  const [show, setShow] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Track the last message we processed to avoid re-triggering
  const lastProcessedMsgIdx = useRef(-1);

  // Show when gameState indicates augments should be shown
  // (triggered by last elite/boss kill from message log)
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;
    const msgLen = gameState.messageLog.length;
    if (msgLen === 0) return;

    const lastIdx = msgLen - 1;
    if (lastIdx === lastProcessedMsgIdx.current) return;

    const lastMsg = gameState.messageLog[lastIdx] || '';
    if (lastMsg.includes('选择一个觉醒增幅')) {
      lastProcessedMsgIdx.current = lastIdx;

      // Determine if last kill was elite or boss from log context
      const isBoss =
        gameState.messageLog.some((m) => m.includes('期末周'));
      const type = isBoss ? 'boss' : 'elite';
      const augChoices = getAugmentChoices(type);
      setChoices(augChoices);
      setShow(true);
      setSelectedId(null);
    }
  }, [gameState?.messageLog]);

  const handleSelect = (aug: Augment) => {
    setSelectedId(aug.id);
    selectAugment(aug.id);
    // Auto-close after selection with brief delay for visual feedback
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  const borderColor = (rarity: string) =>
    rarity === 'legendary'
      ? '#faa61a'
      : rarity === 'rare'
        ? '#5865f2'
        : '#80848e';

  const glowColor = (rarity: string) =>
    rarity === 'legendary'
      ? '0 0 12px #faa61a40'
      : rarity === 'rare'
        ? '0 0 8px #5865f240'
        : 'none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl p-6 w-[600px] max-w-[90vw]">
        <h2 className="text-white text-2xl font-bold text-center mb-6 border-b border-[#3f4147] pb-3">
          选择你的觉醒
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {choices.map((aug) => (
            <button
              key={aug.id}
              onClick={() => handleSelect(aug)}
              className={`bg-[#1e1f22] rounded-lg p-4 text-left transition-all duration-200 hover:scale-105 ${
                selectedId === aug.id ? 'scale-95 opacity-50' : ''
              }`}
              style={{
                border: `2px solid ${borderColor(aug.rarity)}`,
                boxShadow: glowColor(aug.rarity),
              }}
            >
              <div
                className="text-xs font-bold uppercase mb-2"
                style={{ color: borderColor(aug.rarity) }}
              >
                {aug.rarity === 'legendary'
                  ? '传说'
                  : aug.rarity === 'rare'
                    ? '稀有'
                    : '普通'}
              </div>
              <div className="text-white font-bold text-sm mb-1">
                {aug.name}
              </div>
              <div className="text-[#80848e] text-xs">{aug.description}</div>
              {aug.stackable && (
                <div className="text-[#23a55a] text-xs mt-2">可堆叠</div>
              )}
            </button>
          ))}
        </div>
        <div className="text-[#80848e] text-xs text-center mt-4">
          点击卡片选择一项增幅 — 本局永久有效
        </div>
      </div>
    </div>
  );
}
