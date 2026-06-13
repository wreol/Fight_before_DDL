import type { LeaderboardResponse, SeedResponse, ShareCardResponse, RunData } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  getTodaySeed: () =>
    request<SeedResponse>('/seed/today'),

  getLeaderboard: (date?: string, limit = 50) =>
    request<LeaderboardResponse>(`/leaderboard?${date ? `date_filter=${date}&` : ''}limit=${limit}`),

  submitScore: (data: {
    player_name: string;
    seed: string;
    date: string;
    floor_reached: number;
    enemies_killed: number;
    score: number;
    augments_collected?: number;
    run_duration_seconds?: number;
    died_to?: string;
  }) =>
    request<{ id: number; rank: number }>('/leaderboard', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createShare: (runData: RunData) =>
    request<ShareCardResponse>('/share', {
      method: 'POST',
      body: JSON.stringify({ run_data: runData }),
    }),

  getShare: (cardId: string) =>
    request<{ run_data: RunData }>(`/share/${cardId}`),
};
