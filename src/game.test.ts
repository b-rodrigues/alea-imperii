import { describe, expect, it } from 'vitest'
import { gameReducer, initialGameState } from './game'

describe('gameReducer', () => {
  it('resolves dice into resources and goods track', () => {
    const rolled = gameReducer(initialGameState, {
      type: 'ROLL_DICE',
      rolls: ['food', 'workers', 'goods'],
    })

    const resolved = gameReducer(rolled, { type: 'RESOLVE_DICE' })

    expect(resolved.food).toBe(5)
    expect(resolved.workers).toBe(2)
    expect(resolved.goods.wood).toBe(1)
  })

  it('reduces population on food shortage', () => {
    const starvingState = {
      ...initialGameState,
      food: 0,
      population: 5,
    }

    const fed = gameReducer(starvingState, { type: 'FEED_POPULATION' })

    expect(fed.population).toBe(2)
    expect(fed.food).toBe(0)
  })

  it('adds reroll when leadership is purchased', () => {
    const richState = {
      ...initialGameState,
      coins: 20,
    }

    const withLeadership = gameReducer(richState, {
      type: 'BUY_DEVELOPMENT',
      developmentId: 'leadership',
    })

    const rolled = gameReducer(withLeadership, {
      type: 'ROLL_DICE',
      rolls: ['food', 'food', 'food'],
    })

    expect(rolled.rerollsLeft).toBe(3)
  })

  it('ends game after enough developments are purchased', () => {
    let state = {
      ...initialGameState,
      coins: 200,
    }

    for (const development of state.developments.slice(0, 5)) {
      state = gameReducer(state, {
        type: 'BUY_DEVELOPMENT',
        developmentId: development.id,
      })
    }

    expect(state.gameEnded).toBe(true)
  })
})
