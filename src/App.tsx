import { useMemo, useState } from 'react'
import './App.css'
import {
  gameReducer,
  initialGameState,
  randomRolls,
  calculateScore,
  hasDevelopment,
  GOODS_ORDER,
  GOOD_VALUES,
  type GameAction,
  type GameState,
  type GoodsType,
  type DiceFace,
} from './game'

const FACE_LABELS: Record<DiceFace, string> = {
  food3: '3 Food',
  good1: '1 Good',
  goods2skull: '2 Goods + ☠',
  workers3: '3 Workers',
  foodOrWork: '2 Food / 2 Workers',
  coins7: '7 Coins',
}

const FACE_CSS: Record<DiceFace, string> = {
  food3: 'food',
  good1: 'goods',
  goods2skull: 'skull',
  workers3: 'workers',
  foodOrWork: 'choice',
  coins7: 'coins',
}

function App() {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [selectedGoodsToSpend, setSelectedGoodsToSpend] = useState<GoodsType[]>([])
  const [buyTarget, setBuyTarget] = useState<string | null>(null)

  const dispatch = (action: GameAction) => {
    setGameState((previous) => gameReducer(previous, action))
  }

  const rollDice = () => {
    dispatch({
      type: 'ROLL_DICE',
      rolls: randomRolls(gameState.cities),
    })
  }

  const rerollDice = () => {
    const unkeptCount = gameState.diceKept.filter((k) => !k).length
    if (unkeptCount === 0) return
    dispatch({
      type: 'REROLL',
      rolls: randomRolls(unkeptCount),
    })
  }

  const leadershipReroll = (index: number) => {
    dispatch({
      type: 'LEADERSHIP_REROLL',
      index,
      roll: randomRolls(1)[0],
    })
  }

  const totalGoods = GOODS_ORDER.reduce((sum, g) => sum + gameState.goods[g], 0)

  const score = useMemo(() => calculateScore(gameState), [gameState])

  const canEndTurn = gameState.phase === 'discarding' &&
    (hasDevelopment(gameState, 'caravans') || totalGoods <= 6)

  return (
    <main className="app">
      <h1>Alea Imperii</h1>
      <p className="subtitle">Roll Through the Ages — The Bronze Age</p>

      {/* ── Status bar ─────────────────────────────────────── */}
      <section className="panel stats-grid">
        <p>Turn: {gameState.turn}/10</p>
        <p>Cities: {gameState.cities}</p>
        <p>Food: {gameState.food}</p>
        <p>Coins: {gameState.coins}</p>
        <p>Workers: {gameState.workers}</p>
        <p>Skulls: {gameState.skulls}</p>
        <p>Disasters: -{gameState.disasterPoints}</p>
        <p>Score: {score}</p>
        <p>Phase: {gameState.phase}</p>
      </section>

      {/* ── Rolling phase ──────────────────────────────────── */}
      {gameState.phase === 'rolling' && (
        <section className="panel">
          <h2>Phase 1 — Roll Dice ({gameState.cities} dice)</h2>
          <div className="button-row">
            {gameState.rollNumber === 0 && (
              <button onClick={rollDice}>Roll Dice</button>
            )}
            {gameState.rollNumber >= 1 && gameState.rollNumber < 3 && (
              <button onClick={rerollDice} disabled={gameState.diceKept.every((k) => k)}>
                Reroll Unkept (Roll {gameState.rollNumber + 1}/3)
              </button>
            )}
            {gameState.rollNumber >= 1 && (
              <button onClick={() => dispatch({ type: 'COLLECT' })}>
                Done Rolling → Collect
              </button>
            )}
          </div>

          {gameState.diceResults.length > 0 && (
            <div className="dice-results">
              {gameState.diceResults.map((face, i) => (
                <button
                  key={`die-${i}`}
                  className={`die ${FACE_CSS[face]} ${gameState.diceKept[i] ? 'selected' : ''}`}
                  onClick={() => {
                    if (hasDevelopment(gameState, 'leadership') && !gameState.usedLeadership) {
                      leadershipReroll(i)
                    } else if (gameState.diceKept[i]) {
                      dispatch({ type: 'UNKEEP_DIE', index: i })
                    } else {
                      dispatch({ type: 'KEEP_DIE', index: i })
                    }
                  }}
                  disabled={face === 'goods2skull' && !hasDevelopment(gameState, 'leadership')}
                  type="button"
                >
                  {FACE_LABELS[face]}
                  {gameState.diceKept[i] ? ' ✓' : ''}
                </button>
              ))}
            </div>
          )}

          {hasDevelopment(gameState, 'leadership') && !gameState.usedLeadership && gameState.rollNumber >= 1 && (
            <p><em>Leadership: click any die to reroll it (once per turn).</em></p>
          )}
        </section>
      )}

      {/* ── Choosing phase (food-or-workers) ───────────────── */}
      {gameState.phase === 'choosing' && (
        <section className="panel">
          <h2>Choose: Food or Workers</h2>
          {gameState.diceResults.map((face, i) => {
            if (face !== 'foodOrWork') return null
            if (gameState.foodOrWorkerChoices[i] !== null) return null
            return (
              <div key={`choice-${i}`} className="button-row" style={{ marginBottom: '0.5rem' }}>
                <span>Die {i + 1}: 2 Food or 2 Workers?</span>
                <button onClick={() => dispatch({ type: 'CHOOSE_FOOD_OR_WORKERS', dieIndex: i, choice: 'food' })}>
                  Food
                </button>
                <button onClick={() => dispatch({ type: 'CHOOSE_FOOD_OR_WORKERS', dieIndex: i, choice: 'workers' })}>
                  Workers
                </button>
              </div>
            )
          })}
        </section>
      )}

      {/* ── Feeding phase ──────────────────────────────────── */}
      {gameState.phase === 'feeding' && (
        <section className="panel">
          <h2>Phase 2 — Feed Cities & Disasters</h2>
          <p>You have {gameState.food} food and need {gameState.cities} (1 per city).</p>
          {gameState.skulls >= 2 && <p>⚠️ {gameState.skulls} skulls — disasters incoming!</p>}
          <button onClick={() => dispatch({ type: 'FEED_AND_RESOLVE_DISASTERS' })}>
            Feed & Resolve Disasters
          </button>
        </section>
      )}

      {/* ── Building phase ─────────────────────────────────── */}
      {gameState.phase === 'building' && (
        <section className="panel">
          <h2>Phase 3 — Build (Workers: {gameState.workers})</h2>

          <h3>Cities</h3>
          {gameState.citySlots.map((city) => (
            <div key={`city-${city.index}`} className="list-item">
              <span>
                City {city.index}: {city.progress}/{city.boxes}
                {city.built ? ' ✅' : ''}
              </span>
              {!city.built && gameState.workers > 0 && (
                <div className="button-row">
                  {[1, 2, 3, Math.min(gameState.workers, city.boxes - city.progress)].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((w) => (
                    <button key={w} onClick={() => dispatch({ type: 'BUILD_CITY', cityIndex: city.index, workers: w })}>
                      +{w}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <h3>Monuments</h3>
          {gameState.monuments.map((m) => (
            <div key={m.id} className="list-item">
              <span>
                {m.name}: {m.progress}/{m.boxes} ({m.firstPoints}pts)
                {m.completedByPlayer ? ' ✅' : ''}
              </span>
              {!m.completedByPlayer && gameState.workers > 0 && (
                <div className="button-row">
                  {[1, 2, 3, Math.min(gameState.workers, m.boxes - m.progress)].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((w) => (
                    <button key={w} onClick={() => dispatch({ type: 'BUILD_MONUMENT', monumentId: m.id, workers: w })}>
                      +{w}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {hasDevelopment(gameState, 'engineering') && gameState.goods.stone > 0 && (
            <p><em>Engineering: you can also spend stone (3 boxes per stone) on cities/monuments above.</em></p>
          )}

          <div className="button-row" style={{ marginTop: '1rem' }}>
            <button onClick={() => dispatch({ type: 'DONE_BUILDING' })}>
              Done Building → Buy Phase
            </button>
          </div>
        </section>
      )}

      {/* ── Buying phase ───────────────────────────────────── */}
      {gameState.phase === 'buying' && (
        <section className="panel">
          <h2>Phase 4 — Buy Development (Coins: {gameState.coins})</h2>

          {buyTarget && (
            <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f0f9ff', borderRadius: '0.5rem' }}>
              <p>Buying: <strong>{gameState.developments.find((d) => d.id === buyTarget)?.name}</strong>
                {' '}(Cost: {gameState.developments.find((d) => d.id === buyTarget)?.cost})</p>
              <p>Payment: {gameState.coins} coins
                {selectedGoodsToSpend.length > 0 && ` + ${selectedGoodsToSpend.map((g) => `${gameState.goods[g]}×${g} (${gameState.goods[g] * GOOD_VALUES[g]})`).join(' + ')}`}
                {' '}= {gameState.coins + selectedGoodsToSpend.reduce((s, g) => s + gameState.goods[g] * GOOD_VALUES[g], 0)} total
              </p>
              <div className="button-row">
                {GOODS_ORDER.filter((g) => gameState.goods[g] > 0 && !selectedGoodsToSpend.includes(g)).map((g) => (
                  <button key={g} onClick={() => setSelectedGoodsToSpend([...selectedGoodsToSpend, g])}>
                    + {g} ({gameState.goods[g]}×{GOOD_VALUES[g]})
                  </button>
                ))}
              </div>
              <div className="button-row" style={{ marginTop: '0.5rem' }}>
                <button onClick={() => {
                  dispatch({ type: 'BUY_DEVELOPMENT', developmentId: buyTarget, goodsToSpend: selectedGoodsToSpend })
                  setBuyTarget(null)
                  setSelectedGoodsToSpend([])
                }}>
                  Confirm Purchase
                </button>
                <button onClick={() => { setBuyTarget(null); setSelectedGoodsToSpend([]) }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {gameState.developments.map((d) => (
            <div key={d.id} className="list-item">
              <span>
                {d.name} — {d.cost} cost, {d.points} pts
                <br /><small>{d.description}</small>
              </span>
              {!d.owned && !gameState.boughtThisTurn && (
                <button onClick={() => { setBuyTarget(d.id); setSelectedGoodsToSpend([]) }}>
                  Buy
                </button>
              )}
              {d.owned && <span>✅ Owned</span>}
            </div>
          ))}

          <div className="button-row" style={{ marginTop: '1rem' }}>
            <button onClick={() => { dispatch({ type: 'SKIP_BUY' }); setBuyTarget(null); setSelectedGoodsToSpend([]) }}>
              Skip → Discard Phase
            </button>
          </div>
        </section>
      )}

      {/* ── Discard phase ──────────────────────────────────── */}
      {gameState.phase === 'discarding' && (
        <section className="panel">
          <h2>Phase 5 — Discard Excess Goods</h2>
          <p>Total goods: {totalGoods} / {hasDevelopment(gameState, 'caravans') ? '∞' : '6'}</p>

          {!hasDevelopment(gameState, 'caravans') && totalGoods > 6 && (
            <div>
              <p>Must discard {totalGoods - 6} goods.</p>
              <div className="button-row">
                {GOODS_ORDER.filter((g) => gameState.goods[g] > 0).map((g) => (
                  <button key={g} onClick={() => dispatch({ type: 'DISCARD_GOODS', goodType: g, amount: 1 })}>
                    Discard 1 {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => dispatch({ type: 'END_TURN' })} disabled={!canEndTurn}>
            End Turn
          </button>
        </section>
      )}

      {/* ── Goods track ────────────────────────────────────── */}
      <section className="panel">
        <h2>Goods Track</h2>
        <p>
          {GOODS_ORDER.map((g) => `${g}: ${gameState.goods[g]} (${GOOD_VALUES[g]}¢)`).join(' | ')}
          {' '}— Total value: {GOODS_ORDER.reduce((s, g) => s + gameState.goods[g] * GOOD_VALUES[g], 0)}
        </p>
      </section>

      {/* ── Status message ─────────────────────────────────── */}
      <section className="panel message">
        <strong>Status:</strong> {gameState.message}
      </section>

      {/* ── Game over ──────────────────────────────────────── */}
      {gameState.gameEnded && (
        <section className="panel game-end">
          <h2>Game Over</h2>
          <p>Final score: {score}</p>
          <p>
            Cities: {gameState.cities} |
            Monuments: {gameState.monuments.filter((m) => m.completedByPlayer).length} |
            Developments: {gameState.developments.filter((d) => d.owned).length} |
            Disasters: -{gameState.disasterPoints}
          </p>
        </section>
      )}
    </main>
  )
}

export default App
