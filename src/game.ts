// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type GoodsType = 'wood' | 'stone' | 'pottery' | 'cloth' | 'spearheads'

/**
 * Dice faces per the rulebook:
 *  - food3        → +3 food
 *  - good1        → +1 good
 *  - goods2skull  → +2 goods, +1 skull (locked after roll)
 *  - workers3     → +3 workers
 *  - foodOrWork   → +2 food OR +2 workers (player chooses)
 *  - coins7       → +7 coins (12 with Coinage dev)
 */
export type DiceFace = 'food3' | 'good1' | 'goods2skull' | 'workers3' | 'foodOrWork' | 'coins7'

export type TurnPhase =
  | 'rolling'       // Phase 1a – rolling dice (up to 3 rolls)
  | 'choosing'      // Phase 1b – choose food-or-workers for each foodOrWork die
  | 'collecting'    // Phase 1c – dice resolved, resources collected
  | 'feeding'       // Phase 2  – feed cities + disasters
  | 'building'      // Phase 3  – assign workers to cities/monuments
  | 'buying'        // Phase 4  – buy at most 1 development
  | 'discarding'    // Phase 5  – discard excess goods

export interface Monument {
  id: string
  name: string
  boxes: number
  progress: number
  firstPoints: number
  laterPoints: number
  completedByPlayer: boolean
  firstClaimed: boolean       // true when this monument was first completed by another player
}

export interface CitySlot {
  index: number               // 4–7
  boxes: number               // boxes to build
  progress: number            // boxes checked
  built: boolean
}

export interface Development {
  id: string
  name: string
  cost: number
  points: number
  description: string
  owned: boolean
}

export interface GameState {
  cities: number              // how many cities player has (3–7), also = dice count
  citySlots: CitySlot[]       // cities 4–7 build progress
  food: number                // max 15 (pegboard limit)
  goods: Record<GoodsType, number>
  coins: number               // ephemeral, reset each turn
  workers: number             // ephemeral, used in build phase
  skulls: number              // accumulated during rolling phase
  monuments: Monument[]
  developments: Development[]
  disasterPoints: number      // accumulated penalty across game
  turn: number
  rollNumber: number          // 1, 2, or 3 within a turn
  diceResults: DiceFace[]
  diceKept: boolean[]         // true = locked/kept, same length as diceResults
  foodOrWorkerChoices: ('food' | 'workers' | null)[]  // one per die, non-null only for foodOrWork
  phase: TurnPhase
  message: string
  gameEnded: boolean
  boughtThisTurn: boolean     // limit 1 dev per turn
  usedLeadership: boolean     // track if Leadership reroll used this turn
}

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────

export const DIE_FACES: DiceFace[] = ['food3', 'good1', 'goods2skull', 'workers3', 'foodOrWork', 'coins7']

export const GOODS_ORDER: GoodsType[] = ['wood', 'stone', 'pottery', 'cloth', 'spearheads']

export const GOOD_VALUES: Record<GoodsType, number> = {
  wood: 1,
  stone: 2,
  pottery: 3,
  cloth: 4,
  spearheads: 5,
}

const MAX_FOOD = 15
const MAX_GOODS_TOTAL = 6  // unless Caravans
const MAX_GOOD_PER_TIER = 6

// ────────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────────

export const hasDevelopment = (state: GameState, id: string): boolean =>
  state.developments.some((d) => d.id === id && d.owned)

const totalGoods = (goods: Record<GoodsType, number>): number =>
  GOODS_ORDER.reduce((sum, g) => sum + goods[g], 0)

export const goodsValue = (goods: Record<GoodsType, number>): number =>
  GOODS_ORDER.reduce((sum, g) => sum + goods[g] * GOOD_VALUES[g], 0)

const addGoods = (goods: Record<GoodsType, number>, amount: number): Record<GoodsType, number> => {
  const next = { ...goods }
  let remaining = amount
  // Fill bottom-to-top (Wood→Spearheads), wrapping if needed
  let safety = 0
  while (remaining > 0 && safety < amount + GOODS_ORDER.length) {
    for (const tier of GOODS_ORDER) {
      if (remaining <= 0) break
      if (next[tier] < MAX_GOOD_PER_TIER) {
        next[tier] += 1
        remaining -= 1
      }
    }
    safety += 1
    // If all tiers at max, break to avoid infinite loop
    if (GOODS_ORDER.every((t) => next[t] >= MAX_GOOD_PER_TIER)) break
  }
  return next
}

const clearAllGoods = (): Record<GoodsType, number> => ({
  wood: 0,
  stone: 0,
  pottery: 0,
  cloth: 0,
  spearheads: 0,
})

// ────────────────────────────────────────────────────────────────
// Scoring (rules §9)
// ────────────────────────────────────────────────────────────────

export const calculateScore = (state: GameState): number => {
  // Development points
  const devPoints = state.developments.reduce(
    (total, d) => total + (d.owned ? d.points : 0), 0,
  )

  // Monument points: firstClaimed=true means someone else already completed it (later/small points)
  const monPoints = state.monuments.reduce((total, m) => {
    if (!m.completedByPlayer) return total
    return total + (m.firstClaimed ? m.laterPoints : m.firstPoints)
  }, 0)

  // Architecture bonus: +1 per completed monument
  const architectureBonus = hasDevelopment(state, 'architecture')
    ? state.monuments.filter((m) => m.completedByPlayer).length
    : 0

  // Empire bonus: +1 per city owned (including starting 3)
  const empireBonus = hasDevelopment(state, 'empire')
    ? state.cities
    : 0

  return devPoints + monPoints + architectureBonus + empireBonus - state.disasterPoints
}

// ────────────────────────────────────────────────────────────────
// Game end condition
// ────────────────────────────────────────────────────────────────

const checkGameEnd = (state: GameState): boolean => {
  const ownedDevs = state.developments.filter((d) => d.owned).length
  if (ownedDevs >= 5) return true

  // All active monuments completed at least once
  const allCompleted = state.monuments.every((m) => m.completedByPlayer || m.firstClaimed)
  if (allCompleted) return true

  // Solitaire: 10 rounds
  if (state.turn > 10) return true

  return false
}

// ────────────────────────────────────────────────────────────────
// Initial state
// ────────────────────────────────────────────────────────────────

const defaultMonuments: Monument[] = [
  { id: 'step-pyramid', name: 'Step Pyramid', boxes: 3, progress: 0, firstPoints: 1, laterPoints: 0, completedByPlayer: false, firstClaimed: false },
  { id: 'stone-circle', name: 'Stone Circle', boxes: 5, progress: 0, firstPoints: 2, laterPoints: 1, completedByPlayer: false, firstClaimed: false },
  { id: 'temple', name: 'Temple', boxes: 7, progress: 0, firstPoints: 4, laterPoints: 2, completedByPlayer: false, firstClaimed: false },
  { id: 'hanging-gardens', name: 'Hanging Gardens', boxes: 11, progress: 0, firstPoints: 8, laterPoints: 4, completedByPlayer: false, firstClaimed: false },
  { id: 'great-pyramid', name: 'Great Pyramid', boxes: 15, progress: 0, firstPoints: 12, laterPoints: 6, completedByPlayer: false, firstClaimed: false },
  { id: 'great-wall', name: 'Great Wall', boxes: 13, progress: 0, firstPoints: 10, laterPoints: 5, completedByPlayer: false, firstClaimed: false },
  { id: 'obelisk', name: 'Obelisk', boxes: 9, progress: 0, firstPoints: 6, laterPoints: 3, completedByPlayer: false, firstClaimed: false },
]

const defaultDevelopments: Development[] = [
  { id: 'leadership', name: 'Leadership', cost: 10, points: 2, description: 'After last roll: re-roll 1 die of choice (incl. skulls). Must keep new result.', owned: false },
  { id: 'irrigation', name: 'Irrigation', cost: 10, points: 2, description: 'Immune to Drought.', owned: false },
  { id: 'agriculture', name: 'Agriculture', cost: 15, points: 3, description: '+1 food per food-face die.', owned: false },
  { id: 'quarrying', name: 'Quarrying', cost: 15, points: 3, description: '+1 stone whenever stone is produced.', owned: false },
  { id: 'medicine', name: 'Medicine', cost: 15, points: 3, description: 'Immune to Pestilence caused by opponents.', owned: false },
  { id: 'coinage', name: 'Coinage', cost: 20, points: 4, description: 'Coin die face yields 12 coins instead of 7.', owned: false },
  { id: 'caravans', name: 'Caravans', cost: 20, points: 4, description: 'No need to discard goods at end of turn.', owned: false },
  { id: 'religion', name: 'Religion', cost: 20, points: 6, description: 'On Revolt: you keep your goods.', owned: false },
  { id: 'granaries', name: 'Granaries', cost: 30, points: 6, description: 'During Buy phase: sell food at 4 coins each toward development purchase.', owned: false },
  { id: 'masonry', name: 'Masonry', cost: 30, points: 6, description: '+1 worker per worker-face die.', owned: false },
  { id: 'engineering', name: 'Engineering', cost: 40, points: 6, description: 'During Build phase: spend stone for 3 boxes each.', owned: false },
  { id: 'architecture', name: 'Architecture', cost: 50, points: 8, description: 'End game bonus: +1 point per completed monument.', owned: false },
  { id: 'empire', name: 'Empire', cost: 60, points: 8, description: 'End game bonus: +1 point per city owned.', owned: false },
]

const defaultCitySlots: CitySlot[] = [
  { index: 4, boxes: 2, progress: 0, built: false },
  { index: 5, boxes: 3, progress: 0, built: false },
  { index: 6, boxes: 4, progress: 0, built: false },
  { index: 7, boxes: 5, progress: 0, built: false },
]

export const initialGameState: GameState = {
  cities: 3,
  citySlots: defaultCitySlots.map((s) => ({ ...s })),
  food: 3,
  goods: clearAllGoods(),
  coins: 0,
  workers: 0,
  skulls: 0,
  monuments: defaultMonuments.map((m) => ({ ...m })),
  developments: defaultDevelopments.map((d) => ({ ...d })),
  disasterPoints: 0,
  turn: 1,
  rollNumber: 0,
  diceResults: [],
  diceKept: [],
  foodOrWorkerChoices: [],
  phase: 'rolling',
  message: 'Welcome to Alea Imperii! Roll your dice.',
  gameEnded: false,
  boughtThisTurn: false,
  usedLeadership: false,
}

// ────────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'ROLL_DICE'; rolls: DiceFace[] }
  | { type: 'KEEP_DIE'; index: number }
  | { type: 'UNKEEP_DIE'; index: number }
  | { type: 'REROLL'; rolls: DiceFace[] }
  | { type: 'LEADERSHIP_REROLL'; index: number; roll: DiceFace }
  | { type: 'CHOOSE_FOOD_OR_WORKERS'; dieIndex: number; choice: 'food' | 'workers' }
  | { type: 'COLLECT' }
  | { type: 'FEED_AND_RESOLVE_DISASTERS' }
  | { type: 'BUILD_MONUMENT'; monumentId: string; workers: number }
  | { type: 'BUILD_CITY'; cityIndex: number; workers: number }
  | { type: 'USE_ENGINEERING'; stoneAmount: number; targetType: 'monument' | 'city'; targetId: string | number }
  | { type: 'DONE_BUILDING' }
  | { type: 'BUY_DEVELOPMENT'; developmentId: string; goodsToSpend: GoodsType[] }
  | { type: 'SKIP_BUY' }
  | { type: 'DISCARD_GOODS'; goodType: GoodsType; amount: number }
  | { type: 'END_TURN' }

// ────────────────────────────────────────────────────────────────
// Random dice helper
// ────────────────────────────────────────────────────────────────

export const randomRolls = (
  diceCount: number,
  random: () => number = Math.random,
): DiceFace[] =>
  Array.from({ length: diceCount }, () => {
    const index = Math.floor(random() * DIE_FACES.length)
    return DIE_FACES[index]
  })

// ────────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────────

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  if (state.gameEnded) return state

  switch (action.type) {
    // ── Phase 1a: Initial roll ──────────────────────────────────
    case 'ROLL_DICE': {
      if (state.phase !== 'rolling' || state.rollNumber !== 0) return state

      // Count skulls from this roll
      const newSkulls = action.rolls.filter((f) => f === 'goods2skull').length
      const kept = action.rolls.map(() => false)

      return {
        ...state,
        diceResults: action.rolls,
        diceKept: kept,
        rollNumber: 1,
        skulls: newSkulls,
        message: `Roll 1: ${action.rolls.join(', ')}. Select dice to keep, then reroll or collect.`,
      }
    }

    // ── Keep/unkeep individual dice ─────────────────────────────
    case 'KEEP_DIE': {
      if (state.phase !== 'rolling' || state.rollNumber < 1 || state.rollNumber >= 3) return state
      const kept = [...state.diceKept]
      kept[action.index] = true
      return { ...state, diceKept: kept }
    }
    case 'UNKEEP_DIE': {
      if (state.phase !== 'rolling' || state.rollNumber < 1 || state.rollNumber >= 3) return state
      const kept2 = [...state.diceKept]
      kept2[action.index] = false
      return { ...state, diceKept: kept2 }
    }

    // ── Phase 1a: Reroll (rolls 2 and 3) ────────────────────────
    case 'REROLL': {
      if (state.phase !== 'rolling' || state.rollNumber >= 3 || state.rollNumber < 1) return state

      const unkeptIndices = state.diceKept
        .map((k, i) => (k ? -1 : i))
        .filter((i) => i >= 0)

      if (unkeptIndices.length === 0 || action.rolls.length !== unkeptIndices.length) return state

      const nextDice = [...state.diceResults]
      unkeptIndices.forEach((dieIdx, rollIdx) => {
        nextDice[dieIdx] = action.rolls[rollIdx]
      })

      const nextKept = [...state.diceKept]

      const nextRoll = state.rollNumber + 1
      // After roll 3, all dice are kept
      if (nextRoll >= 3) {
        nextKept.fill(true)
      }

      return {
        ...state,
        diceResults: nextDice,
        diceKept: nextKept,
        rollNumber: nextRoll,
        skulls: nextDice.filter((face) => face === 'goods2skull').length,
        message: `Roll ${nextRoll}: ${nextDice.join(', ')}.${nextRoll >= 3 ? ' Final roll — must keep all results.' : ''}`,
      }
    }

    // ── Leadership reroll (after final roll) ────────────────────
    case 'LEADERSHIP_REROLL': {
      if (state.phase !== 'rolling' || state.rollNumber < 1 || !state.diceKept.every(Boolean)) return state
      if (!hasDevelopment(state, 'leadership') || state.usedLeadership) return state

      const nextDice = [...state.diceResults]
      const oldFace = nextDice[action.index]
      nextDice[action.index] = action.roll

      // Adjust skull count
      let skullDelta = 0
      if (oldFace === 'goods2skull' && action.roll !== 'goods2skull') skullDelta -= 1
      if (oldFace !== 'goods2skull' && action.roll === 'goods2skull') skullDelta += 1

      const nextKept = [...state.diceKept]
      nextKept[action.index] = true

      return {
        ...state,
        diceResults: nextDice,
        diceKept: nextKept,
        skulls: state.skulls + skullDelta,
        usedLeadership: true,
        message: `Leadership: rerolled die ${action.index + 1} → ${action.roll}.`,
      }
    }

    // ── Move to choosing phase (food-or-workers) ────────────────
    case 'COLLECT': {
      if (state.phase !== 'rolling' || state.rollNumber < 1) return state

      const hasFoodOrWork = state.diceResults.some((f) => f === 'foodOrWork')
      if (hasFoodOrWork) {
        const choices: ('food' | 'workers' | null)[] = state.diceResults.map((f) =>
          f === 'foodOrWork' ? null : null,
        )
        return {
          ...state,
          phase: 'choosing',
          foodOrWorkerChoices: choices,
          message: 'Choose food or workers for each food-or-workers die.',
        }
      }

      // No choices needed — go straight to collecting
      return resolveCollection({
        ...state,
        phase: 'collecting',
        foodOrWorkerChoices: state.diceResults.map(() => null),
      })
    }

    // ── Choose food or workers for a die ────────────────────────
    case 'CHOOSE_FOOD_OR_WORKERS': {
      if (state.phase !== 'choosing') return state
      if (state.diceResults[action.dieIndex] !== 'foodOrWork') return state

      const choices = [...state.foodOrWorkerChoices]
      choices[action.dieIndex] = action.choice

      const newState = { ...state, foodOrWorkerChoices: choices }

      // Check if all foodOrWork dice have been assigned
      const allChosen = state.diceResults.every(
        (f, i) => f !== 'foodOrWork' || choices[i] !== null,
      )

      if (allChosen) {
        return resolveCollection({ ...newState, phase: 'collecting' })
      }

      return { ...newState, message: 'Choose food or workers for remaining dice.' }
    }

    // ── Phase 2: Feed and disasters ─────────────────────────────
    case 'FEED_AND_RESOLVE_DISASTERS': {
      if (state.phase !== 'feeding') return state
      return feedAndDisaster(state)
    }

    // ── Phase 3: Build monument ─────────────────────────────────
    case 'BUILD_MONUMENT': {
      if (state.phase !== 'building' || state.workers <= 0) return state

      const target = state.monuments.find((m) => m.id === action.monumentId && !m.completedByPlayer)
      if (!target) return state

      const workersToUse = Math.min(action.workers, state.workers, target.boxes - target.progress)
      if (workersToUse <= 0) return state

      const monuments = state.monuments.map((m) => {
        if (m.id !== action.monumentId || m.completedByPlayer) return m
        const remaining = m.boxes - m.progress
        const added = Math.min(workersToUse, remaining)
        const newProgress = m.progress + added
        const completed = newProgress >= m.boxes
        return {
          ...m,
          progress: newProgress,
          completedByPlayer: completed,
          // In solitaire, player is always first — firstClaimed stays as-is (false from init)
        }
      })

      return {
        ...state,
        workers: state.workers - workersToUse,
        monuments,
        message: `Assigned ${workersToUse} workers to monument.`,
      }
    }

    // ── Phase 3: Build city ─────────────────────────────────────
    case 'BUILD_CITY': {
      if (state.phase !== 'building' || state.workers <= 0) return state

      const target = state.citySlots.find((c) => c.index === action.cityIndex && !c.built)
      if (!target) return state

      const workersToUse = Math.min(action.workers, state.workers, target.boxes - target.progress)
      if (workersToUse <= 0) return state

      let newCity = false
      const citySlots = state.citySlots.map((c) => {
        if (c.index !== action.cityIndex || c.built) return c
        const remaining = c.boxes - c.progress
        const added = Math.min(workersToUse, remaining)
        const newProgress = c.progress + added
        const built = newProgress >= c.boxes
        if (built) newCity = true
        return { ...c, progress: newProgress, built }
      })

      return {
        ...state,
        workers: state.workers - workersToUse,
        citySlots,
        cities: newCity ? state.cities + 1 : state.cities,
        message: newCity ? 'City built! You gain +1 die next turn.' : `Assigned ${workersToUse} workers to city.`,
      }
    }

    // ── Phase 3: Engineering (spend stone for boxes) ────────────
    case 'USE_ENGINEERING': {
      if (state.phase !== 'building' || !hasDevelopment(state, 'engineering')) return state
      if (state.goods.stone < action.stoneAmount || action.stoneAmount <= 0) return state

      const bonusBoxes = action.stoneAmount * 3

      if (action.targetType === 'monument') {
        const target = state.monuments.find((m) => m.id === action.targetId && !m.completedByPlayer)
        if (!target || target.progress >= target.boxes) return state

        const monuments = state.monuments.map((m) => {
          if (m.id !== action.targetId || m.completedByPlayer) return m
          const remaining = m.boxes - m.progress
          const added = Math.min(bonusBoxes, remaining)
          const newProgress = m.progress + added
          return {
            ...m,
            progress: newProgress,
            completedByPlayer: newProgress >= m.boxes,
          }
        })
        return {
          ...state,
          goods: { ...state.goods, stone: state.goods.stone - action.stoneAmount },
          monuments,
          message: `Engineering: spent ${action.stoneAmount} stone for ${bonusBoxes} boxes on monument.`,
        }
      } else {
        const target = state.citySlots.find((c) => c.index === action.targetId && !c.built)
        if (!target || target.progress >= target.boxes) return state

        let newCity = false
        const citySlots = state.citySlots.map((c) => {
          if (c.index !== action.targetId || c.built) return c
          const remaining = c.boxes - c.progress
          const added = Math.min(bonusBoxes, remaining)
          const newProgress = c.progress + added
          const built = newProgress >= c.boxes
          if (built) newCity = true
          return { ...c, progress: newProgress, built }
        })
        return {
          ...state,
          goods: { ...state.goods, stone: state.goods.stone - action.stoneAmount },
          citySlots,
          cities: newCity ? state.cities + 1 : state.cities,
          message: `Engineering: spent ${action.stoneAmount} stone for ${bonusBoxes} boxes on city.`,
        }
      }
    }

    // ── Phase 3 → Phase 4 ───────────────────────────────────────
    case 'DONE_BUILDING': {
      if (state.phase !== 'building') return state
      return {
        ...state,
        phase: 'buying',
        message: 'Buy phase: purchase up to 1 development using coins and goods.',
      }
    }

    // ── Phase 4: Buy development ────────────────────────────────
    case 'BUY_DEVELOPMENT': {
      if (state.phase !== 'buying' || state.boughtThisTurn) return state

      const dev = state.developments.find((d) => d.id === action.developmentId)
      if (!dev || dev.owned) return state

      // Calculate payment: coins + goods value
      // Must spend ALL of each chosen good type
      let payment = state.coins
      const nextGoods = { ...state.goods }

      // Granaries: sell food at 4 coins each
      let foodSold = 0
      if (hasDevelopment(state, 'granaries')) {
        // Auto-sell food as needed
        const deficit = dev.cost - payment - action.goodsToSpend.reduce(
          (sum, g) => sum + nextGoods[g] * GOOD_VALUES[g], 0,
        )
        if (deficit > 0) {
          foodSold = Math.min(state.food, Math.ceil(deficit / 4))
          payment += foodSold * 4
        }
      }

      for (const goodType of action.goodsToSpend) {
        payment += nextGoods[goodType] * GOOD_VALUES[goodType]
        nextGoods[goodType] = 0 // must spend ALL of that type
      }

      if (payment < dev.cost) {
        return { ...state, message: `Not enough to buy ${dev.name}. Need ${dev.cost}, have ${payment}.` }
      }

      const developments = state.developments.map((d) =>
        d.id === action.developmentId ? { ...d, owned: true } : d,
      )

      const newState: GameState = {
        ...state,
        coins: 0, // coins are ephemeral, all used
        goods: nextGoods,
        food: state.food - foodSold,
        developments,
        boughtThisTurn: true,
        message: `Purchased ${dev.name}.`,
      }

      // Check game end
      if (checkGameEnd(newState)) {
        return {
          ...newState,
          phase: 'discarding',
          gameEnded: true,
          message: `Purchased ${dev.name}. Game Over!`,
        }
      }

      return { ...newState, phase: 'discarding' }
    }

    // ── Phase 4: Skip buy ───────────────────────────────────────
    case 'SKIP_BUY': {
      if (state.phase !== 'buying') return state
      return { ...state, phase: 'discarding', coins: 0, message: 'Skipped buying. Discard excess goods.' }
    }

    // ── Phase 5: Discard goods ──────────────────────────────────
    case 'DISCARD_GOODS': {
      if (state.phase !== 'discarding') return state
      const nextGoods = { ...state.goods }
      const toDiscard = Math.min(action.amount, nextGoods[action.goodType])
      nextGoods[action.goodType] -= toDiscard
      return {
        ...state,
        goods: nextGoods,
        message: `Discarded ${toDiscard} ${action.goodType}.`,
      }
    }

    // ── End turn ────────────────────────────────────────────────
    case 'END_TURN': {
      if (state.phase !== 'discarding') return state

      // Enforce max goods unless Caravans
      if (!hasDevelopment(state, 'caravans') && totalGoods(state.goods) > MAX_GOODS_TOTAL) {
        return { ...state, message: `Must discard goods down to ${MAX_GOODS_TOTAL} total.` }
      }

      const nextTurn = state.turn + 1
      const ended = checkGameEnd({ ...state, turn: nextTurn })

      return {
        ...state,
        workers: 0,
        coins: 0,
        skulls: 0,
        turn: nextTurn,
        rollNumber: 0,
        diceResults: [],
        diceKept: [],
        foodOrWorkerChoices: [],
        phase: 'rolling',
        boughtThisTurn: false,
        usedLeadership: false,
        gameEnded: ended,
        message: ended ? `Game Over! Final score: ${calculateScore(state)}` : `Turn ${nextTurn} begins. Roll your dice.`,
      }
    }

    default:
      return state
  }
}

// ────────────────────────────────────────────────────────────────
// Collection resolver (Phase 1c)
// ────────────────────────────────────────────────────────────────

function resolveCollection(state: GameState): GameState {
  let foodGained = 0
  let workersGained = 0
  let coinsGained = 0
  let goodsGained = 0

  let foodDiceCount = 0
  let workerDiceCount = 0

  state.diceResults.forEach((face, i) => {
    switch (face) {
      case 'food3':
        foodGained += 3
        foodDiceCount += 1
        break
      case 'good1':
        goodsGained += 1
        break
      case 'goods2skull':
        goodsGained += 2
        break
      case 'workers3':
        workersGained += 3
        workerDiceCount += 1
        break
      case 'foodOrWork': {
        const choice = state.foodOrWorkerChoices[i]
        if (choice === 'food') {
          foodGained += 2
          foodDiceCount += 1
        } else {
          workersGained += 2
          workerDiceCount += 1
        }
        break
      }
      case 'coins7':
        coinsGained += hasDevelopment(state, 'coinage') ? 12 : 7
        break
    }
  })

  // Agriculture: +1 food per food-face die
  if (hasDevelopment(state, 'agriculture')) {
    foodGained += foodDiceCount
  }

  // Masonry: +1 worker per worker-face die
  if (hasDevelopment(state, 'masonry')) {
    workersGained += workerDiceCount
  }

  // Add goods
  let nextGoods = addGoods(state.goods, goodsGained)

  // Quarrying: +1 stone whenever stone is produced
  if (hasDevelopment(state, 'quarrying') && nextGoods.stone > state.goods.stone) {
    nextGoods = { ...nextGoods, stone: Math.min(MAX_GOOD_PER_TIER, nextGoods.stone + 1) }
  }

  const nextFood = Math.min(MAX_FOOD, state.food + foodGained)

  const messages: string[] = []
  if (foodGained > 0) messages.push(`${foodGained} food`)
  if (goodsGained > 0) messages.push(`${goodsGained} goods`)
  if (workersGained > 0) messages.push(`${workersGained} workers`)
  if (coinsGained > 0) messages.push(`${coinsGained} coins`)

  return {
    ...state,
    food: nextFood,
    workers: workersGained,
    coins: coinsGained,
    goods: nextGoods,
    phase: 'feeding',
    message: `Collected: ${messages.join(', ')}. Now feed your cities.`,
  }
}

// ────────────────────────────────────────────────────────────────
// Feed cities + resolve disasters (Phase 2)
// ────────────────────────────────────────────────────────────────

function feedAndDisaster(state: GameState): GameState {
  const requiredFood = state.cities
  let nextFood = state.food
  let disasterGained = 0
  const messages: string[] = []

  // Feeding
  if (nextFood >= requiredFood) {
    nextFood -= requiredFood
    messages.push(`Fed ${requiredFood} cities.`)
  } else {
    const unfed = requiredFood - nextFood
    disasterGained += unfed // -1 per unfed city (Famine)
    nextFood = 0
    messages.push(`Famine! ${unfed} unfed cities: -${unfed} disaster points.`)
  }

  // Disasters based on skull count
  let nextGoods = { ...state.goods }

  if (state.skulls >= 2 && !hasDevelopment(state, 'irrigation')) {
    disasterGained += 2
    messages.push('Drought: -2 points.')
  }

  if (state.skulls >= 3) {
    // Pestilence: in solitaire, affects self unless Medicine
    if (!hasDevelopment(state, 'medicine')) {
      disasterGained += 3
      messages.push('Pestilence: -3 points.')
    }
  }

  if (state.skulls >= 4) {
    // Invasion: -4 points unless Great Wall completed
    const greatWall = state.monuments.find((m) => m.id === 'great-wall')
    if (!greatWall?.completedByPlayer) {
      disasterGained += 4
      messages.push('Invasion: -4 points.')
    }
  }

  if (state.skulls >= 5) {
    // Revolt: lose all goods unless Religion
    if (!hasDevelopment(state, 'religion')) {
      nextGoods = clearAllGoods()
      messages.push('Revolt: lost all goods!')
    }
  }

  return {
    ...state,
    food: nextFood,
    goods: nextGoods,
    disasterPoints: state.disasterPoints + disasterGained,
    phase: 'building',
    message: messages.join(' ') + ' Build phase: assign workers to cities or monuments.',
  }
}
