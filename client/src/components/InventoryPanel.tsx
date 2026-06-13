import { useGameStore } from '../store/gameStore';

export default function InventoryPanel() {
  const gameState = useGameStore(s => s.gameState);
  const processTurn = useGameStore(s => s.processTurn);
  if (!gameState) return null;

  const { player } = gameState;

  return (
    <div className="bg-[#1e1f22] border border-[#3f4147] rounded-lg p-3 w-56">
      <h3 className="text-[#ffffff] font-bold text-sm mb-2 border-b border-[#3f4147] pb-1">背包</h3>

      {/* Equipment slots */}
      <div className="mb-3">
        <div className="text-[#80848e] text-xs mb-1">武器</div>
        <div className="bg-[#2b2d31] border border-[#faa61a] rounded px-2 py-1 text-sm text-[#dbdee1] h-7">
          {player.weapon ? player.weapon.name : '空手'}
        </div>
        <div className="text-[#80848e] text-xs mb-1 mt-2">护甲</div>
        <div className="bg-[#2b2d31] border border-[#80848e] rounded px-2 py-1 text-sm text-[#dbdee1] h-7">
          {player.armor ? player.armor.name : '无护甲'}
        </div>
      </div>

      {/* Potion slots (8 max) */}
      <div className="text-[#80848e] text-xs mb-1">物品 ({player.inventory.length}/8)</div>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }).map((_, i) => {
          const item = player.inventory[i];
          return (
            <button
              key={i}
              onClick={() => item?.type === 'potion' && processTurn('potion')}
              className={`h-10 rounded border text-xs p-0.5 transition-all ${
                item
                  ? 'bg-[#2b2d31] border-[#5865f2] hover:border-[#00d4ff] hover:shadow-[0_0_8px_#5865f2] cursor-pointer'
                  : 'bg-[#0a0a0f] border-dashed border-[#3f4147] cursor-default'
              }`}
              title={item?.description}
            >
              {item && (
                <span className="text-[#dbdee1]">{item.name}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Augments list */}
      {player.augments.length > 0 && (
        <div className="mt-3">
          <div className="text-[#80848e] text-xs mb-1">增幅 ({player.augments.length})</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {player.augments.map((aug, i) => (
              <div
                key={i}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  aug.rarity === 'legendary' ? 'bg-[#faa61a20] text-[#faa61a]' :
                  aug.rarity === 'rare' ? 'bg-[#5865f220] text-[#5865f2]' :
                  'bg-[#80848e20] text-[#80848e]'
                }`}
              >
                {aug.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
