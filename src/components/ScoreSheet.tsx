import { Skull, Check } from 'lucide-react';
import type { GameState, Development } from '../types';

interface ScoreSheetProps {
  gameState: GameState;
  onToggleDevelopmentPurchase: (devId: string) => void;
  onToggleCity?: (cityNum: number) => void;
  onToggleCityProgress?: (slotIdx: number) => void;
  onToggleMonumentSlot?: (monumentId: string, slotIdx: number) => void;
  onToggleMonumentBonus?: (monumentId: string, type: 'first' | 'other' | 'none') => void;
}

const getCityRequiredBoxes = (cityNum: number): number => {
  switch (cityNum) {
    case 4: return 2;
    case 5: return 3;
    case 6: return 4;
    case 7: return 5;
    default: return 0;
  }
};

export default function ScoreSheet({
  gameState,
  onToggleDevelopmentPurchase,
  onToggleCity,
  onToggleCityProgress,
  onToggleMonumentSlot,
  onToggleMonumentBonus,
}: ScoreSheetProps) {
  const disasterIndexList = Array.from({ length: 9 }, (_, i) => i + 1);

  // Split developments into the 3 columns per rules
  const col1Ids = ['leadership', 'irrigation', 'agriculture', 'quarrying', 'medicine'];
  const col2Ids = ['coinage', 'caravans', 'religion', 'granaries', 'banking'];
  const col3Ids = ['masonry', 'engineering', 'architecture', 'empire'];

  const col1 = gameState.developments.filter((d) => col1Ids.includes(d.id));
  const col2 = gameState.developments.filter((d) => col2Ids.includes(d.id));
  const col3 = gameState.developments.filter((d) => col3Ids.includes(d.id));

  // Align with column orders
  const sortDevelopments = (devs: Development[], idOrder: string[]) => {
    return [...devs].sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
  };

  const Column1Sorted = sortDevelopments(col1, col1Ids);
  const Column2Sorted = sortDevelopments(col2, col2Ids);
  const Column3Sorted = sortDevelopments(col3, col3Ids);

  return (
    <div className="texture-parchment rounded-xl p-3 md:p-4 flex flex-col gap-3 md:gap-3.5 relative text-surface-container-lowest w-full shadow-2xl border border-outline-variant border-opacity-30">
      {/* Decorative corners */}
      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-tl-xl" />
      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-tr-xl" />
      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-bl-xl" />
      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-br-xl" />

      {/* Header section of parchment */}
      <div className="flex justify-between items-end border-b-2 border-outline-variant pb-1.5 md:pb-2 border-opacity-30 select-none">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl md:text-3xl text-on-primary-fixed leading-none tracking-tight">
              Score Sheet
            </h2>
            {gameState.playerCount && gameState.playerCount > 1 && (
              <div className="flex items-center gap-1 select-none">
                {Array.from({ length: gameState.playerCount }).map((_, i) => {
                  const isActive = i === (gameState.activePlayerIndex ?? 0);
                  return (
                    <span
                      key={i}
                      className={`material-symbols-outlined transition-all duration-300 ${
                        isActive
                          ? 'text-amber-800 font-bold opacity-100'
                          : 'text-on-tertiary-fixed/40 opacity-30 grayscale'
                      }`}
                      style={{
                        fontSize: isActive && i === 1 ? '20px' : '16px',
                        transform: isActive && i === 1 ? 'scale(1.2)' : 'none',
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
          <p className="text-[8px] font-label font-bold text-on-tertiary-fixed/60 uppercase tracking-widest mt-0.5">
            Civilization Registry of the Ancient World
          </p>
        </div>
        <div className="text-right">
          <p className="font-label text-[10px] text-on-tertiary-fixed opacity-70 uppercase tracking-wider">
            Total Score
          </p>
          <span className="font-serif text-2xl font-extrabold text-on-primary-fixed leading-none block mt-0.5">
            {gameState.score}
          </span>
        </div>
      </div>

      {/* Temporary Resource indicators for current turn */}
      {(gameState.workers > 0 || gameState.coins > 0) && (
        <div className="flex gap-2 justify-end items-center bg-surface-container-lowest/15 border border-on-tertiary-fixed/15 rounded-lg px-2 py-1 select-none -mt-2.5">
          <span className="font-label text-[9px] text-on-tertiary-fixed/70 uppercase tracking-wider font-semibold">
            Active Turn Pool:
          </span>
          {gameState.workers > 0 && (
            <span className="flex items-center gap-1 bg-amber-950/20 text-on-primary-fixed border border-amber-900/30 rounded-full px-2 py-0.5 text-xs font-bold font-mono">
              👷 {gameState.workers} Workers
            </span>
          )}
          {gameState.coins > 0 && (
            <span className="flex items-center gap-1 bg-yellow-900/25 text-on-primary-fixed border border-yellow-800/30 rounded-full px-2 py-0.5 text-xs font-bold font-mono">
              💰 {gameState.coins} Coins
            </span>
          )}
        </div>
      )}

      {/* Content Grid */}
      <div className="flex flex-col gap-3 md:gap-3.5">
        {/* Top Row: Cities, Disasters, Monuments */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3.5 items-start">
          
          {/* Cities & Disasters Track */}
          <section className="flex flex-col gap-3 md:col-span-4">
            <div>
              <h3 className="font-serif text-md md:text-lg text-on-primary-fixed mb-1.5 border-b border-outline-variant pb-1 border-opacity-30 uppercase tracking-wide select-none">
                Cities
              </h3>
              <div className="flex gap-2 justify-between max-w-xs">
                {[3, 4, 5, 6, 7].map((num) => {
                  const isActive = gameState.cities.count >= num;
                  const isBase = num === 3;
                  const isNext = num === gameState.cities.count + 1;

                  return (
                    <div key={num} className="flex flex-col items-center gap-0.5 select-none">
                      <span className="font-label text-xs font-bold text-on-tertiary-fixed">
                        {num}
                      </span>
                      <button
                        disabled={isBase && !isActive}
                        onClick={() => {
                          if (isActive && !isBase) {
                            onToggleCity && onToggleCity(num);
                          }
                        }}
                        className={`w-8 h-8 border-2 rounded-lg flex items-center justify-center relative transition-all focus:outline-none ${
                          isActive
                            ? 'border-on-tertiary-fixed border-opacity-50 bg-surface-container-lowest/10 shadow-inner'
                            : 'border-on-tertiary-fixed border-opacity-20 border-dashed bg-surface-container-lowest/5 hover:border-opacity-40 hover:bg-surface-container-lowest/10'
                        } ${isBase ? 'cursor-default' : isActive ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                        title={isBase ? 'City 3 is permanently unlocked' : isActive ? `Active City ${num} (Click to undo)` : `Locked City ${num}`}
                      >
                        {isActive ? (
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-100 to-orange-200 border border-outline/30 flex items-center justify-center shadow-sm">
                            {/* Dice face representing city */}
                            <div className="grid grid-cols-2 gap-0.5 p-0.5">
                              <span className="w-1 h-1 bg-on-primary-fixed rounded-full" />
                              <span className="w-1 h-1 bg-on-primary-fixed rounded-full" />
                              <span className="w-1 h-1 bg-on-primary-fixed rounded-full" />
                              <span className="w-1 h-1 bg-on-primary-fixed rounded-full" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[9px] text-on-tertiary-fixed/30 font-medium font-mono">
                            +{num - 1}d
                          </span>
                        )}
                      </button>

                      {/* City Progress checklist peg circles for the next city being built */}
                      {isNext && (
                        <div className="flex gap-0.5 mt-1 select-none">
                          {Array.from({ length: getCityRequiredBoxes(num) }).map((_, slotIdx) => {
                            const isChecked = gameState.cities.progress > slotIdx;
                            return (
                              <button
                                key={slotIdx}
                                onClick={() => onToggleCityProgress && onToggleCityProgress(slotIdx)}
                                className={`w-3 h-3 border rounded flex items-center justify-center transition-all focus:outline-none ${
                                  isChecked
                                    ? 'border-on-tertiary-fixed bg-surface-container-lowest/15 text-primary-container'
                                    : 'border-on-tertiary-fixed/30 bg-surface-container-lowest/5 hover:border-on-tertiary-fixed/60 hover:bg-surface-container-lowest/10'
                                } cursor-pointer active:scale-95`}
                                title={`Build checkpoint ${slotIdx + 1} of ${getCityRequiredBoxes(num)} for City ${num}`}
                              >
                                {isChecked && (
                                  <div className="w-1.5 h-1.5 rounded-sm bg-gradient-to-br from-amber-600 to-orange-700 shadow-inner" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-on-tertiary-fixed/70 italic mt-1 font-sans select-none">
                Each active city grants you 1 major die. Feeding requires{' '}
                <span className="font-semibold text-on-tertiary-fixed">
                  {gameState.cities.count} Food
                </span>{' '}
                per turn.
              </p>
            </div>

            {/* Disasters Section (charcoal cross off) */}
            <section className="bg-error-container bg-opacity-10 p-2 rounded-lg border border-error-container border-opacity-20">
              <div className="flex items-center justify-between gap-2 mb-1 select-none">
                <h3 className="font-serif text-xs md:text-sm text-red-900 flex items-center gap-1 font-bold">
                  <Skull size={13} className="text-red-800" /> Disaster Ledger
                </h3>
                {gameState.modifiers?.unlimitedDisasters && Math.floor(gameState.disasterPoints / 10) > 0 && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.floor(gameState.disasterPoints / 10) }).map((_, i) => (
                      <span key={i} className="bg-red-950 text-white text-[8px] font-sans font-bold px-1 py-0.2 rounded border border-red-900 shadow-sm" title="Accumulated -10 Disaster Points Notch">
                        -10
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5 flex-wrap select-none">
                {disasterIndexList.map((idx) => {
                  const isChecked = gameState.modifiers?.unlimitedDisasters
                    ? (gameState.disasterPoints % 10) >= idx
                    : gameState.disasterPoints >= idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[9px] font-mono font-bold transition-all select-none ${
                        isChecked
                          ? 'border-red-900 bg-red-950/20 text-red-950 shadow-inner relative scale-95'
                          : 'border-red-800/30 text-red-800/60 bg-surface-container-lowest/5'
                      }`}
                      title={isChecked ? `Disaster node ${idx} active (-1 points)` : `Disaster slot ${idx}`}
                    >
                      {isChecked ? (
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-red-900 filter saturate-150 rotate-12 text-xs">
                          ✕
                        </span>
                      ) : (
                        `-${idx}`
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[8px] text-red-950/80 mt-0.5 leading-snug font-sans select-none">
                {gameState.modifiers?.unlimitedDisasters 
                  ? `Accumulated: -${gameState.disasterPoints} total disaster points.`
                  : "Starvation or unmitigated skulls automatically mark nodes on this track."}
              </p>
            </section>
          </section>

          {/* Monuments Section */}
          <section className="md:col-span-8">
            <h3 className="font-serif text-md md:text-lg text-on-primary-fixed mb-1.5 border-b border-outline-variant pb-1 border-opacity-30 flex justify-between select-none">
              <span>Monuments</span>
              <span className="text-[10px] opacity-60 font-sans tracking-wide self-end">
                Points (1st / 2nd)
              </span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 select-none">
              {gameState.monuments.map((monument) => {
                const totalSlots = monument.slots;

                return (
                  <li
                    key={monument.id}
                    className="flex items-center justify-between group py-0.5 border-b border-outline-variant/10"
                  >
                    <div className="flex flex-col gap-0.5 min-w-[120px]">
                      <span className="font-serif text-xs font-bold text-on-primary-fixed leading-tight">
                        {monument.name}
                      </span>
                      {/* Checkbox checkpoints */}
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: totalSlots }).map((_, slotIndex) => {
                          const isSlotChecked = monument.checkedSlots > slotIndex;
                          return (
                            <button
                              key={slotIndex}
                              onClick={() =>
                                onToggleMonumentSlot && onToggleMonumentSlot(monument.id, slotIndex)
                              }
                              className={`w-3.5 h-3.5 border rounded flex items-center justify-center shadow-sm transition-all focus:outline-none ${
                                isSlotChecked
                                  ? 'border-on-tertiary-fixed bg-surface-container-lowest/15 text-primary-container'
                                  : 'border-on-tertiary-fixed/30 bg-surface-container-lowest/5 hover:border-on-tertiary-fixed/60 hover:bg-surface-container-lowest/10'
                              } cursor-pointer active:scale-95`}
                              title={`Slot ${slotIndex + 1} of ${monument.name} (${isSlotChecked ? 'completed' : 'unbuilt'})`}
                            >
                              {isSlotChecked && (
                                <div className="w-1.5 h-1.5 rounded-sm bg-gradient-to-br from-amber-600 to-orange-700 shadow-inner" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs font-label select-none shrink-0">
                      {/* First Builder Badge */}
                      <button
                        onClick={() =>
                          onToggleMonumentBonus &&
                          onToggleMonumentBonus(
                            monument.id,
                            monument.completedByPlayer && !monument.completedByAI
                              ? 'none'
                              : 'first'
                          )
                        }
                        className={`px-1.5 py-0.5 rounded font-bold transition-all shadow-sm text-[10px] focus:outline-none cursor-pointer active:scale-95 ${
                          monument.completedByPlayer && !monument.completedByAI
                            ? 'monument-box-first border border-amber-500 font-extrabold scale-105'
                            : 'bg-surface-container-lowest/5 border border-on-tertiary-fixed/20 text-on-tertiary-fixed/50 hover:bg-surface-container-lowest/10'
                        }`}
                        title="Completed First (Player)"
                      >
                        {monument.firstPoints}
                      </button>

                      {/* Other Builder Badge */}
                      <button
                        onClick={() =>
                          onToggleMonumentBonus &&
                          onToggleMonumentBonus(
                            monument.id,
                            monument.completedByPlayer && monument.completedByAI
                              ? 'none'
                              : 'other'
                          )
                        }
                        className={`px-1.5 py-0.5 rounded font-bold transition-all shadow-sm text-[10px] focus:outline-none cursor-pointer active:scale-95 ${
                          monument.completedByPlayer && monument.completedByAI
                            ? 'monument-box-other border border-amber-900 scale-105'
                            : 'bg-surface-container-lowest/5 border border-on-tertiary-fixed/20 text-on-tertiary-fixed/40 hover:bg-surface-container-lowest/10'
                        }`}
                        title="Completed Second / Opponent Race completed first"
                      >
                        {monument.otherPoints}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Bottom Section: Developments in 3 Columns */}
        <section>
          <h3 className="font-serif text-sm md:text-md text-on-primary-fixed mb-1 border-b border-outline-variant pb-0.5 border-opacity-30 uppercase tracking-wide select-none">
            Developments Registry
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-0.5">
            
            {/* Column 1 */}
            <div className="flex flex-col gap-1">
              {Column1Sorted.map((dev) => (
                <DevelopmentCard
                  key={dev.id}
                  dev={dev}
                  onTogglePurchase={onToggleDevelopmentPurchase}
                />
              ))}
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-1">
              {Column2Sorted.map((dev) => (
                <DevelopmentCard
                  key={dev.id}
                  dev={dev}
                  onTogglePurchase={onToggleDevelopmentPurchase}
                />
              ))}
            </div>

            {/* Column 3 */}
            <div className="flex flex-col gap-1">
              {Column3Sorted.map((dev) => (
                <DevelopmentCard
                  key={dev.id}
                  dev={dev}
                  onTogglePurchase={onToggleDevelopmentPurchase}
                />
              ))}
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}

interface DevelopmentCardProps {
  dev: Development;
  onTogglePurchase: (id: string) => void;
}

function DevelopmentCard({ dev, onTogglePurchase }: DevelopmentCardProps) {
  return (
    <div
      onClick={() => onTogglePurchase(dev.id)}
      className={`group flex items-center justify-between px-1.5 py-0.5 rounded-md border transition-all cursor-pointer select-none relative overflow-hidden min-h-[30px] ${
        dev.purchased
          ? 'bg-surface-container-highest/15 border-on-tertiary-fixed/30 shadow-none'
          : 'bg-surface-container-lowest/5 border-on-tertiary-fixed/15 hover:bg-surface-container-lowest/10 hover:border-on-tertiary-fixed/30 hover:shadow-xs'
      }`}
      title={dev.effect}
    >
      {/* Active purchase highlight indicator */}
      {dev.purchased && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-container to-amber-700" />
      )}

      <div className={`flex items-center gap-1 ${dev.purchased ? 'ml-1' : 'ml-0.5'}`}>
        <button
          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
            dev.purchased
              ? 'border-primary-container bg-primary-container text-on-primary'
              : 'border-on-tertiary-fixed border-opacity-40 hover:border-opacity-80'
          }`}
        >
          {dev.purchased && <Check size={8} strokeWidth={4} />}
        </button>

        <div className="flex flex-col">
          <span
            className={`font-label text-[11px] font-bold leading-tight ${
              dev.purchased
                ? 'line-through text-on-primary-fixed opacity-60 font-semibold'
                : 'text-on-primary-fixed'
            }`}
          >
            {dev.name}
          </span>
          <span className="text-[7.5px] text-on-tertiary-fixed font-sans leading-none mt-0.5 opacity-75 max-w-[100px] truncate md:max-w-none group-hover:whitespace-normal group-hover:overflow-visible">
            {dev.effect}
          </span>
        </div>
      </div>

      <div className="flex gap-0.5 items-center shrink-0 ml-1">
        {/* Cost Badge */}
        <span
          className="w-4.5 h-4.5 rounded-full bg-surface-dim bg-opacity-15 border border-surface-dim border-opacity-25 flex items-center justify-center text-[8px] font-bold text-on-primary-fixed shadow-inner"
          title={`Cost to buy: ${dev.cost} coins`}
        >
          {dev.cost}
        </span>
        {/* Victory Points Badge */}
        <span
          className="w-3.5 h-3.5 rounded bg-secondary-container bg-opacity-15 border border-secondary-container/30 flex items-center justify-center text-[9px] font-bold text-secondary-container select-none shadow-sm"
          title={`Victory points: ${dev.points}`}
        >
          {dev.points}
        </span>
      </div>
    </div>
  );
}
