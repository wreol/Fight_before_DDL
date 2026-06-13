import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { hasSave, loadGame } from '../save/saveManager';

interface Props {
  onStartGame: () => void;
  onShowLeaderboard: () => void;
  onShowSoulShop: () => void;
}

export default function MainMenu({ onStartGame, onShowLeaderboard, onShowSoulShop }: Props) {
  const startNewGame = useGameStore(s => s.startNewGame);
  const continueGame = useGameStore(s => s.continueGame);
  const [hasExistingSave] = useState(() => hasSave());

  const handleNewGame = () => {
    const seed = String(Date.now());
    startNewGame(seed);
    onStartGame();
  };

  const handleContinue = () => {
    const saved = loadGame();
    if (saved) {
      continueGame(saved);
      onStartGame();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        {/* Title */}
        <h1
          className="text-6xl font-bold mb-2"
          style={{
            color: '#ffffff',
            WebkitTextStroke: '2px #f23f43',
            fontFamily: "'Feather Bold', 'Helvetica Neue', sans-serif",
          }}
        >
          大学地牢
        </h1>
        <p className="text-[#80848e] mb-10 text-sm">College Dungeon — 一场大学生存 Roguelike</p>

        {/* Mascot area */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-[#1e1f22] border-2 border-[#3f4147] rounded-lg flex items-center justify-center">
            <span className="text-4xl">🎓</span>
          </div>
          <p className="text-[#80848e] text-xs mt-2">从大一新生开始，活到毕业</p>
        </div>

        {/* Menu buttons */}
        <div className="space-y-3 w-64 mx-auto">
          <button
            onClick={handleNewGame}
            className="w-full bg-[#23a55a] hover:bg-[#1a7a44] text-white font-bold py-3 rounded transition-colors text-lg"
          >
            新游戏
          </button>
          {hasExistingSave && (
            <button
              onClick={handleContinue}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded transition-colors text-lg"
            >
              继续冒险
            </button>
          )}
          <button
            onClick={onShowLeaderboard}
            className="w-full bg-[#2b2d31] hover:bg-[#3f4147] text-[#dbdee1] py-3 rounded border border-[#3f4147] transition-colors"
          >
            排行榜
          </button>
          <button
            onClick={onShowSoulShop}
            className="w-full bg-[#2b2d31] hover:bg-[#3f4147] text-[#faa61a] py-3 rounded border border-[#faa61a40] transition-colors"
          >
            灵魂商店
          </button>
        </div>

        <p className="text-[#80848e] text-xs mt-8">方向键移动 · 自动战斗 · 回合制</p>
      </div>
    </div>
  );
}
