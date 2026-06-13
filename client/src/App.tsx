import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from './store/gameStore';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import StatusBar from './components/StatusBar';
import MessageLog from './components/MessageLog';
import InventoryPanel from './components/InventoryPanel';
import AugmentModal from './components/AugmentModal';
import DeathScreen from './components/DeathScreen';
import Leaderboard from './components/Leaderboard';
import SoulShop from './components/SoulShop';
import { saveGame } from './save/saveManager';

type View = 'menu' | 'playing' | 'leaderboard' | 'soulShop';

export default function App() {
  const [view, setView] = useState<View>('menu');
  const gameState = useGameStore(s => s.gameState);
  const processTurn = useGameStore(s => s.processTurn);

  // When transitioning TO playing, the MainMenu already starts the game.
  // But for programmatic use (e.g. seed-based), this is also available.
  const handleStartGame = useCallback(() => {
    setView('playing');
  }, []);

  // Keyboard input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'playing' || !gameState) return;

      const keyMap: Record<string, string> = {
        ArrowUp: 'ArrowUp',
        ArrowDown: 'ArrowDown',
        ArrowLeft: 'ArrowLeft',
        ArrowRight: 'ArrowRight',
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        processTurn(keyMap[e.key]);
      }

      // Use potion with 'i' key
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        processTurn('potion');
      }

      // Wait with 'Space' key
      if (e.key === ' ') {
        e.preventDefault();
        processTurn('wait');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, gameState, processTurn]);

  // Return to menu when player dies (after DeathScreen shows briefly via render)
  // The DeathScreen itself has action buttons; we keep the game view active so it shows.

  // Save game on page close/hide
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameState && gameState.status === 'playing') {
        saveGame(gameState);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  if (view === 'leaderboard') {
    return <Leaderboard onClose={() => setView('menu')} />;
  }

  if (view === 'soulShop') {
    return <SoulShop onClose={() => setView('menu')} />;
  }

  if (view === 'menu') {
    return (
      <MainMenu
        onStartGame={handleStartGame}
        onShowLeaderboard={() => setView('leaderboard')}
        onShowSoulShop={() => setView('soulShop')}
      />
    );
  }

  // Playing view
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <StatusBar />
      <div className="flex-1 flex items-start justify-center p-4 gap-4">
        <GameCanvas />
        <InventoryPanel />
      </div>
      <MessageLog />
      <AugmentModal />
      {gameState?.status === 'dead' && <DeathScreen />}
    </div>
  );
}
