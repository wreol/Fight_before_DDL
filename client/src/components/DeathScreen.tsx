import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { calculateSoulPoints, addSoulPoints } from '../save/saveManager';

export default function DeathScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const returnToMenu = useGameStore((s) => s.returnToMenu);

  if (!gameState || gameState.status !== 'dead') return null;

  const { player, floor, turnCount, seed, totalKills } = gameState;
  const soulPoints = calculateSoulPoints(floor, totalKills);

  // Save soul points on death (once)
  useEffect(() => {
    addSoulPoints(soulPoints);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #1a0000 0%, #0a0a0f 100%)',
      }}
    >
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#f23f43] mb-2">你破防了</h1>
        <p className="text-[#80848e] mb-8">已老实，求放过</p>

        {/* Stats card */}
        <div className="bg-[#1e1f22] border border-[#3f4147] rounded-lg p-6 mb-6 w-80 mx-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-[#80848e] text-right">到达层数</div>
            <div className="text-[#ffffff] text-left font-bold">
              {floor} 层
            </div>
            <div className="text-[#80848e] text-right">击杀敌人</div>
            <div className="text-[#ffffff] text-left font-bold">
              {totalKills}
            </div>
            <div className="text-[#80848e] text-right">GPA</div>
            <div className="text-[#faa61a] text-left font-bold">
              {(player.xp / 10).toFixed(1)}
            </div>
            <div className="text-[#80848e] text-right">回合数</div>
            <div className="text-[#ffffff] text-left font-bold">
              {turnCount}
            </div>
            <div className="text-[#80848e] text-right">灵魂点数</div>
            <div className="text-[#faa61a] text-left font-bold">
              +{soulPoints}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {}} // Share - to be wired in Task 24
            className="bg-[#2b2d31] hover:bg-[#3f4147] text-[#dbdee1] px-6 py-2 rounded border border-[#3f4147] transition-colors"
          >
            分享卡片
          </button>
          <button
            onClick={() => startNewGame(seed + '_new')}
            className="bg-[#23a55a] hover:bg-[#1a7a44] text-white px-6 py-2 rounded transition-colors"
          >
            再来一局
          </button>
          <button
            onClick={returnToMenu}
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
