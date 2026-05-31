interface RulesPopupProps {
  onClose: () => void
}

export function RulesPopup({ onClose }: RulesPopupProps) {
  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rules-close" onClick={onClose} type="button" aria-label="Close rules">
          ✕
        </button>
        <h2>Rules — Roll Through the Ages</h2>

        <h3>Overview</h3>
        <p>
          Manage your civilization over 10 turns. Roll dice to collect resources, build cities and
          monuments, and buy developments. Score points from monuments, developments, and cities
          while avoiding disasters.
        </p>

        <h3>Turn Phases</h3>
        <ol>
          <li>
            <strong>Roll Dice</strong> — Roll once, then optionally reroll up to 2 more times. Skulls
            (☠) are locked and cannot be rerolled. Collect food, goods, workers, and coins.
          </li>
          <li>
            <strong>Feed Cities &amp; Disasters</strong> — Spend 1 food per city. Unfed cities cost
            −1 point each. 2+ skulls trigger disasters (drought, pestilence, invasion, revolt).
          </li>
          <li>
            <strong>Build</strong> — Spend workers to fill boxes on cities or monuments. Completed
            cities grant +1 die next turn. First to complete a monument earns bonus points.
          </li>
          <li>
            <strong>Buy Development</strong> — Purchase up to 1 development per turn using coins and
            goods. Developments provide ongoing abilities and end-game points.
          </li>
          <li>
            <strong>Discard</strong> — You may hold at most 6 total goods (unless you own Caravans).
            Discard excess goods of your choice.
          </li>
        </ol>

        <h3>Dice Faces</h3>
        <ul>
          <li><strong>3 Food</strong> — +3 food</li>
          <li><strong>1 Good</strong> — +1 good (added lowest to highest)</li>
          <li><strong>2 Goods + ☠</strong> — +2 goods, +1 skull (locked)</li>
          <li><strong>3 Workers</strong> — +3 workers for building</li>
          <li><strong>2 Food / 2 Workers</strong> — choose one</li>
          <li><strong>7 Coins</strong> — +7 coins (spent this turn only)</li>
        </ul>

        <h3>Goods (value for purchasing)</h3>
        <p>Wood (1) → Stone (2) → Pottery (3) → Cloth (4) → Spearheads (5)</p>

        <h3>Disasters</h3>
        <ul>
          <li>2 skulls: Drought (−2 pts)</li>
          <li>3 skulls: Pestilence (−3 pts)</li>
          <li>4 skulls: Invasion (−4 pts)</li>
          <li>5+ skulls: Revolt (lose all goods)</li>
        </ul>

        <h3>Scoring</h3>
        <p>
          Development points + Monument points + Bonuses (Architecture, Empire) − Disaster points
          = Final Score. Highest score wins!
        </p>
      </div>
    </div>
  )
}
