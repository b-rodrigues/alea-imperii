import { useState, useEffect } from 'react';
import { X, Award, FileText, CheckCircle2 } from 'lucide-react';
import type { GameState } from '../types';

interface StatusModalProps {
  isOpen: boolean;
  gameState: GameState;
  onClose: () => void;
}

export default function StatusModal({ isOpen, gameState, onClose }: StatusModalProps) {
  const [selectedIdx, setSelectedIdx] = useState(gameState.activePlayerIndex ?? 0);

  useEffect(() => {
    if (isOpen) {
      setSelectedIdx(gameState.activePlayerIndex ?? 0);
    }
  }, [isOpen, gameState.activePlayerIndex]);

  if (!isOpen) return null;

  const isMulti = gameState.playerCount && gameState.playerCount > 1 && gameState.playerStates;
  const targetPlayer = isMulti && gameState.playerStates ? gameState.playerStates[selectedIdx] : null;

  // Compute scoring breakdown for active/selected target player
  const monuments = targetPlayer ? targetPlayer.monuments : gameState.monuments;
  const developments = targetPlayer ? targetPlayer.developments : gameState.developments;
  const penaltyDisasters = targetPlayer ? targetPlayer.disasterPoints : gameState.disasterPoints;
  const historyLog = targetPlayer ? targetPlayer.history : gameState.history;
  const cityCount = targetPlayer ? targetPlayer.cities.count : gameState.cities.count;
  const activeResources = targetPlayer ? targetPlayer.resources : gameState.resources;

  const monumentPoints = monuments.reduce((acc, m) => {
    if (m.completedByPlayer) {
      return acc + (m.completedByAI ? m.otherPoints : m.firstPoints);
    }
    return acc;
  }, 0);

  const devPurchasePoints = developments.reduce((acc, d) => {
    return acc + (d.purchased ? d.points : 0);
  }, 0);

  // Education booster points: +1 point per owned development if Education is purchased
  const hasEducation = developments.find(d => d.id === 'education')?.purchased;
  const numDevs = developments.filter(d => d.purchased).length;
  const educationBonus = hasEducation ? numDevs : 0;

  // Empire booster points: +2 points per city owned if Empire is purchased
  const hasEmpire = developments.find(d => d.id === 'empire')?.purchased;
  const empireBonus = hasEmpire ? cityCount * 2 : 0;

  const totalScoreComputed = monumentPoints + devPurchasePoints + educationBonus + empireBonus - penaltyDisasters;

  return (
    <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="texture-parchment text-surface-container-lowest max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-[2rem] p-6 md:p-8 border border-outline shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container-lowest/10 transition-colors cursor-pointer"
          title="Close Status"
        >
          <X size={20} className="text-on-primary-fixed" />
        </button>

        <div className="border-b border-outline-variant/30 pb-4 mb-4">
          <h2 className="font-serif text-2xl font-bold text-on-primary-fixed flex items-center gap-2">
            <Award className="text-primary-container" /> Civilization Standing Ledger
          </h2>
          <p className="font-label text-xs text-on-tertiary-fixed opacity-80 uppercase tracking-widest leading-none mt-1">
            Official Balance Sheet
          </p>
        </div>

        {/* Tab Buttons for Multiplayer */}
        {isMulti && gameState.playerStates && (
          <div className="flex flex-wrap gap-2 mb-4 border-b border-outline-variant/20 pb-3 select-none">
            {gameState.playerStates.map((p, idx) => {
              const isActive = idx === selectedIdx;
              const isTurnActive = idx === gameState.activePlayerIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all shadow-sm focus:outline-none cursor-pointer ${
                    isActive
                      ? 'bg-on-primary-fixed text-white scale-105 border border-amber-600'
                      : 'bg-surface-container-lowest/5 border border-on-tertiary-fixed/20 text-on-tertiary-fixed hover:bg-surface-container-lowest/10'
                  }`}
                >
                  {p.name} ({p.score} pts) {isTurnActive && '👤'}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Score Calculation Grid */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-on-primary-fixed border-b border-outline-variant/20 pb-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Points Breakdown
            </h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between border-b border-on-tertiary-fixed/10 pb-1 text-on-primary-fixed">
                <span>🏛️ Completed Monuments:</span>
                <span className="font-bold text-sm">+{monumentPoints}</span>
              </div>
              <div className="flex justify-between border-b border-on-tertiary-fixed/10 pb-1 text-on-primary-fixed">
                <span>📜 Purchased Developments:</span>
                <span className="font-bold text-sm">+{devPurchasePoints}</span>
              </div>
              {hasEducation && (
                <div className="flex justify-between border-b border-on-tertiary-fixed/10 pb-1 text-amber-900 font-medium">
                  <span>🎓 Education Bonus:</span>
                  <span className="font-bold">+{educationBonus}</span>
                </div>
              )}
              {hasEmpire && (
                <div className="flex justify-between border-b border-on-tertiary-fixed/10 pb-1 text-amber-900 font-medium">
                  <span>👑 Empire Bonus (Cities):</span>
                  <span className="font-bold">+{empireBonus}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-on-tertiary-fixed/10 pb-1 text-red-900 font-medium">
                <span>💀 Disasters Checked:</span>
                <span className="font-bold">-{penaltyDisasters}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-outline-variant/30 text-on-primary-fixed text-sm font-bold">
                <span>👑 Final Score:</span>
                <span className="text-lg underline underline-offset-4">{totalScoreComputed}</span>
              </div>
            </div>

            {/* Warehouse Overview */}
            <div className="p-3 bg-surface-container-lowest/5 rounded-xl border border-on-tertiary-fixed/10 font-sans mt-2">
              <h4 className="text-xs font-semibold text-on-primary-fixed mb-1.5 uppercase tracking-wider">
                Warehouse &amp; Cities Status
              </h4>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] text-on-tertiary-fixed">
                <div className="border border-on-tertiary-fixed/10 p-1 rounded text-center">
                  🏙️ Cities: <strong className="text-amber-900 font-bold">{cityCount}</strong>
                </div>
                <div className="border border-on-tertiary-fixed/10 p-1 rounded text-center">
                  🍴 Food: <strong>{activeResources.food}</strong>
                </div>
                <div className="border border-on-tertiary-fixed/10 p-1 rounded text-center">
                  🪵 Wood: <strong>{activeResources.wood}</strong>
                </div>
                <div className="border border-on-tertiary-fixed/10 p-1 rounded text-center">
                  🪨 Stone: <strong>{activeResources.stone}</strong>
                </div>
                <div className="border border-on-tertiary-fixed/10 p-1 rounded text-center">
                  🏺 Pottery: <strong>{activeResources.pottery}</strong>
                </div>
                <div className="border border-on-tertiary-fixed/10 p-1 rounded text-center">
                  🏺 Cloth: <strong>{activeResources.cloth}</strong>
                </div>
                <div className="border border-on-tertiary-fixed/10 p-1 rounded text-center col-span-3">
                  ⚔️ Spearheads: <strong>{activeResources.spear}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Log History */}
          <div className="flex flex-col h-full max-h-[350px]">
            <h3 className="font-serif text-lg font-bold text-on-primary-fixed border-b border-outline-variant/20 pb-1.5 flex items-center gap-1.5 mb-2">
              <FileText size={16} /> Annals &amp; History
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 font-mono text-[10px] leading-relaxed bg-surface-container-lowest/15 border border-on-tertiary-fixed/10 p-3 rounded-xl max-h-[220px] md:max-h-[260px]">
              {historyLog.map((log, i) => (
                <div key={i} className="text-on-primary-fixed/80 border-b border-on-tertiary-fixed/5 pb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-surface-container-lowest text-on-surface hover:text-white rounded-lg text-xs font-semibold shadow hover:bg-surface-variant transition-colors cursor-pointer"
          >
            Close Standing
          </button>
        </div>
      </div>
    </div>
  );
}
