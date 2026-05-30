import { useMemo, useState } from 'react'
import './App.css'
import { gameReducer, initialGameState, randomRolls, type GameAction } from './game'

function App() {
  const [gameState, setGameState] = useState(initialGameState)
  const [selectedDice, setSelectedDice] = useState<number[]>([])

  const dispatch = (action: GameAction) => {
    setGameState((previous) => gameReducer(previous, action))
  }

  const rollDice = () => {
    dispatch({
      type: 'ROLL_DICE',
      rolls: randomRolls(gameState.population),
    })
    setSelectedDice([])
  }

  const rerollSelected = () => {
    if (selectedDice.length === 0) {
      return
    }

    dispatch({
      type: 'REROLL_DICE',
      indices: selectedDice,
      rolls: randomRolls(selectedDice.length),
    })
    setSelectedDice([])
  }

  const toggleDieSelection = (index: number) => {
    setSelectedDice((current) =>
      current.includes(index)
        ? current.filter((selectedIndex) => selectedIndex !== index)
        : [...current, index],
    )
  }

  const completedMonuments = useMemo(
    () => gameState.monuments.filter((monument) => monument.completedBy).length,
    [gameState.monuments],
  )

  const ownedDevelopments = useMemo(
    () => gameState.developments.filter((development) => development.owned).length,
    [gameState.developments],
  )

  return (
    <main className="app">
      <h1>Alea Imperii</h1>
      <p className="subtitle">A dice-driven civilization game of growth, conquest, and imperial ambition.</p>

      <section className="panel stats-grid">
        <p>Turn: {gameState.turn}</p>
        <p>Population: {gameState.population}</p>
        <p>Food: {gameState.food}</p>
        <p>Coins: {gameState.coins}</p>
        <p>Workers: {gameState.workers}</p>
        <p>Score: {gameState.score}</p>
        <p>Rerolls left: {gameState.rerollsLeft}</p>
      </section>

      <section className="panel">
        <h2>Roll and Re-roll</h2>
        <div className="button-row">
          <button onClick={rollDice} disabled={gameState.gameEnded}>
            Roll Dice
          </button>
          <button
            onClick={rerollSelected}
            disabled={
              gameState.gameEnded ||
              gameState.rerollsLeft === 0 ||
              selectedDice.length === 0 ||
              gameState.diceResults.length === 0
            }
          >
            Re-roll Selected
          </button>
          <button
            onClick={() => dispatch({ type: 'RESOLVE_DICE' })}
            disabled={gameState.gameEnded || gameState.diceResults.length === 0}
          >
            Resolve Dice
          </button>
        </div>

        <div className="dice-results">
          {gameState.diceResults.map((result, index) => (
            <button
              key={`${result}-${index}`}
              className={`die ${result} ${selectedDice.includes(index) ? 'selected' : ''}`}
              onClick={() => toggleDieSelection(index)}
              disabled={gameState.gameEnded || gameState.rerollsLeft === 0}
              type="button"
            >
              {result}
            </button>
          ))}
          {gameState.diceResults.length === 0 && <p>No dice rolled yet.</p>}
        </div>
      </section>

      <section className="panel button-row">
        <button onClick={() => dispatch({ type: 'FEED_POPULATION' })} disabled={gameState.gameEnded}>
          Feed Population
        </button>
        <button onClick={() => dispatch({ type: 'END_TURN' })} disabled={gameState.gameEnded}>
          End Turn
        </button>
      </section>

      <section className="panel">
        <h2>Monuments</h2>
        {gameState.monuments.map((monument) => (
          <div key={monument.id} className="list-item">
            <span>
              {monument.name}: {monument.currentWorkers}/{monument.requiredWorkers}
            </span>
            <button
              onClick={() => dispatch({ type: 'BUILD_MONUMENT', monumentId: monument.id })}
              disabled={gameState.gameEnded || !!monument.completedBy || gameState.workers === 0}
            >
              {monument.completedBy ? 'Completed' : 'Build'}
            </button>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Developments</h2>
        {gameState.developments.map((development) => (
          <div key={development.id} className="list-item">
            <span>
              {development.name} ({development.cost} coins, {development.points} pts)
            </span>
            <button
              onClick={() => dispatch({ type: 'BUY_DEVELOPMENT', developmentId: development.id })}
              disabled={gameState.gameEnded || development.owned || gameState.coins < development.cost}
            >
              {development.owned ? 'Owned' : 'Buy'}
            </button>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Goods Track</h2>
        <p>
          Wood: {gameState.goods.wood} | Stone: {gameState.goods.stone} | Pottery: {gameState.goods.pottery} |
          Cloth: {gameState.goods.cloth} | Spears: {gameState.goods.spears}
        </p>
      </section>

      <section className="panel message">
        <strong>Status:</strong> {gameState.message}
      </section>

      {gameState.gameEnded && (
        <section className="panel game-end">
          <h2>Game Over</h2>
          <p>Final score: {gameState.score}</p>
          <p>
            Monuments completed: {completedMonuments}, Developments owned: {ownedDevelopments}
          </p>
        </section>
      )}
    </main>
  )
}

export default App
