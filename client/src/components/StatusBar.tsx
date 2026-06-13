import { useGameStore } from '../store/gameStore';

const LEVEL_NAMES = ['', '大一生', '大二生', '大三生', '大四生'];

export default function StatusBar() {
  const gameState = useGameStore(s => s.gameState);
  if (!gameState) return null;

  const { player, floor, turnCount } = gameState;
  const hpPct = Math.max(0, player.hp / player.maxHp);
  const hpColor = hpPct > 0.5 ? '#23a55a' : hpPct > 0.25 ? '#f0b232' : '#f23f43';

  return (
    <div className="bg-[#1e1f22] border-b border-[#3f4147] px-4 py-2 flex items-center gap-4 font-mono text-sm">
      {/* HP Bar */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="text-[#dbdee1]">精力</span>
        <div className="flex-1 h-4 bg-[#0a0a0f] rounded-full overflow-hidden border border-[#3f4147]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPct * 100}%`, backgroundColor: hpColor }}
          />
        </div>
        <span className="text-[#dbdee1] text-xs w-16 text-right">
          {player.hp}/{player.maxHp}
        </span>
      </div>

      {/* Level badge */}
      <div className="bg-[#2b2d31] px-3 py-0.5 rounded text-[#faa61a] font-bold">
        {LEVEL_NAMES[player.level] || '大四生'}
      </div>

      {/* XP */}
      <div className="text-[#80848e] text-xs">
        XP: {player.xp}/{player.xpToNext}
      </div>

      {/* Floor */}
      <div className="text-[#dbdee1]">
        第 <span className="text-[#ffffff] font-bold">{floor}</span> 层
      </div>

      {/* Stats */}
      <div className="ml-auto flex gap-3 text-xs text-[#80848e]">
        <span>⚔ {player.attack}</span>
        <span>🛡 {player.defense}</span>
        <span>💀 {gameState.totalKills}</span>
        <span>🕐 {turnCount}</span>
      </div>
    </div>
  );
}
