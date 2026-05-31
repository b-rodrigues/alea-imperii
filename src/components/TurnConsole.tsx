import { Volume2, VolumeX, BookOpen, BarChart3, RotateCcw } from 'lucide-react';
import type { GameState } from '../types';

interface TurnConsoleProps {
  gameState: GameState;
  onToggleMusic: () => void;
  onShowRules: () => void;
  onShowStatus: () => void;
  onRestart: () => void;
}

export default function TurnConsole({
  gameState,
  onToggleMusic,
  onShowRules,
  onShowStatus,
  onRestart,
}: TurnConsoleProps) {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 bg-surface-container-low border border-outline-variant p-2.5 rounded-lg shadow-lg">
      <div className="flex-1 flex flex-col justify-start">
        <div className="flex items-center gap-2 mb-0.5 select-none">
          <p className="font-label text-label-md text-primary opacity-85 uppercase tracking-widest text-xs leading-none">
            Turn Console — Turn {gameState.turn}
          </p>
          {gameState.playerCount && gameState.playerCount > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: gameState.playerCount }).map((_, i) => {
                const isActive = i === (gameState.activePlayerIndex ?? 0);
                return (
                  <span
                    key={i}
                    className={`material-symbols-outlined transition-all duration-300 ${
                      isActive
                        ? 'text-amber-500 font-bold opacity-100'
                        : 'text-on-surface-variant opacity-30 grayscale'
                    }`}
                    style={{
                      fontSize: isActive && i === 1 ? '22px' : '16px',
                      transform: isActive && i === 1 ? 'scale(1.25)' : 'none',
                      display: 'inline-block'
                    }}
                    title={`Player ${i + 1} ${isActive ? '(Active)' : ''}`}
                  >
                    person
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
          <span className="font-semibold text-on-surface">Recent:</span>{' '}
          {gameState.recentStatus}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleMusic}
          className={`px-3 py-1.5 rounded-md font-label text-[11px] tracking-wider transition-all flex items-center gap-1.5 select-none border border-outline-variant ${
            gameState.isMuted
              ? 'bg-surface-container-highest/50 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              : 'bg-primary-container text-on-primary font-bold shadow-md hover:brightness-110'
          }`}
        >
          {gameState.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {gameState.isMuted ? 'Muted' : 'Playing Ancient Ambient'}
        </button>

        <button
          onClick={onShowRules}
          className="px-3 py-1.5 bg-surface-container-highest hover:bg-surface-variant hover:text-white border border-outline-variant text-on-surface-variant rounded-md font-label text-[11px] tracking-wider transition-colors flex items-center gap-1.5 select-none"
        >
          <BookOpen size={14} /> Rules
        </button>

        <button
          onClick={onShowStatus}
          className="px-3 py-1.5 bg-surface-container-highest hover:bg-surface-variant hover:text-white border border-outline-variant text-on-surface-variant rounded-md font-label text-[11px] tracking-wider transition-colors flex items-center gap-1.5 select-none"
        >
          <BarChart3 size={14} /> Game Status
        </button>

        <button
          onClick={onRestart}
          className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/50 hover:text-red-300 border border-red-900/30 text-red-200/80 rounded-md font-label text-[11px] tracking-wider transition-colors flex items-center gap-1.5 select-none"
          title="Restart game"
        >
          <RotateCcw size={14} /> Restart
        </button>
      </div>
    </div>
  );
}
