import { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../types';

interface Props {
  onClose: () => void;
}

export default function Leaderboard({ onClose }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard?limit=50')
      .then(r => r.json())
      .then(data => setEntries(data.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const rankColor = (rank: number): string =>
    rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#80848e';

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="bg-[#1e1f22] border border-[#3f4147] rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-xl">排行榜</h2>
          <button
            onClick={onClose}
            className="text-[#80848e] hover:text-white transition-colors"
          >
            ✕ 返回
          </button>
        </div>

        {loading ? (
          <div className="text-center text-[#80848e] py-8">加载中...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-[#80848e] py-8">
            还没有人提交成绩，来做第一个吧！
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#80848e] text-xs uppercase border-b border-[#3f4147]">
                <th className="py-2 text-left w-12">排名</th>
                <th className="py-2 text-left">玩家</th>
                <th className="py-2 text-right w-16">层数</th>
                <th className="py-2 text-right w-16">击杀</th>
                <th className="py-2 text-right w-20">分数</th>
                <th className="py-2 text-right w-24">死因</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#3f414720] ${
                    i % 2 === 0 ? 'bg-[#1e1f22]' : 'bg-[#26282d]'
                  }`}
                >
                  <td className="py-2 font-bold" style={{ color: rankColor(entry.rank) }}>
                    {entry.rank}
                  </td>
                  <td className="py-2 text-[#dbdee1]">{entry.player_name}</td>
                  <td className="py-2 text-right text-[#ffffff] font-bold">
                    {entry.floor_reached}
                  </td>
                  <td className="py-2 text-right text-[#dbdee1]">{entry.enemies_killed}</td>
                  <td className="py-2 text-right text-[#faa61a] font-bold">{entry.score}</td>
                  <td className="py-2 text-right text-[#f23f43] text-xs">{entry.died_to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
