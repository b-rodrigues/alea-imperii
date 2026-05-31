import { useMemo, useState, useEffect, useRef } from 'react'
import './App.css'
import {
  gameReducer,
  initialGameState,
  randomRolls,
  calculateScore,
  hasDevelopment,
  getNextActionHint,
  GOODS_ORDER,
  GOOD_VALUES,
  type GameAction,
  type GameState,
  type GoodsType,
  type DiceFace,
  type PlayerState,
} from './game'
import { RulesPopup } from './RulesPopup'

import musicUrl from './assets/bronze-age.mp3'

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

const GOOD_ICONS: Record<GoodsType, string> = {
  wood: '🪵',
  stone: '🪨',
  pottery: '🏺',
  cloth: '🧵',
  spearheads: '⚔️',
}

const GOOD_TITLES: Record<GoodsType, string> = {
  wood: 'Wood',
  stone: 'Stone',
  pottery: 'Pottery',
  cloth: 'Cloth',
  spearheads: 'Spearheads',
}

const GOOD_DESCRIPTIONS: Record<GoodsType, string> = {
  wood: 'Value: 1. The most basic good. Collected during Phase 1. Used to buy developments, or discarded if exceeding the 6-goods storage limit.',
  stone: 'Value: 2. A construction material. Used to buy developments. With the Engineering development, you can spend Stone to check off 3 progress boxes each.',
  pottery: 'Value: 3. A crafted utility good. Used to buy developments. Counts towards the 6-goods storage limit unless Caravans is owned.',
  cloth: 'Value: 4. A valuable textile good. Used to buy developments. Highly valuable for scoring or spending.',
  spearheads: 'Value: 5. The most valuable weapon/military good. Used to buy developments. Crucial for high-tier purchases.',
}

interface TooltipProps {
  icon: string
  title: string
  description: string
  children: React.ReactNode
  position?: 'left' | 'right' | 'center'
}

function Tooltip({ icon, title, description, children, position = 'center' }: TooltipProps) {
  const positionClass = position === 'left' ? 'tooltip-left' : position === 'right' ? 'tooltip-right' : ''
  return (
    <div className={`tooltip-container ${positionClass}`}>
      {children}
      <div className="tooltip-content">
        <div className="tooltip-header">
          <span className="tooltip-title-icon">{icon}</span>
          <strong>{title}</strong>
        </div>
        <div className="tooltip-desc">{description}</div>
      </div>
    </div>
  )
}

interface LedgerPopupProps {
  playerStates: PlayerState[]
  activePlayerIndex: number
  onClose: () => void
}

function LedgerPopup({ playerStates, activePlayerIndex, onClose }: LedgerPopupProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ledger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-header">
          <h2 className="ledger-modal-title">👁️ Civilization Ledger</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close ledger">✖</button>
        </div>
        <div className="ledger-grid">
          {playerStates.map((player, idx) => {
            const playerGameState: GameState = {
              ...initialGameState,
              cities: player.cities,
              citySlots: player.citySlots,
              food: player.food,
              goods: player.goods,
              coins: player.coins,
              workers: player.workers,
              skulls: player.skulls,
              monuments: player.monuments,
              developments: player.developments,
              disasterPoints: player.disasterPoints,
            }
            const playerScore = calculateScore(playerGameState)
            const isActive = idx === activePlayerIndex

            return (
              <div key={player.name} className={`ledger-card${isActive ? ' active-card' : ''}`}>
                <div className="ledger-card-header">
                  <h3 className="ledger-card-name">
                    {player.name} {isActive && <span className="active-badge">Active</span>}
                  </h3>
                  <span className="ledger-score">🏆 {playerScore} pts</span>
                </div>
                <div className="ledger-card-stats">
                  <div>🏙 Cities: <strong>{player.cities}</strong></div>
                  <div>🍞 Food: <strong>{player.food}</strong></div>
                  <div>☠ Disasters: <strong className="penalty-text">-{player.disasterPoints}</strong></div>
                </div>
                <div className="ledger-card-goods">
                  <h4 className="ledger-section-title">Warehouse Goods</h4>
                  <div className="ledger-goods-row">
                    {GOODS_ORDER.map((g) => (
                      <span key={g} className="ledger-good-tag">
                        {GOOD_ICONS[g]} {player.goods[g]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ledger-card-section">
                  <h4 className="ledger-section-title">Developments Owned</h4>
                  <div className="ledger-list-content">
                    {player.developments.filter((d) => d.owned).map((d) => d.name).join(', ') || <span className="muted-text">None</span>}
                  </div>
                </div>
                <div className="ledger-card-section">
                  <h4 className="ledger-section-title">Completed Monuments</h4>
                  <div className="ledger-list-content">
                    {player.monuments.filter((m) => m.completedByPlayer).map((m) => m.name).join(', ') || <span className="muted-text">None</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [selectedGoodsToSpend, setSelectedGoodsToSpend] = useState<GoodsType[]>([])
  const [buyTarget, setBuyTarget] = useState<string | null>(null)
  const [showLedger, setShowLedger] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(musicUrl)
    audio.loop = true
    audio.volume = 0.4
    audioRef.current = audio

    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isMuted) {
      audio.pause()
    } else {
      audio.play().catch((err) => {
        console.warn('Playback deferred until user interaction:', err)
      })
    }
  }, [isMuted])

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

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
  const leadershipReady = hasDevelopment(gameState, 'leadership') &&
    !gameState.usedLeadership &&
    gameState.diceKept.length > 0 &&
    gameState.diceKept.every((k) => k)

  const score = useMemo(() => calculateScore(gameState), [gameState])

  const canEndTurn = gameState.phase === 'discarding' &&
    (hasDevelopment(gameState, 'caravans') || totalGoods <= 6)

  const renderPanelPlayerIcons = (defaultIcon: string) => {
    const isMulti = gameState.playerCount && gameState.playerCount > 1
    if (!isMulti) {
      return <span className="panel-title-icon">{defaultIcon}</span>
    }

    const activeIdx = gameState.activePlayerIndex ?? 0
    return (
      <span className="player-icons-group">
        <span className={`player-header-icon ${activeIdx !== 0 ? 'icon-greyed' : 'icon-active-normal'}`} title="Player 1">
          👤
        </span>
        <span className={`player-header-icon ${activeIdx !== 1 ? 'icon-greyed' : 'icon-active-larger'}`} title="Player 2">
          👥
        </span>
        {gameState.playerCount === 3 && (
          <span className={`player-header-icon ${activeIdx !== 2 ? 'icon-greyed' : 'icon-active-larger'}`} title="Player 3">
            👑
          </span>
        )}
      </span>
    )
  }

  const [showRules, setShowRules] = useState(false)

  if (!gameState.setupCompleted) {
    return (
      <main className="setup-container">
        <div className="setup-card">
          <h1 className="setup-title">⚔️ ALEA IMPERII ⚔️</h1>
          <p className="setup-subtitle">Roll Through the Ages — The Bronze Age</p>
          <div className="mode-options">
            <button className="mode-btn btn-solitaire" onClick={() => dispatch({ type: 'START_GAME', playerCount: 1 })}>
              <span className="mode-icon">👤</span>
              <div className="mode-text">
                <span className="mode-name">1 Player</span>
                <span className="mode-desc">Solitaire Mode (10 rounds turn-limit)</span>
              </div>
            </button>
            <button className="mode-btn btn-hotseat" onClick={() => dispatch({ type: 'START_GAME', playerCount: 2 })}>
              <span className="mode-icon">👥</span>
              <div className="mode-text">
                <span className="mode-name">2 Players</span>
                <span className="mode-desc">Hotseat Multiplayer (Temple & Great Pyramid removed)</span>
              </div>
            </button>
            <button className="mode-btn btn-hotseat" onClick={() => dispatch({ type: 'START_GAME', playerCount: 3 })}>
              <span className="mode-icon">👑</span>
              <div className="mode-text">
                <span className="mode-name">3 Players</span>
                <span className="mode-desc">Hotseat Multiplayer (Hanging Gardens removed)</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="app">
      <div className="floating-controls">
        <button
          className="rules-button"
          onClick={() => setShowRules(true)}
          title="Rules"
          type="button"
          aria-label="Show rules"
        >
          📖
        </button>

        {gameState.playerCount && gameState.playerCount > 1 && (
          <button
            className="ledger-button"
            onClick={() => setShowLedger(true)}
            title="Inspect Other Empires"
            type="button"
            aria-label="Inspect other empires"
          >
            👁️
          </button>
        )}

        <button
          className={`sound-button${isMuted ? ' muted' : ' playing'}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute Background Music' : 'Mute Background Music'}
          type="button"
          aria-label={isMuted ? 'Unmute music' : 'Mute music'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {showRules && <RulesPopup onClose={() => setShowRules(false)} />}
      {showLedger && (
        <LedgerPopup
          playerStates={gameState.playerStates || []}
          activePlayerIndex={gameState.activePlayerIndex ?? 0}
          onClose={() => setShowLedger(false)}
        />
      )}

      {/* ── Roguelike status log (always visible at top) ────── */}
      <section className="status-log">
        <div className="panel-header dark-header">
          {renderPanelPlayerIcons('📜')}
          <h2 className="panel-title dark-title">
            {gameState.playerCount && gameState.playerCount > 1
              ? `${(gameState.playerStates?.[gameState.activePlayerIndex ?? 0])?.name || 'Active Player'}'s Console`
              : 'Console & Advisor'}
          </h2>
        </div>
        <div className="status-hint">{getNextActionHint(gameState)}</div>
        <div className="status-messages">
          {gameState.messageLog.map((msg, i) => (
            <div key={`log-${i}`} className={`log-entry${i === 0 ? ' latest' : ''}`}>{msg}</div>
          ))}
        </div>
      </section>

      {/* ── Resource bar ───────────────────────────────────── */}
      <section className="panel stats-panel">
        <div className="panel-header">
          {renderPanelPlayerIcons('📊')}
          <h2 className="panel-title">
            {gameState.playerCount && gameState.playerCount > 1
              ? `${(gameState.playerStates?.[gameState.activePlayerIndex ?? 0])?.name || 'Active Player'}'s Stats`
              : 'Civilization Stats'}
          </h2>
        </div>
        <div className="stats-grid">
          <Tooltip
            icon="⌛"
            title="Turn / Round Tracker"
            description={gameState.playerCount && gameState.playerCount > 1
              ? "Multiplayer has no round limit! The game ends in the round where any player buys their 5th development OR all active monuments are completed."
              : "Solitaire games last exactly 10 turns. Manage your growth efficiently to maximize points by turn 10!"
            }
            position="left"
          >
            <span className="stat-item">
              ⌛ {gameState.playerCount && gameState.playerCount > 1 ? `Round: ${gameState.turn}` : `Turn: ${gameState.turn}/10`}
            </span>
          </Tooltip>
          <Tooltip icon="🏙" title="Cities Owned" description="Your population centers. Each city lets you roll 1 die during the Roll Phase (minimum 3, maximum 7). Each city also consumes 1 Food at the end of the turn!">
            <span className="stat-item">🏙 Cities: {gameState.cities}</span>
          </Tooltip>
          <Tooltip icon="🍞" title="Food Supply" description="Required to feed your cities. You must spend 1 Food per city owned during Phase 2. If you don't have enough, you suffer Famine (-1 point per unfed city)!">
            <span className="stat-item">🍞 Food: {gameState.food}</span>
          </Tooltip>
          <Tooltip icon="💰" title="Coins (Ephemeral)" description="Currency earned from dice rolls. Used to buy developments in Phase 4. Coins do not carry over to the next turn, so use them or lose them!">
            <span className="stat-item">💰 Coins: {gameState.coins}</span>
          </Tooltip>
          <Tooltip icon="⚒" title="Workers (Ephemeral)" description="Labor used in Phase 3 to build cities and monuments. Any workers not spent by the end of the building phase are lost!">
            <span className="stat-item">⚒ Workers: {gameState.workers}</span>
          </Tooltip>
          <Tooltip icon="☠" title="Skulls (Hazards)" description="Locked during the rolling phase. Having 2 or more skulls triggers disasters in Phase 2 unless protected by developments (like Irrigation or Medicine)!">
            <span className="stat-item">☠ Skulls: {gameState.skulls}</span>
          </Tooltip>
          <Tooltip icon="📉" title="Disaster Points" description="Cumulative penalties from famines or unresolved disasters (e.g., Droughts, Pestilences). They are subtracted from your final score at the end of the game." position="right">
            <span className="stat-item disaster">📉 Disasters: -{gameState.disasterPoints}</span>
          </Tooltip>
          <Tooltip icon="⭐" title="Current Score" description="Your running victory points. Calculated from completed monuments, purchased developments, bonuses from Architecture/Empire, minus disaster points." position="right">
            <span className="stat-item score">⭐ Score: {score}</span>
          </Tooltip>
        </div>
      </section>

      {/* ── Goods track (compact) ─────────────────────────── */}
      <section className="panel goods-panel">
        <div className="panel-header">
          <span className="panel-title-icon">📦</span>
          <h2 className="panel-title">Goods Warehouse (Max 6)</h2>
        </div>
        <div className="goods-bar">
          {GOODS_ORDER.map((g) => (
            <Tooltip key={g} icon={GOOD_ICONS[g]} title={GOOD_TITLES[g]} description={GOOD_DESCRIPTIONS[g]}>
              <span className="good-chip">
                {GOOD_ICONS[g]} {g}: {gameState.goods[g]}
              </span>
            </Tooltip>
          ))}
          <Tooltip icon="💰" title="Total Goods Value" description="The combined purchasing power of all your current goods stacks. When buying a development, spending a good type consumes the entire stack (no change given)!" position="right">
            <span className="good-chip total">
              💰 Value: {GOODS_ORDER.reduce((s, g) => s + gameState.goods[g] * GOOD_VALUES[g], 0)}
            </span>
          </Tooltip>
        </div>
      </section>

      {/* ── Main game area (scrollable if content overflows) ── */}
      <div className="game-area">

      {/* ── Rolling phase ──────────────────────────────────── */}
      {gameState.phase === 'rolling' && (
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title-icon">🎲</span>
            <h2 className="panel-title">Phase 1 — Roll Dice ({gameState.cities} dice)</h2>
          </div>
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
                    if (leadershipReady) {
                      leadershipReroll(i)
                    } else if (gameState.diceKept[i]) {
                      dispatch({ type: 'UNKEEP_DIE', index: i })
                    } else {
                      dispatch({ type: 'KEEP_DIE', index: i })
                    }
                  }}
                  type="button"
                >
                  {FACE_LABELS[face]}
                  {gameState.diceKept[i] ? ' ✓' : ''}
                </button>
              ))}
            </div>
          )}

          {leadershipReady && (
            <p><em>Leadership: click any die to reroll it (once per turn).</em></p>
          )}
        </section>
      )}

      {/* ── Choosing phase (food-or-workers) ───────────────── */}
      {gameState.phase === 'choosing' && (
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title-icon">⚖️</span>
            <h2 className="panel-title">Choose: Food or Workers</h2>
          </div>
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
          <div className="panel-header">
            <span className="panel-title-icon">🌾</span>
            <h2 className="panel-title">Phase 2 — Feed Cities & Disasters</h2>
          </div>
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
          <div className="panel-header">
            <span className="panel-title-icon">🏛️</span>
            <h2 className="panel-title">Phase 3 — Build (Workers: {gameState.workers})</h2>
          </div>

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
          <div className="panel-header">
            <span className="panel-title-icon">🔬</span>
            <h2 className="panel-title">Phase 4 — Buy Development (Coins: {gameState.coins})</h2>
          </div>

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
          <div className="panel-header">
            <span className="panel-title-icon">🧹</span>
            <h2 className="panel-title">Phase 5 — Discard Excess Goods</h2>
          </div>
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

      {/* ── Game over ──────────────────────────────────────── */}
      {gameState.gameEnded && (
        <section className="panel game-end">
          <div className="panel-header">
            <span className="panel-title-icon">👑</span>
            <h2 className="panel-title" style={{ color: '#ffffff' }}>Game Over</h2>
          </div>
          <p>Final score: {score}</p>
          <p>
            Cities: {gameState.cities} |
            Monuments: {gameState.monuments.filter((m) => m.completedByPlayer).length} |
            Developments: {gameState.developments.filter((d) => d.owned).length} |
            Disasters: -{gameState.disasterPoints}
          </p>
        </section>
      )}
      </div>
    </main>
  )
}

export default App
