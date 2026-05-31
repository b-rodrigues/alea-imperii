export type GoodsType = 'wood' | 'stone' | 'pottery' | 'cloth' | 'spears'

export type DiceFace = 'food' | 'workers' | 'coins' | 'goods' | 'disaster'

export interface Monument {
  id: string
  name: string
  requiredWorkers: number
  currentWorkers: number
  completedBy?: 'player'
  points: number
}

export interface Development {
  id: string
  name: string
  cost: number
  points: number
  description: string
  effects: string[]
  owned: boolean
}

export interface GameState {
  population: number
  food: number
  goods: Record<GoodsType, number>
  coins: number
  workers: number
  monuments: Monument[]
  developments: Development[]
  score: number
  turn: number
  rerollsLeft: number
  diceResults: DiceFace[]
  message: string
  gameEnded: boolean
}

export type GameAction =
  | { type: 'ROLL_DICE'; rolls: DiceFace[] }
  | { type: 'REROLL_DICE'; indices: number[]; rolls: DiceFace[] }
  | { type: 'RESOLVE_DICE' }
  | { type: 'FEED_POPULATION' }
  | { type: 'BUILD_MONUMENT'; monumentId: string }
  | { type: 'BUY_DEVELOPMENT'; developmentId: string }
  | { type: 'END_TURN' }

export const DIE_FACES: DiceFace[] = ['food', 'workers', 'coins', 'goods', 'disaster', 'food']

const goodsOrder: GoodsType[] = ['wood', 'stone', 'pottery', 'cloth', 'spears']

const goodsPoints: Record<GoodsType, number> = {
  wood: 1,
  stone: 2,
  pottery: 3,
  cloth: 4,
  spears: 5,
}

const maxGoodPerTier = 6

const hasDevelopment = (state: GameState, id: string) =>
  state.developments.some((development) => development.id === id && development.owned)

const maxRerolls = (state: GameState) => 2 + (hasDevelopment(state, 'leadership') ? 1 : 0)

const addGoods = (goods: Record<GoodsType, number>, amount: number): Record<GoodsType, number> => {
  const next = { ...goods }

  for (let i = 0; i < amount; i += 1) {
    for (const tier of goodsOrder) {
      if (next[tier] < maxGoodPerTier) {
        next[tier] += 1
        break
      }
    }
  }

  return next
}

const loseHighestTierGoods = (goods: Record<GoodsType, number>): Record<GoodsType, number> => {
  const next = { ...goods }

  for (let i = goodsOrder.length - 1; i >= 0; i -= 1) {
    const tier = goodsOrder[i]
    if (next[tier] > 0) {
      next[tier] -= 1
      break
    }
  }

  return next
}

export const calculateScore = (state: GameState): number => {
  const monumentPoints = state.monuments.reduce(
    (total, monument) => total + (monument.completedBy ? monument.points : 0),
    0,
  )
  const developmentPoints = state.developments.reduce(
    (total, development) => total + (development.owned ? development.points : 0),
    0,
  )
  const goodsTotal = goodsOrder.reduce(
    (total, tier) => total + state.goods[tier] * goodsPoints[tier],
    0,
  )

  return monumentPoints + developmentPoints + goodsTotal + state.population + state.coins
}

const withEndCondition = (state: GameState): GameState => {
  const completedMonuments = state.monuments.filter((monument) => monument.completedBy).length
  const ownedDevelopments = state.developments.filter((development) => development.owned).length
  const gameEnded = completedMonuments >= 2 || ownedDevelopments >= 5

  return {
    ...state,
    gameEnded,
  }
}

export const initialGameState: GameState = {
  population: 3,
  food: 3,
  goods: {
    wood: 0,
    stone: 0,
    pottery: 0,
    cloth: 0,
    spears: 0,
  },
  coins: 0,
  workers: 0,
  monuments: [
    { id: 'pyramid', name: 'Pyramid', requiredWorkers: 10, currentWorkers: 0, points: 10 },
    { id: 'temple', name: 'Temple', requiredWorkers: 8, currentWorkers: 0, points: 8 },
    { id: 'obelisk', name: 'Obelisk', requiredWorkers: 6, currentWorkers: 0, points: 6 },
    { id: 'great-wall', name: 'Great Wall', requiredWorkers: 12, currentWorkers: 0, points: 12 },
  ],
  developments: [
    {
      id: 'agriculture',
      name: 'Agriculture',
      cost: 5,
      points: 3,
      description: 'Gain +1 food whenever you resolve dice.',
      effects: ['+1 food per resolve'],
      owned: false,
    },
    {
      id: 'masonry',
      name: 'Masonry',
      cost: 8,
      points: 5,
      description: 'Your monument builds are more efficient.',
      effects: ['+1 worker value when building monuments'],
      owned: false,
    },
    {
      id: 'leadership',
      name: 'Leadership',
      cost: 10,
      points: 7,
      description: 'Gain one extra reroll each turn.',
      effects: ['+1 reroll'],
      owned: false,
    },
    {
      id: 'coinage',
      name: 'Coinage',
      cost: 7,
      points: 4,
      description: 'Gain +1 coin whenever any coin is rolled.',
      effects: ['+1 coin on coin gain'],
      owned: false,
    },
    {
      id: 'religion',
      name: 'Religion',
      cost: 9,
      points: 6,
      description: 'Prevent drought penalties from disasters.',
      effects: ['Ignore drought'],
      owned: false,
    },
    {
      id: 'engineering',
      name: 'Engineering',
      cost: 11,
      points: 8,
      description: 'Monument construction gets a free extra worker.',
      effects: ['+1 monument worker each build action'],
      owned: false,
    },
  ],
  score: 0,
  turn: 1,
  rerollsLeft: 2,
  diceResults: [],
  message: 'Welcome to Alea Imperii!',
  gameEnded: false,
}

export const randomRolls = (
  diceCount: number,
  random: () => number = Math.random,
): DiceFace[] =>
  Array.from({ length: diceCount }, () => {
    const index = Math.floor(random() * DIE_FACES.length)
    return DIE_FACES[index]
  })

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  if (state.gameEnded) {
    return state
  }

  switch (action.type) {
    case 'ROLL_DICE': {
      return {
        ...state,
        diceResults: action.rolls,
        rerollsLeft: maxRerolls(state),
        message: 'Dice rolled.',
      }
    }
    case 'REROLL_DICE': {
      if (state.rerollsLeft <= 0 || action.indices.length !== action.rolls.length) {
        return {
          ...state,
          message: 'No rerolls left.',
        }
      }

      const nextDice = [...state.diceResults]
      action.indices.forEach((index, resultIndex) => {
        nextDice[index] = action.rolls[resultIndex]
      })

      return {
        ...state,
        diceResults: nextDice,
        rerollsLeft: state.rerollsLeft - 1,
        message: `Rerolled ${action.indices.length} dice.`,
      }
    }
    case 'RESOLVE_DICE': {
      if (state.diceResults.length === 0) {
        return state
      }

      let foodGained = 0
      let workersGained = 0
      let coinsGained = 0
      let goodsGained = 0
      let disasters = 0

      state.diceResults.forEach((result) => {
        if (result === 'food') foodGained += 2
        if (result === 'workers') workersGained += 2
        if (result === 'coins') coinsGained += 1
        if (result === 'goods') goodsGained += 1
        if (result === 'disaster') disasters += 1
      })

      if (hasDevelopment(state, 'agriculture')) {
        foodGained += 1
      }
      if (coinsGained > 0 && hasDevelopment(state, 'coinage')) {
        coinsGained += 1
      }

      let message = `Gained: ${foodGained} food, ${workersGained} workers, ${coinsGained} coins, ${goodsGained} goods.`
      let nextGoods = addGoods(state.goods, goodsGained)
      let nextFood = state.food + foodGained

      if (disasters >= 2 && !hasDevelopment(state, 'religion')) {
        nextFood = Math.max(0, nextFood - 2)
        message = 'Drought! Lost 2 food.'
      }

      if (disasters >= 3) {
        nextGoods = loseHighestTierGoods(nextGoods)
        message = `${message} Invasion! Lost one highest-tier good.`
      }

      return withEndCondition({
        ...state,
        food: nextFood,
        workers: state.workers + workersGained,
        coins: state.coins + coinsGained,
        goods: nextGoods,
        diceResults: [],
        message,
      })
    }
    case 'FEED_POPULATION': {
      const requiredFood = state.population
      if (state.food >= requiredFood) {
        return {
          ...state,
          food: state.food - requiredFood,
          message: `Population fed. Consumed ${requiredFood} food.`,
        }
      }

      const shortage = requiredFood - state.food
      const lostPopulation = Math.ceil(shortage / 2)
      return {
        ...state,
        food: 0,
        population: Math.max(1, state.population - lostPopulation),
        message: 'Food shortage! Population decreased.',
      }
    }
    case 'BUILD_MONUMENT': {
      if (state.workers <= 0) {
        return {
          ...state,
          message: 'No workers available.',
        }
      }

      let workersUsed = 0
      const monuments = state.monuments.map((monument) => {
        if (monument.id !== action.monumentId || monument.completedBy) {
          return monument
        }

        const remaining = monument.requiredWorkers - monument.currentWorkers
        const bonus = hasDevelopment(state, 'masonry') || hasDevelopment(state, 'engineering') ? 1 : 0
        const contribution = Math.min(remaining, state.workers + bonus)
        workersUsed = Math.max(1, contribution - bonus)
        const currentWorkers = monument.currentWorkers + contribution

        return {
          ...monument,
          currentWorkers,
          completedBy: currentWorkers >= monument.requiredWorkers ? ('player' as const) : undefined,
        }
      })

      if (workersUsed === 0) {
        return state
      }

      return withEndCondition({
        ...state,
        workers: state.workers - workersUsed,
        monuments,
        message: 'Workers assigned to monument.',
      })
    }
    case 'BUY_DEVELOPMENT': {
      let didBuy = false
      const developments = state.developments.map((development) => {
        if (development.id !== action.developmentId || development.owned || state.coins < development.cost) {
          return development
        }

        didBuy = true
        return {
          ...development,
          owned: true,
        }
      })

      if (!didBuy) {
        return state
      }

      const spent = state.developments.find((development) => development.id === action.developmentId)?.cost ?? 0

      return withEndCondition({
        ...state,
        coins: state.coins - spent,
        developments,
        message: 'Development purchased.',
      })
    }
    case 'END_TURN': {
      const nextTurnState = {
        ...state,
        score: calculateScore(state),
        workers: 0,
        turn: state.turn + 1,
        rerollsLeft: maxRerolls(state),
        diceResults: [],
        message: `Turn ${state.turn + 1} begins.`,
      }

      return withEndCondition(nextTurnState)
    }
    default:
      return state
  }
}
