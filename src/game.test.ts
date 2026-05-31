import { describe, expect, it } from 'vitest'
import {
  gameReducer,
  initialGameState,
  calculateScore,
  hasDevelopment,
  type GameState,
} from './game'

// Helper to get to a specific phase quickly
function rollAndCollect(state: GameState, faces: import('./game').DiceFace[]): GameState {
  let s = gameReducer(state, { type: 'ROLL_DICE', rolls: faces })
  s = gameReducer(s, { type: 'COLLECT' })
  return s
}

function rollCollectFeed(state: GameState, faces: import('./game').DiceFace[]): GameState {
  let s = rollAndCollect(state, faces)
  // Handle choosing phase for foodOrWork dice
  if (s.phase === 'choosing') {
    faces.forEach((f, i) => {
      if (f === 'foodOrWork') {
        s = gameReducer(s, { type: 'CHOOSE_FOOD_OR_WORKERS', dieIndex: i, choice: 'food' })
      }
    })
  }
  s = gameReducer(s, { type: 'FEED_AND_RESOLVE_DISASTERS' })
  return s
}

describe('gameReducer', () => {
  describe('dice rolling', () => {
    it('rolls dice and records results', () => {
      const rolled = gameReducer(initialGameState, {
        type: 'ROLL_DICE',
        rolls: ['food3', 'workers3', 'good1'],
      })

      expect(rolled.diceResults).toEqual(['food3', 'workers3', 'good1'])
      expect(rolled.rollNumber).toBe(1)
      expect(rolled.phase).toBe('rolling')
    })

    it('tracks skull dice without auto-locking them', () => {
      const rolled = gameReducer(initialGameState, {
        type: 'ROLL_DICE',
        rolls: ['food3', 'goods2skull', 'good1'],
      })

      expect(rolled.skulls).toBe(1)
      expect(rolled.diceKept[1]).toBe(false)
      expect(rolled.diceKept[0]).toBe(false)   // non-skull not locked
      expect(rolled.diceKept[2]).toBe(false)
    })

    it('allows up to 3 rolls', () => {
      let s = gameReducer(initialGameState, {
        type: 'ROLL_DICE',
        rolls: ['food3', 'workers3', 'good1'],
      })
      expect(s.rollNumber).toBe(1)

      // Reroll all (none kept)
      s = gameReducer(s, { type: 'REROLL', rolls: ['coins7', 'food3', 'workers3'] })
      expect(s.rollNumber).toBe(2)

      // Third roll
      s = gameReducer(s, { type: 'REROLL', rolls: ['good1', 'coins7', 'food3'] })
      expect(s.rollNumber).toBe(3)

      // No more rerolls allowed
      const s4 = gameReducer(s, { type: 'REROLL', rolls: ['food3', 'food3', 'food3'] })
      expect(s4.rollNumber).toBe(3) // unchanged
    })

    it('allows rerolling a skull die before the roll is finalized', () => {
      let s = gameReducer(initialGameState, {
        type: 'ROLL_DICE',
        rolls: ['food3', 'goods2skull', 'good1'],
      })

      s = gameReducer(s, { type: 'REROLL', rolls: ['food3', 'workers3', 'coins7'] })
      expect(s.diceResults).toEqual(['food3', 'workers3', 'coins7'])
      expect(s.skulls).toBe(0)
    })
  })

  describe('resource collection', () => {
    it('collects correct resources from dice faces', () => {
      const s = rollAndCollect(initialGameState, ['food3', 'workers3', 'good1'])

      expect(s.food).toBe(6)       // initial 3 + 3 from food3
      expect(s.workers).toBe(3)    // 3 from workers3
      expect(s.goods.wood).toBe(1) // 1 from good1
      expect(s.phase).toBe('feeding')
    })

    it('collects 2 goods from skull face', () => {
      const s = rollAndCollect(initialGameState, ['goods2skull', 'food3', 'food3'])

      // 2 goods fill bottom-to-top: wood=1, stone=1
      expect(s.goods.wood).toBe(1)
      expect(s.goods.stone).toBe(1)
      expect(s.skulls).toBe(1)
    })

    it('collects 7 coins from coins face', () => {
      const s = rollAndCollect(initialGameState, ['coins7', 'food3', 'food3'])

      expect(s.coins).toBe(7)
    })

    it('coinage development yields 12 coins', () => {
      const state = {
        ...initialGameState,
        developments: initialGameState.developments.map((d) =>
          d.id === 'coinage' ? { ...d, owned: true } : d,
        ),
      }
      const s = rollAndCollect(state, ['coins7', 'food3', 'food3'])

      expect(s.coins).toBe(12)
    })

    it('agriculture adds +1 food per food-face die', () => {
      const state = {
        ...initialGameState,
        developments: initialGameState.developments.map((d) =>
          d.id === 'agriculture' ? { ...d, owned: true } : d,
        ),
      }
      const s = rollAndCollect(state, ['food3', 'food3', 'good1'])

      // initial 3 + (3+1) + (3+1) = 11 food
      expect(s.food).toBe(11)
    })

    it('masonry adds +1 worker per worker-face die', () => {
      const state = {
        ...initialGameState,
        developments: initialGameState.developments.map((d) =>
          d.id === 'masonry' ? { ...d, owned: true } : d,
        ),
      }
      const s = rollAndCollect(state, ['workers3', 'workers3', 'food3'])

      // 2 workers3 dice: (3+1) + (3+1) = 8 workers
      expect(s.workers).toBe(8)
    })
  })

  describe('food-or-workers choice', () => {
    it('prompts for choice when foodOrWork dice exist', () => {
      let s = gameReducer(initialGameState, {
        type: 'ROLL_DICE',
        rolls: ['foodOrWork', 'food3', 'good1'],
      })
      s = gameReducer(s, { type: 'COLLECT' })

      expect(s.phase).toBe('choosing')
    })

    it('collects food when food is chosen for foodOrWork', () => {
      let s = gameReducer(initialGameState, {
        type: 'ROLL_DICE',
        rolls: ['foodOrWork', 'food3', 'good1'],
      })
      s = gameReducer(s, { type: 'COLLECT' })
      s = gameReducer(s, { type: 'CHOOSE_FOOD_OR_WORKERS', dieIndex: 0, choice: 'food' })

      expect(s.food).toBe(8)    // 3 + 2 + 3
      expect(s.workers).toBe(0)
      expect(s.phase).toBe('feeding')
    })

    it('collects workers when workers chosen for foodOrWork', () => {
      let s = gameReducer(initialGameState, {
        type: 'ROLL_DICE',
        rolls: ['foodOrWork', 'food3', 'good1'],
      })
      s = gameReducer(s, { type: 'COLLECT' })
      s = gameReducer(s, { type: 'CHOOSE_FOOD_OR_WORKERS', dieIndex: 0, choice: 'workers' })

      expect(s.food).toBe(6)    // 3 + 3
      expect(s.workers).toBe(2)
      expect(s.phase).toBe('feeding')
    })
  })

  describe('feeding and disasters', () => {
    it('feeds cities correctly', () => {
      // Start with 3 cities, need 3 food
      const s = rollCollectFeed(initialGameState, ['food3', 'food3', 'food3'])

      // food = 3 + 9 = 12, then -3 for feeding = 9
      expect(s.food).toBe(9)
      expect(s.phase).toBe('building')
    })

    it('applies famine disaster points for unfed cities', () => {
      const state = { ...initialGameState, food: 0 }
      const s = rollCollectFeed(state, ['workers3', 'workers3', 'workers3'])

      // 0 food collected, 3 cities unfed = 3 disaster points
      expect(s.disasterPoints).toBe(3)
    })

    it('drought with 2 skulls costs 2 disaster points', () => {
      const state = { ...initialGameState, food: 10 }
      const s = rollCollectFeed(state, ['goods2skull', 'goods2skull', 'food3'])

      // Should have drought (-2 disaster points)
      expect(s.disasterPoints).toBeGreaterThanOrEqual(2)
    })

    it('irrigation prevents drought', () => {
      const state = {
        ...initialGameState,
        food: 10,
        developments: initialGameState.developments.map((d) =>
          d.id === 'irrigation' ? { ...d, owned: true } : d,
        ),
      }
      const s = rollCollectFeed(state, ['goods2skull', 'goods2skull', 'food3'])

      // No drought penalty
      expect(s.disasterPoints).toBe(0)
    })
  })

  describe('building', () => {
    it('assigns workers to monument', () => {
      let s = rollCollectFeed(initialGameState, ['workers3', 'workers3', 'food3'])

      s = gameReducer(s, { type: 'BUILD_MONUMENT', monumentId: 'step-pyramid', workers: 3 })

      const pyramid = s.monuments.find((m) => m.id === 'step-pyramid')!
      expect(pyramid.progress).toBe(3)
      expect(pyramid.completedByPlayer).toBe(true)
    })

    it('assigns workers to city', () => {
      let s = rollCollectFeed(initialGameState, ['workers3', 'workers3', 'food3'])

      s = gameReducer(s, { type: 'BUILD_CITY', cityIndex: 4, workers: 2 })

      const city4 = s.citySlots.find((c) => c.index === 4)!
      expect(city4.progress).toBe(2)
      expect(city4.built).toBe(true)
      expect(s.cities).toBe(4)
    })

    it('engineering allows spending stone for 3 boxes each', () => {
      const state = {
        ...initialGameState,
        goods: { wood: 0, stone: 3, pottery: 0, cloth: 0, spearheads: 0 },
        developments: initialGameState.developments.map((d) =>
          d.id === 'engineering' ? { ...d, owned: true } : d,
        ),
      }
      let s = rollCollectFeed(state, ['food3', 'food3', 'food3'])

      s = gameReducer(s, {
        type: 'USE_ENGINEERING',
        stoneAmount: 3,
        targetType: 'monument',
        targetId: 'obelisk',
      })

      const obelisk = s.monuments.find((m) => m.id === 'obelisk')!
      expect(obelisk.progress).toBe(9) // 3 stone × 3 = 9 boxes
      expect(obelisk.completedByPlayer).toBe(true)
      expect(s.goods.stone).toBe(0)
    })

    it('does not spend workers for an invalid monument target', () => {
      const s = gameReducer(
        rollCollectFeed(initialGameState, ['workers3', 'workers3', 'food3']),
        { type: 'BUILD_MONUMENT', monumentId: 'missing-monument', workers: 3 },
      )

      expect(s.workers).toBe(6)
    })

    it('does not spend workers for an invalid city target', () => {
      const s = gameReducer(
        rollCollectFeed(initialGameState, ['workers3', 'workers3', 'food3']),
        { type: 'BUILD_CITY', cityIndex: 99, workers: 2 },
      )

      expect(s.workers).toBe(6)
    })

    it('does not spend stone for an invalid engineering target', () => {
      const state = {
        ...initialGameState,
        goods: { wood: 0, stone: 3, pottery: 0, cloth: 0, spearheads: 0 },
        developments: initialGameState.developments.map((d) =>
          d.id === 'engineering' ? { ...d, owned: true } : d,
        ),
      }
      const s = gameReducer(
        rollCollectFeed(state, ['food3', 'food3', 'food3']),
        {
          type: 'USE_ENGINEERING',
          stoneAmount: 2,
          targetType: 'monument',
          targetId: 'missing-monument',
        },
      )

      expect(s.goods.stone).toBe(3)
    })
  })

  describe('buying developments', () => {
    it('buys development with coins', () => {
      let s = rollCollectFeed(initialGameState, ['coins7', 'coins7', 'food3'])

      s = gameReducer(s, { type: 'DONE_BUILDING' })
      s = gameReducer(s, {
        type: 'BUY_DEVELOPMENT',
        developmentId: 'leadership', // costs 10
        goodsToSpend: [],
      })

      expect(hasDevelopment(s, 'leadership')).toBe(true)
      expect(s.boughtThisTurn).toBe(true)
    })

    it('buys development with goods + coins', () => {
      const state = {
        ...initialGameState,
        goods: { wood: 0, stone: 0, pottery: 0, cloth: 0, spearheads: 2 },
      }
      let s = rollCollectFeed(state, ['coins7', 'food3', 'food3'])

      s = gameReducer(s, { type: 'DONE_BUILDING' })
      // Leadership costs 10; coins = 7, spearheads = 2 × 5 = 10, total = 17 >= 10
      s = gameReducer(s, {
        type: 'BUY_DEVELOPMENT',
        developmentId: 'leadership',
        goodsToSpend: ['spearheads'],
      })

      expect(hasDevelopment(s, 'leadership')).toBe(true)
      expect(s.goods.spearheads).toBe(0) // must spend ALL of type
    })

    it('limits to 1 development per turn', () => {
      let s = rollCollectFeed(initialGameState, ['coins7', 'coins7', 'coins7'])

      s = gameReducer(s, { type: 'DONE_BUILDING' })
      s = gameReducer(s, {
        type: 'BUY_DEVELOPMENT',
        developmentId: 'leadership',
        goodsToSpend: [],
      })

      const s2 = gameReducer(s, {
        type: 'BUY_DEVELOPMENT',
        developmentId: 'irrigation',
        goodsToSpend: [],
      })

      expect(hasDevelopment(s2, 'irrigation')).toBe(false) // blocked
    })
  })

  describe('end of turn', () => {
    it('enforces goods limit of 6 unless caravans', () => {
      const state: GameState = {
        ...initialGameState,
        phase: 'discarding' as const,
        goods: { wood: 3, stone: 3, pottery: 2, cloth: 0, spearheads: 0 },
      }

      const s = gameReducer(state, { type: 'END_TURN' })
      // Total = 8 > 6, should refuse
      expect(s.phase).toBe('discarding')
      expect(s.message).toContain('discard')
    })

    it('allows any amount of goods with caravans', () => {
      const state: GameState = {
        ...initialGameState,
        phase: 'discarding' as const,
        goods: { wood: 3, stone: 3, pottery: 2, cloth: 0, spearheads: 0 },
        developments: initialGameState.developments.map((d) =>
          d.id === 'caravans' ? { ...d, owned: true } : d,
        ),
      }

      const s = gameReducer(state, { type: 'END_TURN' })
      expect(s.phase).toBe('rolling')
      expect(s.turn).toBe(2)
    })

    it('resets ephemeral state on end turn', () => {
      const state: GameState = {
        ...initialGameState,
        phase: 'discarding' as const,
        coins: 5,
        workers: 3,
        skulls: 2,
      }

      const s = gameReducer(state, { type: 'END_TURN' })
      expect(s.coins).toBe(0)
      expect(s.workers).toBe(0)
      expect(s.skulls).toBe(0)
      expect(s.rollNumber).toBe(0)
    })
  })

  describe('game end conditions', () => {
    it('ends game after 5 developments purchased', () => {
      const state: GameState = {
        ...initialGameState,
        phase: 'buying' as const,
        coins: 100,
        developments: initialGameState.developments.map((d, i) =>
          i < 4 ? { ...d, owned: true } : d,
        ),
      }

      const s = gameReducer(state, {
        type: 'BUY_DEVELOPMENT',
        developmentId: 'medicine', // 5th dev
        goodsToSpend: [],
      })

      expect(s.gameEnded).toBe(true)
    })

    it('ends game after 10 rounds (solitaire)', () => {
      const state: GameState = {
        ...initialGameState,
        turn: 10,
        phase: 'discarding' as const,
      }

      const s = gameReducer(state, { type: 'END_TURN' })
      expect(s.gameEnded).toBe(true)
    })
  })

  describe('scoring', () => {
    it('calculates score from developments and monuments', () => {
      const state: GameState = {
        ...initialGameState,
        developments: initialGameState.developments.map((d) =>
          d.id === 'leadership' ? { ...d, owned: true } : d,
        ),
        monuments: initialGameState.monuments.map((m) =>
          m.id === 'step-pyramid'
            ? { ...m, completedByPlayer: true, firstClaimed: false }
            : m,
        ),
      }

      const score = calculateScore(state)
      // Leadership = 2 pts, Step Pyramid first = 1 pt
      expect(score).toBe(3)
    })

    it('subtracts disaster points from score', () => {
      const state: GameState = {
        ...initialGameState,
        disasterPoints: 5,
      }

      const score = calculateScore(state)
      expect(score).toBe(-5)
    })

    it('architecture bonus adds +1 per completed monument', () => {
      const state: GameState = {
        ...initialGameState,
        developments: initialGameState.developments.map((d) =>
          d.id === 'architecture' ? { ...d, owned: true } : d,
        ),
        monuments: initialGameState.monuments.map((m) =>
          m.id === 'step-pyramid' || m.id === 'obelisk'
            ? { ...m, completedByPlayer: true, firstClaimed: false }
            : m,
        ),
      }

      const score = calculateScore(state)
      // Architecture dev = 8 pts, Step Pyramid = 1 pt, Obelisk = 6 pts, +2 architecture bonus
      expect(score).toBe(17)
    })

    it('empire bonus adds +1 per city owned', () => {
      const state: GameState = {
        ...initialGameState,
        cities: 5,
        developments: initialGameState.developments.map((d) =>
          d.id === 'empire' ? { ...d, owned: true } : d,
        ),
      }

      const score = calculateScore(state)
      // Empire dev = 8 pts + 5 cities = 13
      expect(score).toBe(13)
    })
  })

  describe('leadership reroll', () => {
    it('only allows rerolling after the roll is finalized', () => {
      const state = {
        ...initialGameState,
        developments: initialGameState.developments.map((d) =>
          d.id === 'leadership' ? { ...d, owned: true } : d,
        ),
      }

      let s = gameReducer(state, {
        type: 'ROLL_DICE',
        rolls: ['food3', 'workers3', 'good1'],
      })

      const beforeFinalized = gameReducer(s, {
        type: 'LEADERSHIP_REROLL',
        index: 2,
        roll: 'coins7',
      })

      expect(beforeFinalized.diceResults[2]).toBe('good1')
      expect(beforeFinalized.usedLeadership).toBe(false)

      s = gameReducer(s, { type: 'KEEP_DIE', index: 0 })
      s = gameReducer(s, { type: 'KEEP_DIE', index: 1 })
      s = gameReducer(s, { type: 'KEEP_DIE', index: 2 })

      s = gameReducer(s, {
        type: 'LEADERSHIP_REROLL',
        index: 2,
        roll: 'coins7',
      })

      expect(s.diceResults[2]).toBe('coins7')
      expect(s.usedLeadership).toBe(true)
    })

    it('cannot use leadership reroll twice', () => {
      const state = {
        ...initialGameState,
        developments: initialGameState.developments.map((d) =>
          d.id === 'leadership' ? { ...d, owned: true } : d,
        ),
      }

      let s = gameReducer(state, {
        type: 'ROLL_DICE',
        rolls: ['food3', 'workers3', 'good1'],
      })

      s = gameReducer(s, { type: 'KEEP_DIE', index: 0 })
      s = gameReducer(s, { type: 'KEEP_DIE', index: 1 })
      s = gameReducer(s, { type: 'KEEP_DIE', index: 2 })

      s = gameReducer(s, {
        type: 'LEADERSHIP_REROLL',
        index: 2,
        roll: 'coins7',
      })

      expect(s.diceResults[2]).toBe('coins7')
      expect(s.usedLeadership).toBe(true)

      const s2 = gameReducer(s, {
        type: 'LEADERSHIP_REROLL',
        index: 0,
        roll: 'coins7',
      })

      expect(s2.diceResults[0]).toBe('food3') // unchanged
    })
  })
})
