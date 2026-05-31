import { X, Play, Zap, Info, ShieldAlert, Award } from 'lucide-react';

interface RulesSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesSection({ isOpen, onClose }: RulesSectionProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="texture-parchment text-surface-container-lowest max-w-4xl w-full max-h-[85vh] overflow-y-auto rounded-[2rem] p-6 md:p-8 border border-outline shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container-lowest/10 transition-colors"
          title="Close Rules"
        >
          <X size={24} className="text-on-primary-fixed" />
        </button>

        <div className="border-b border-outline-variant/30 pb-4 mb-6">
          <h2 className="font-serif text-3xl font-bold text-on-primary-fixed flex items-center gap-2">
            <Info className="text-primary-container" /> Rules of the Bronze Age
          </h2>
          <p className="font-label text-sm text-on-tertiary-fixed opacity-80 uppercase tracking-wider">
            Roll, build monuments, and develop a legendary empire.
          </p>
        </div>

        <div className="space-y-6 text-on-primary-fixed">
          {/* Section 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-outline-variant/20">
            <div>
              <h3 className="font-serif text-xl font-bold mb-2 flex items-center gap-2">
                <Play size={18} className="text-primary-container" /> Gameplay Flow
              </h3>
              <p className="text-sm leading-relaxed font-sans">
                Each turn consists of 4 main phases:
              </p>
              <ol className="list-decimal list-inside text-xs mt-2 space-y-1 ml-1 font-sans">
                <li><strong className="text-xs">Roll Phase:</strong> Roll dice according to your number of cities (start with 3). You can keep dice and reroll others up to 2 times. <em>Caution: Skulls cannot be rerolled!</em></li>
                <li><strong className="text-xs">Food &amp; Resources:</strong> Food dice faces add food. Goods faces add resources automatically to your tracks.</li>
                <li><strong className="text-xs">Feed Cities:</strong> You must feed each city with 1 Food. If you run out of Food, each unfed city causes <strong className="text-error-container font-mono">1 Disaster Point (-1 pt)</strong>!</li>
                <li><strong className="text-xs">Build &amp; Develop:</strong> Use your accumulated wood and coins (derived from selling goods) to build Monuments, check off City progress, or purchase epic Developments.</li>
              </ol>
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold mb-2 flex items-center gap-2">
                <Zap size={18} className="text-primary-container" /> Dice Faces &amp; Effects
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="p-2 rounded bg-surface-container-lowest/5 border border-on-tertiary-fixed/10">
                  <strong>🍴 Food:</strong> +3 Food (+4 points if you possess <strong>Agriculture</strong>).
                </div>
                <div className="p-2 rounded bg-surface-container-lowest/5 border border-on-tertiary-fixed/10">
                  <strong>🛠️ Wood:</strong> +3 Wood (+4 if you possess <strong>Architecture</strong>).
                </div>
                <div className="p-2 rounded bg-surface-container-lowest/5 border border-on-tertiary-fixed/10">
                  <strong>💰 Coin:</strong> Worth 7 coins (12 coins if you possess <strong>Coinage</strong>).
                </div>
                <div className="p-2 rounded bg-surface-container-lowest/5 border border-on-tertiary-fixed/10">
                  <strong>📦 Goods:</strong> Adds 1 progress item to your highest blank resources (staggered).
                </div>
                <div className="p-2 rounded bg-surface-container-lowest/5 border border-on-tertiary-fixed/10 font-bold text-red-900">
                  <strong>💀 Skull:</strong> Cannot be rerolled. Adds a skull to the disaster tracker!
                </div>
                <div className="p-2 rounded bg-surface-container-lowest/5 border border-on-tertiary-fixed/10">
                  <strong>⚔️ Spear:</strong> Defensive forces. Used to prevent severe disasters.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-outline-variant/20">
            <div>
              <h3 className="font-serif text-xl font-bold mb-2 flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-800" /> Disasters (Skull Tracker)
              </h3>
              <p className="text-sm leading-relaxed font-sans mb-2">
                Rolling skulls causes disasters that damage your progress:
              </p>
              <ul className="list-disc list-inside text-xs space-y-1 ml-1 font-sans">
                <li><strong>2 Skulls (Drought):</strong> Lose 2 points (unless you have <span className="underline">Irrigation</span>).</li>
                <li><strong>3 Skulls (Epidemic):</strong> Opponent receives -3 disaster points (in Solo, you lose 3 points unless you have <span className="underline">Medicine</span>).</li>
                <li><strong>4 Skulls (Invasion):</strong> Lose 4 points (unless you have defenses).</li>
                <li><strong>5 Skulls (Revolt):</strong> Disaster strikes! Lose all accumulated goods on your tracks!</li>
              </ul>
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold mb-2 flex items-center gap-2">
                <Award size={18} className="text-primary-container" /> Winning and Scoring
              </h3>
              <p className="text-sm leading-relaxed font-sans">
                The game ends when any player completes all Monuments or purchases 5 Developments!
              </p>
              <p className="text-xs leading-relaxed font-sans mt-2">
                Your score is calculated as follows:
              </p>
              <ul className="list-disc list-inside text-xs space-y-1 ml-1 font-sans text-on-tertiary-fixed">
                <li>Points from all constructed Monuments</li>
                <li>Points from all purchased Developments (e.g. up to 12 pts each)</li>
                <li>Bonus points: +1 per development under <strong>Education</strong>; +2 per city under <strong>Empire</strong></li>
                <li>Subtract all checked Disaster Points</li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="font-serif text-lg font-bold mb-2">Tactical Advice</h3>
            <p className="text-xs italic leading-relaxed font-sans opacity-95">
              "Gather wood early to construct more cities; more cities mean more dice rolled each turn. Maintain adequate food supply so your citizens don't starve. Purchase Medicine and Irrigation to shield yourself from devastating catastrophes, and race your opponent to complete monuments to secure the coveted First Builder points!"
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-surface-container-lowest hover:bg-surface-variant text-on-surface hover:text-white rounded-lg font-semibold text-sm transition-all"
          >
            I understand, let's play
          </button>
        </div>
      </div>
    </div>
  );
}
