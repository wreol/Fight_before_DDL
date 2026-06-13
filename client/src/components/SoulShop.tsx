import { useState } from 'react';
import { getSoulPoints, spendSoulPoints, isUnlocked, addUnlock } from '../save/saveManager';

interface Props {
  onClose: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'unlock_headphones',
    name: '降噪耳机',
    description: '起始武器：+5攻击',
    cost: 50,
    effect: 'weapon_i_headphones',
  },
  {
    id: 'unlock_notes',
    name: '学霸笔记',
    description: '起始武器：+8攻击',
    cost: 100,
    effect: 'weapon_i_notes',
  },
  {
    id: 'unlock_makeup',
    name: '补考机会',
    description: '起始护甲：+5防御',
    cost: 75,
    effect: 'armor_i_makeup_exam',
  },
  {
    id: 'unlock_extra_potion',
    name: '奶茶储备',
    description: '起始额外带一瓶奶茶',
    cost: 40,
    effect: 'extra_potion',
  },
];

export default function SoulShop({ onClose }: Props) {
  const [soulPoints, setSoulPoints] = useState(() => getSoulPoints());
  const [unlocked, setUnlocked] = useState<string[]>(() =>
    SHOP_ITEMS.filter(item => isUnlocked(item.id)).map(i => i.id),
  );

  const handleBuy = (item: ShopItem) => {
    if (soulPoints < item.cost || unlocked.includes(item.id)) return;
    if (spendSoulPoints(item.cost)) {
      addUnlock(item.id);
      setSoulPoints(getSoulPoints());
      setUnlocked([...unlocked, item.id]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-xl">灵魂商店</h2>
          <div>
            <span className="text-[#faa61a] font-bold mr-4">
              🪙 {soulPoints} 灵魂
            </span>
            <button
              onClick={onClose}
              className="text-[#80848e] hover:text-white transition-colors"
            >
              ✕ 返回
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SHOP_ITEMS.map(item => {
            const owned = unlocked.includes(item.id);
            const canAfford = soulPoints >= item.cost;

            return (
              <button
                key={item.id}
                onClick={() => handleBuy(item)}
                disabled={owned || !canAfford}
                className={`p-4 rounded-lg border text-left transition-all ${
                  owned
                    ? 'bg-[#23a55a20] border-[#23a55a] cursor-default'
                    : canAfford
                      ? 'bg-[#1e1f22] border-[#3f4147] hover:border-[#5865f2] cursor-pointer'
                      : 'bg-[#1e1f22] border-[#3f4147] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="text-white font-bold text-sm mb-1">
                  {owned && '✅ '}
                  {item.name}
                </div>
                <div className="text-[#80848e] text-xs mb-2">{item.description}</div>
                <div
                  className={`text-xs font-bold ${owned ? 'text-[#23a55a]' : 'text-[#faa61a]'}`}
                >
                  {owned ? '已解锁' : `🪙 ${item.cost}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
