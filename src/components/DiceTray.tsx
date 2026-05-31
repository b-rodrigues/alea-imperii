import { motion } from 'motion/react';
import { Utensils, Hammer, Coins, Package, Skull, Sparkles, Check } from 'lucide-react';
import type { Die } from '../types';

interface DiceTrayProps {
  dice: Die[];
  rollsLeft: number;
  phase: 'roll' | 'assign' | 'feed' | 'buy' | 'end';
  hasLeadership: boolean;
  hasRerolledSkullThisTurn: boolean;
  onToggleKeep: (dieId: number) => void;
  onRerollSkull: (dieId: number) => void;
  onRoll: () => void;
  onDoneRolling: () => void;
}

export default function DiceTray({
  dice,
  rollsLeft,
  phase,
  hasLeadership,
  hasRerolledSkullThisTurn,
  onToggleKeep,
  onRerollSkull,
  onRoll,
  onDoneRolling,
}: DiceTrayProps) {
  const getIcon = (value: Die['value']) => {
    const size = 16;
    switch (value) {
      case 'food':
        return <Utensils size={size} className="text-amber-800" />;
      case 'goods':
        return <Package size={size} className="text-orange-900" />;
      case 'skull':
        return <Skull size={size} className="text-red-700 font-bold" />;
      case 'worker':
        return <Hammer size={size} className="text-amber-950" />;
      case 'food_or_worker':
        return <Sparkles size={size} className="text-amber-600" />;
      case 'coin':
        return <Coins size={size} className="text-yellow-700" />;
      case 'empty':
        return <span className="text-on-surface-variant/40 text-lg font-serif">?</span>;
    }
  };

  const getLabel = (value: Die['value']) => {
    switch (value) {
      case 'food': return '3 Food';
      case 'goods': return '1 Good';
      case 'skull': return '2 Goods, Skull';
      case 'worker': return '3 Workers';
      case 'food_or_worker': return '2 Food/Work';
      case 'coin': return '7 Coins';
      case 'empty': return 'Unrolled';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-surface-container-low border border-outline-variant rounded-md p-1.5 md:p-2 shadow flex flex-col md:flex-row items-center gap-2">
      <div className="flex flex-col shrink-0 select-none">
        <span className="font-serif text-xs text-primary uppercase tracking-widest leading-none mb-0.5">
          Dice Tray
        </span>
        {phase === 'roll' && (
          <span className="font-mono text-xs text-on-surface-variant/80">
            Rolls: <span className="text-primary font-bold">{rollsLeft}</span>/3 left
          </span>
        )}
        {phase !== 'roll' && (
          <span className="font-mono text-xs text-green-500 font-medium">
            Rolling Done
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 justify-center flex-1 py-1" id="dice-container">
        {dice.map((die) => {
          const isSkull = die.value === 'skull';
          const isEmpty = die.value === 'empty';
          const canRerollSkull = isSkull && hasLeadership && !hasRerolledSkullThisTurn;

          return (
            <div key={die.id} className="relative group">
              <motion.button
                disabled={phase !== 'roll' || isEmpty}
                onClick={() => onToggleKeep(die.id)}
                animate={die.rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 0.9, 1.1, 1] } : {}}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className={`w-10 h-10 dice-face flex flex-col items-center justify-center font-bold text-xs relative transition-all ${
                  die.kept && phase === 'roll'
                    ? 'ring-2 ring-primary scale-105 border-primary shadow border'
                    : isEmpty
                      ? 'border-dashed border-outline-variant/60 bg-surface-container-low cursor-default'
                      : 'border border-outline-variant'
                } ${isSkull ? 'bg-red-950/5' : ''} ${phase !== 'roll' || isEmpty ? 'opacity-90 cursor-default' : 'hover:brightness-105'}`}
                title={phase === 'roll' ? (isEmpty ? "Roll the dice to see results" : `${getLabel(die.value)} - Click to keep`) : getLabel(die.value)}
              >
                {getIcon(die.value)}
                <span className="text-[7px] font-semibold uppercase font-label mt-0.5 opacity-70 leading-none">
                  {getLabel(die.value)}
                </span>

                {/* Kept indicator badge */}
                {die.kept && phase === 'roll' && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-on-primary rounded-full flex items-center justify-center text-[8px] font-bold shadow">
                    ✓
                  </span>
                )}
              </motion.button>

              {/* Leadership skull replacement trick */}
              {phase === 'roll' && canRerollSkull && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRerollSkull(die.id);
                  }}
                  className="absolute -bottom-2 translate-y-1/2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-600 hover:bg-amber-500 text-on-primary text-[8px] px-1.5 py-0.5 rounded shadow font-bold flex items-center gap-1 z-10 animate-bounce active:scale-95"
                  title="Leadership effect: Reroll 1 skull per turn!"
                >
                  <Sparkles size={8} /> Leadership, Reroll Skull
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0 select-none">
        {phase === 'roll' ? (
          <>
            <button
              onClick={onRoll}
              disabled={rollsLeft === 0}
              className={`px-2 py-1 rounded font-semibold text-[10px] tracking-wide transition-all shadow flex items-center gap-1 uppercase font-label select-none ${
                rollsLeft > 0
                  ? 'embossed-bronze cursor-pointer transform active:scale-95'
                  : 'bg-surface-container-highest text-on-surface-variant/40 border border-outline-variant/20 cursor-not-allowed'
              }`}
            >
              <Sparkles size={11} /> Reroll unkept
            </button>
            <button
              onClick={onDoneRolling}
              className="px-2 py-1 bg-surface-container-highest hover:bg-surface-variant hover:text-white text-on-surface-variant border border-outline-variant rounded font-semibold font-label text-[10px] tracking-wide transition-all shadow active:scale-95 flex items-center gap-1 select-none uppercase cursor-pointer"
            >
              <Check size={11} /> Done Rolling
            </button>
          </>
        ) : (
          <span className="text-xs text-on-surface-variant italic font-sans pr-2">
            Proceed with resource assignment below
          </span>
        )}
      </div>
    </div>
  );
}
