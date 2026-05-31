import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { GameState, Die, ResourceState, Development } from './types';
import { getStartingState, getResourceLimits } from './utils/gameDefaults';
import audio from './utils/audio';

// Components
import TurnConsole from './components/TurnConsole';
import DiceTray from './components/DiceTray';
import ResourcesPanel from './components/ResourcesPanel';
import ScoreSheet from './components/ScoreSheet';
import RulesSection from './components/RulesSection';
import StatusModal from './components/StatusModal';

export default function App() {
  // Master Game State
  const [gameState, setGameState] = useState<GameState>(getStartingState());
  const [dice, setDice] = useState<Die[]>([]);

  // UI Modals
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    rolledCoins: number;
    gainedFood: number;
    gainedWorkers: number;
    foodOrWorkerDiceCount: number;
    gainedGoodsItems: string[];
    disasterTriggered: string;
    targetDisasterPts: number;
    nextResources: ResourceState;
    skullCount: number;
  } | null>(null);

  const [foodChoiceCount, setFoodChoiceCount] = useState(0);

  // Leadership skill variables
  const [hasRerolledSkullThisTurn, setHasRerolledSkullThisTurn] = useState(false);

  // Rival AI processing states
  const [isRivalThinking, setIsRivalThinking] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [rivalTurnLogs, setRivalTurnLogs] = useState<string[]>([]);
  const [pendingNextState, setPendingNextState] = useState<GameState | null>(null);

  // Development Purchase Modal States
  const [activePurchaseDev, setActivePurchaseDev] = useState<Development | null>(null);
  const [selectedGoodsToSpend, setSelectedGoodsToSpend] = useState<Record<string, boolean>>({
    wood: false,
    stone: false,
    pottery: false,
    cloth: false,
    spear: false,
  });
  const [lastPurchaseRefund, setLastPurchaseRefund] = useState<{
    devId: string;
    coinsRefund: number;
    goodsRefund: {
      wood: number;
      stone: number;
      pottery: number;
      cloth: number;
      spear: number;
    };
  } | null>(null);

  // Custom Modal dialog states and helper functions
  interface ModalConfig {
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
  }
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const triggerAlert = (title: string, message: string, onConfirm?: () => void) => {
    setModal({
      title,
      message,
      type: 'alert',
      onConfirm: onConfirm || (() => {}),
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setModal({
      title,
      message,
      type: 'confirm',
      onConfirm,
      onCancel,
    });
  };

  // Load state from localStorage on startup and handle audio resume
  useEffect(() => {
    const saved = localStorage.getItem('bronze_age_score_sheet_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGameState(parsed);
        if (parsed && parsed.isMuted !== undefined) {
          audio.isMuted = parsed.isMuted;
        }
      } catch (e) {
        // Fallback to defaults
      }
    }

    const handleFirstInteraction = () => {
      audio.init(); // Synchronously unlock AudioContext within a user gesture callback
      // If we have saved state, respect the unmuted state, otherwise start muted
      let isUnmuted = false;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && !parsed.isMuted) {
            isUnmuted = true;
          }
        } catch (e) {}
      }
      if (isUnmuted) {
        audio.startMusic();
      }
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  // Save state on change
  const saveState = (newState: GameState) => {
    localStorage.setItem('bronze_age_score_sheet_state', JSON.stringify(newState));
  };

  // Score Calculator based on developments & monuments
  const computeScore = (state: GameState): number => {
    const monPts = state.monuments.reduce((acc, m) => {
      if (m.completedByPlayer) {
        return acc + (m.completedByAI ? m.otherPoints : m.firstPoints);
      }
      return acc;
    }, 0);

    const devPts = state.developments.reduce((acc, d) => {
      return acc + (d.purchased ? d.points : 0);
    }, 0);

    // Education booster: +1 bonus pt per purchased development
    const hasEducation = state.developments.find((d) => d.id === 'education')?.purchased;
    const boughtDevsCount = state.developments.filter((d) => d.purchased).length;
    const educationBonus = hasEducation ? boughtDevsCount : 0;

    // Empire booster: +2 bonus pts per city size
    const hasEmpire = state.developments.find((d) => d.id === 'empire')?.purchased;
    const citySize = state.cities.count;
    const empireBonus = hasEmpire ? citySize * 2 : 0;

    return monPts + devPts + educationBonus + empireBonus - state.disasterPoints;
  };

  // Unified Game State Updater that also keeps playerStates in sync
  const updateGameState = (nextState: GameState) => {
    const finalScore = computeScore(nextState);
    const updatedState = { ...nextState, score: finalScore };

    if (updatedState.playerCount && updatedState.playerCount > 1 && updatedState.playerStates) {
      const idx = updatedState.activePlayerIndex ?? 0;
      const active = updatedState.playerStates[idx];
      updatedState.playerStates[idx] = {
        ...active,
        resources: updatedState.resources,
        cities: updatedState.cities,
        monuments: updatedState.monuments,
        developments: updatedState.developments,
        disasterPoints: updatedState.disasterPoints,
        score: finalScore,
        history: updatedState.history,
      };
    }

    setGameState(updatedState);
    saveState(updatedState);
  };

  const handleStartSetup = (mode: 'solo' | 'solo_ai' | 'hotseat_2' | 'hotseat_3') => {
    audio.playChime();
    if (!gameState.isMuted) {
      audio.startMusic();
    }
    const fresh = { ...getStartingState(), isMuted: gameState.isMuted };

    if (mode === 'solo') {
      const nextState: GameState = {
        ...fresh,
        setupCompleted: true,
        gameMode: 'solo',
        playerCount: 1,
        activePlayerIndex: 0,
        playerStates: [],
      };
      setGameState(nextState);
      saveState(nextState);
      setHasRerolledSkullThisTurn(false);
      generateStartingDice(nextState.cities.count);
    } else if (mode === 'solo_ai') {
      const playerStates = Array.from({ length: 2 }).map((_, i) => {
        const playerFresh = getStartingState();
        return {
          name: i === 0 ? 'Player 1 (You)' : 'AI Rival',
          resources: playerFresh.resources,
          cities: playerFresh.cities,
          monuments: playerFresh.monuments,
          developments: playerFresh.developments,
          disasterPoints: playerFresh.disasterPoints,
          score: playerFresh.score,
          history: [`Turn 1: Player ${i + 1}'s game started.`],
          workers: playerFresh.workers,
          coins: playerFresh.coins,
          boughtDevelopmentThisTurn: playerFresh.boughtDevelopmentThisTurn,
        };
      });

      const activeState = playerStates[0];
      const nextState: GameState = {
        ...fresh,
        setupCompleted: true,
        gameMode: 'solo_ai',
        playerCount: 2,
        activePlayerIndex: 0,
        playerStates,
        resources: activeState.resources,
        cities: activeState.cities,
        monuments: activeState.monuments,
        developments: activeState.developments,
        disasterPoints: activeState.disasterPoints,
        score: activeState.score,
        history: activeState.history,
      };

      setGameState(nextState);
      saveState(nextState);
      setHasRerolledSkullThisTurn(false);
      generateStartingDice(nextState.cities.count);
    } else {
      const count = mode === 'hotseat_2' ? 2 : 3;
      const playerStates = Array.from({ length: count }).map((_, i) => {
        const playerFresh = getStartingState();
        return {
          name: `Player ${i + 1}`,
          resources: playerFresh.resources,
          cities: playerFresh.cities,
          monuments: playerFresh.monuments,
          developments: playerFresh.developments,
          disasterPoints: playerFresh.disasterPoints,
          score: playerFresh.score,
          history: [`Turn 1: Player ${i + 1}'s game started.`],
          workers: playerFresh.workers,
          coins: playerFresh.coins,
          boughtDevelopmentThisTurn: playerFresh.boughtDevelopmentThisTurn,
        };
      });

      const activeState = playerStates[0];
      const nextState: GameState = {
        ...fresh,
        setupCompleted: true,
        gameMode: 'hotseat',
        playerCount: count,
        activePlayerIndex: 0,
        playerStates,
        resources: activeState.resources,
        cities: activeState.cities,
        monuments: activeState.monuments,
        developments: activeState.developments,
        disasterPoints: activeState.disasterPoints,
        score: activeState.score,
        history: activeState.history,
      };

      setGameState(nextState);
      saveState(nextState);
      setHasRerolledSkullThisTurn(false);
      generateStartingDice(nextState.cities.count);
    }
  };

  // Re-generate dice when turn restarts or city count changes
  useEffect(() => {
    if (gameState.phase === 'roll' && dice.length === 0) {
      const activeCitiesCount = gameState.cities.count;
      generateStartingDice(activeCitiesCount);
    }
  }, [gameState.phase, gameState.cities.count, dice.length]);

  const generateStartingDice = (count: number) => {
    const initialDice: Die[] = Array.from({ length: count }, (_, idx) => ({
      id: idx + 1,
      value: 'empty',
      kept: false,
      rolling: false,
    }));
    setDice(initialDice);
  };

  // Sound triggers
  const handleToggleMusic = () => {
    const nextMuted = !gameState.isMuted;
    const nextState = { ...gameState, isMuted: nextMuted };
    updateGameState(nextState);

    if (nextMuted) {
      audio.stopMusic();
    } else {
      audio.startMusic();
    }
  };

  const handleRestart = () => {
    triggerConfirm(
      'Reset Scoreboard?',
      'Are you sure you want to reset the scoreboard? All progress will be cleared.',
      () => {
        audio.playChime();
        const fresh = { ...getStartingState(), isMuted: gameState.isMuted };
        const nextState: GameState = {
          ...fresh,
          setupCompleted: false,
          playerCount: 1,
          activePlayerIndex: 0,
          playerStates: [],
        };
        setGameState(nextState);
        saveState(nextState);
        setHasRerolledSkullThisTurn(false);
        setDice([]);
      }
    );
  };

  const handleForceRestart = () => {
    audio.playChime();
    const fresh = { ...getStartingState(), isMuted: gameState.isMuted };
    const nextState: GameState = {
      ...fresh,
      setupCompleted: false,
      playerCount: 1,
      activePlayerIndex: 0,
      playerStates: [],
    };
    setGameState(nextState);
    saveState(nextState);
    setHasRerolledSkullThisTurn(false);
    setDice([]);
  };

  const getGameOverStandings = () => {
    if (gameState.playerStates && gameState.playerStates.length > 0) {
      return gameState.playerStates.map((p, idx) => {
        const name = gameState.gameMode === 'solo_ai' && idx === 1 ? "Rival AI" : `Player ${idx + 1}`;
        return {
          name,
          score: p.score,
          monuments: p.monuments,
          developments: p.developments,
          citiesCount: p.cities.count,
          disasterPoints: p.disasterPoints,
        };
      }).sort((a, b) => b.score - a.score);
    }
    // Solo solitaire
    return [
      {
        name: "Human Player",
        score: gameState.score,
        monuments: gameState.monuments,
        developments: gameState.developments,
        citiesCount: gameState.cities.count,
        disasterPoints: gameState.disasterPoints,
      }
    ];
  };

  // Dice Actions
  const handleToggleKeep = (dieId: number) => {
    if (gameState.phase !== 'roll') return;

    setDice((prev) =>
      prev.map((d) => {
        if (d.id === dieId) {
          if (d.value === 'empty') return d; // cannot keep unrolled dice
          // Skulls cannot be kept or rerolled in Alea Imperii by default!
          if (d.value === 'skull') {
            audio.playClick();
            return d; // locked
          }
          audio.playClick();
          return { ...d, kept: !d.kept };
        }
        return d;
      })
    );
  };

  // Special Leadership effect: reroll a single skull once per turn
  const handleRerollSkull = (dieId: number) => {
    if (gameState.phase !== 'roll' || hasRerolledSkullThisTurn) return;

    audio.playDiceRoll();
    setHasRerolledSkullThisTurn(true);
    setDice((prev) =>
      prev.map((d) => {
        if (d.id === dieId) {
          const faces: Die['value'][] = ['food', 'goods', 'skull', 'worker', 'food_or_worker', 'coin'];
          const randVal = faces[Math.floor(Math.random() * faces.length)];
          return {
            ...d,
            value: randVal,
            kept: false, // reset keep for the rerolled slot
            rolling: true,
          };
        }
        return d;
      })
    );

    // Stop rolling animation shortly
    setTimeout(() => {
      setDice((prev) => prev.map((d) => (d.id === dieId ? { ...d, rolling: false } : d)));
    }, 500);

    const updatedState = {
      ...gameState,
      recentStatus: 'Used leadership development to successfully reroll a disaster skull!',
    };
    updateGameState(updatedState);
  };

  const handleRollDice = () => {
    if (gameState.phase !== 'roll' || gameState.rollsLeft <= 0) return;

    audio.playDiceRoll();

    setDice((prev) =>
      prev.map((d) => {
        if (d.kept || d.value === 'skull') {
          return d; // Do not reroll kept or skulls
        }

        const faces: Die['value'][] = ['food', 'goods', 'skull', 'worker', 'food_or_worker', 'coin'];
        const randVal = faces[Math.floor(Math.random() * faces.length)];

        return {
          ...d,
          value: randVal,
          rolling: true,
        };
      })
    );

    // Fade rolling flags
    setTimeout(() => {
      setDice((prev) => prev.map((d) => ({ ...d, rolling: false })));
    }, 500);

    const nextRolls = gameState.rollsLeft - 1;
    const desc = `Player rerolled unkept dice. ${nextRolls} roll attempts remain for this turn.`;

    const updatedState = {
      ...gameState,
      rollsLeft: nextRolls,
      recentStatus: desc,
    };
    updateGameState(updatedState);
  };

  // Auto Evaluate Rolls upon Done Rolling
  const handleDoneRolling = () => {
    if (gameState.phase !== 'roll') return;

    if (gameState.rollsLeft === 3 || dice.some((d) => d.value === 'empty')) {
      triggerAlert("Roll Dice First", "You must roll the dice at least once before finalizing your turn's rolls!");
      return;
    }

    audio.playChime();

    // Sum up roll outputs
    let rolledCoins = 0;
    let gainedFood = 0;
    let gainedWorkers = 0;
    let goodsCount = 0;
    let skullCount = 0;
    let foodOrWorkerDiceCount = 0;

    // Check development modifiers
    const hasAgriculture = gameState.developments.find((d) => d.id === 'agriculture')?.purchased;
    const hasMasonry = gameState.developments.find((d) => d.id === 'masonry')?.purchased;
    const hasCoinage = gameState.developments.find((d) => d.id === 'coinage')?.purchased;

    dice.forEach((die) => {
      switch (die.value) {
        case 'food':
          gainedFood += hasAgriculture ? 4 : 3;
          break;
        case 'goods':
          goodsCount += 1;
          break;
        case 'skull':
          // Authentic rules: +2 goods, +1 skull (locked)
          goodsCount += 2;
          skullCount += 1;
          break;
        case 'worker':
          gainedWorkers += hasMasonry ? 4 : 3;
          break;
        case 'food_or_worker':
          foodOrWorkerDiceCount += 1;
          break;
        case 'coin':
          rolledCoins += hasCoinage ? 12 : 7;
          break;
      }
    });

    // Goods resolution: Goods faces rolled give resources sequentially Wood -> Stone -> Pottery -> Cloth -> Spear
    const gainedGoodsItems: string[] = [];
    const limits = getResourceLimits();
    const tempResources = { ...gameState.resources };

    const goodsOrder: Array<keyof ResourceState> = ['wood', 'stone', 'pottery', 'cloth', 'spear'];
    const goodsDisplayNames = {
      wood: 'Wood',
      stone: 'Stone',
      pottery: 'Pottery',
      cloth: 'Cloth',
      spear: 'Spears',
    };

    let currentGoodsSlotIndex = 0;
    const hasQuarrying = gameState.developments.find((d) => d.id === 'quarrying')?.purchased;

    for (let g = 0; g < goodsCount; g++) {
      const resourceKey = goodsOrder[currentGoodsSlotIndex];
      const maxVal = limits[resourceKey];

      if (tempResources[resourceKey] < maxVal) {
        tempResources[resourceKey] += 1;
        gainedGoodsItems.push(goodsDisplayNames[resourceKey]);
        
        // Quarrying bonus: +1 stone whenever stone is resolved
        if (resourceKey === 'stone' && hasQuarrying && tempResources.stone < limits.stone) {
          tempResources.stone += 1;
          gainedGoodsItems.push('Stone (+1 extra Quarrying)');
        }
      }
      
      currentGoodsSlotIndex = (currentGoodsSlotIndex + 1) % goodsOrder.length;
    }

    // Disaster Skull logic
    let disasterTriggered = 'None';
    let targetDisasterPts = 0;

    const hasIrrigation = gameState.developments.find((d) => d.id === 'irrigation')?.purchased;
    const hasMedicine = gameState.developments.find((d) => d.id === 'medicine')?.purchased;
    const greatWallBuilt = gameState.monuments.find((m) => m.id === 'great_wall')?.completedByPlayer;
    const hasReligion = gameState.developments.find((d) => d.id === 'religion')?.purchased;

    const isMultiplayer = gameState.playerCount && gameState.playerCount > 1;

    if (skullCount === 2) {
      if (hasIrrigation) {
        disasterTriggered = 'Drought (-2 pts averted by Irrigation!)';
      } else {
        disasterTriggered = 'Drought (Lose 2 pts)';
        targetDisasterPts = 2;
      }
    } else if (skullCount === 3) {
      if (!isMultiplayer) {
        if (hasMedicine) {
          disasterTriggered = 'Epidemic (-3 pts averted by Medicine!)';
        } else {
          disasterTriggered = 'Epidemic (Lose 3 pts)';
          targetDisasterPts = 3;
        }
      } else {
        disasterTriggered = 'Epidemic (Opponents suffer Pestilence: -3 disaster points, unless they have Medicine!)';
      }
    } else if (skullCount === 4) {
      if (!isMultiplayer) {
        if (greatWallBuilt) {
          disasterTriggered = 'Invasion (-4 pts averted by Great Wall!)';
        } else {
          disasterTriggered = 'Invasion (Lose 4 pts)';
          targetDisasterPts = 4;
        }
      } else {
        disasterTriggered = 'Invasion (Opponents suffer Invasion: -4 disaster points, unless they completed the Great Wall!)';
      }
    } else if (skullCount >= 5) {
      if (!isMultiplayer) {
        if (hasReligion) {
          disasterTriggered = 'Revolt (Averted by Religion!)';
        } else {
          disasterTriggered = 'Revolt (All non-food goods tracks reset to 0!)';
          // Revolt wipes goods for active player
          tempResources.wood = 0;
          tempResources.stone = 0;
          tempResources.pottery = 0;
          tempResources.cloth = 0;
          tempResources.spear = 0;
        }
      } else {
        disasterTriggered = 'Revolt (Opponents suffer Revolt: lost all non-food goods, unless they have Religion!)';
      }
    }

    // Log the summary and show dialog
    setSummaryData({
      rolledCoins,
      gainedFood,
      gainedWorkers,
      foodOrWorkerDiceCount,
      gainedGoodsItems,
      disasterTriggered,
      targetDisasterPts,
      nextResources: tempResources,
      skullCount,
    });
    setFoodChoiceCount(0); // reset choice split to food = 0, rest = workers
    setShowSummaryModal(true);
  };

  const handleApplySummaryAndFeed = () => {
    if (!summaryData) return;

    const limits = getResourceLimits();
    const nextResources = { ...summaryData.nextResources };

    const hasAgriculture = gameState.developments.find((d) => d.id === 'agriculture')?.purchased;
    const hasMasonry = gameState.developments.find((d) => d.id === 'masonry')?.purchased;

    // Calculate choice dice assignments
    const workerChoiceCount = summaryData.foodOrWorkerDiceCount - foodChoiceCount;
    const choiceFoodGained = foodChoiceCount * (hasAgriculture ? 3 : 2);
    const choiceWorkersGained = workerChoiceCount * (hasMasonry ? 3 : 2);

    const totalFoodYield = summaryData.gainedFood + choiceFoodGained;
    const totalWorkersYield = summaryData.gainedWorkers + choiceWorkersGained;

    // Apply food
    nextResources.food = Math.min(limits.food, nextResources.food + totalFoodYield);

    // Feed Cities phase calculation
    const cityFeedRequired = gameState.cities.count;
    let starvationPenalty = 0;
    let currentFood = nextResources.food;

    if (currentFood >= cityFeedRequired) {
      currentFood -= cityFeedRequired;
    } else {
      starvationPenalty = cityFeedRequired - currentFood;
      currentFood = 0;
    }

    nextResources.food = currentFood;

    const isMultiplayer = gameState.playerCount && gameState.playerCount > 1;
    let activePlayerDisasterIncrement = starvationPenalty;
    let updatedPlayerStates = gameState.playerStates;

    if (!isMultiplayer) {
      activePlayerDisasterIncrement += summaryData.targetDisasterPts;
    } else {
      // Multiplayer:
      // Drought (2 skulls) affects only the active player who rolled it
      if (summaryData.skullCount === 2) {
        activePlayerDisasterIncrement += summaryData.targetDisasterPts;
      }

      // Epidemic, Invasion, Revolt affects other players (opponents)
      if (updatedPlayerStates) {
        const activeIdx = gameState.activePlayerIndex ?? 0;
        updatedPlayerStates = updatedPlayerStates.map((playerState, idx) => {
          if (idx === activeIdx) return playerState; // Active player handled separately

          let opponentDisasterPts = playerState.disasterPoints;
          let opponentResources = { ...playerState.resources };
          let opponentHistory = [ ...playerState.history ];

          if (summaryData.skullCount === 3) {
            const oppHasMedicine = playerState.developments.find((d) => d.id === 'medicine')?.purchased;
            if (!oppHasMedicine) {
              opponentDisasterPts = Math.min(9, opponentDisasterPts + 3);
              opponentHistory.unshift(`Suffer Epidemic from Player ${activeIdx + 1}'s skulls: +3 disaster points!`);
            } else {
              opponentHistory.unshift(`Epidemic from Player ${activeIdx + 1}'s skulls averted by Medicine.`);
            }
          } else if (summaryData.skullCount === 4) {
            const oppGreatWall = playerState.monuments.find((m) => m.id === 'great_wall')?.completedByPlayer;
            if (!oppGreatWall) {
              opponentDisasterPts = Math.min(9, opponentDisasterPts + 4);
              opponentHistory.unshift(`Suffer Invasion from Player ${activeIdx + 1}'s skulls: +4 disaster points!`);
            } else {
              opponentHistory.unshift(`Invasion from Player ${activeIdx + 1}'s skulls averted by Great Wall.`);
            }
          } else if (summaryData.skullCount >= 5) {
            const oppHasReligion = playerState.developments.find((d) => d.id === 'religion')?.purchased;
            if (!oppHasReligion) {
              opponentResources.wood = 0;
              opponentResources.stone = 0;
              opponentResources.pottery = 0;
              opponentResources.cloth = 0;
              opponentResources.spear = 0;
              opponentHistory.unshift(`Suffer Revolt from Player ${activeIdx + 1}'s skulls: lost all goods!`);
            } else {
              opponentHistory.unshift(`Revolt from Player ${activeIdx + 1}'s skulls averted by Religion.`);
            }
          }

          return {
            ...playerState,
            disasterPoints: opponentDisasterPts,
            resources: opponentResources,
            history: opponentHistory,
          };
        });
      }
    }

    const finalDisastersCount = Math.min(9, gameState.disasterPoints + activePlayerDisasterIncrement);

    // Compute status log
    let reportLog = `Turn ${gameState.turn} Results: Gained +${totalFoodYield} Food, +${totalWorkersYield} Workers. `;
    if (summaryData.gainedGoodsItems.length > 0) {
      reportLog += `Goods awarded: ${summaryData.gainedGoodsItems.join(', ')}. `;
    }
    if (starvationPenalty > 0) {
      reportLog += `Starvation! Missing ${starvationPenalty} food caused +${starvationPenalty} Disaster Point(s). `;
    }
    if (summaryData.skullCount === 2 && summaryData.targetDisasterPts > 0) {
      reportLog += `Disaster strike: ${summaryData.disasterTriggered} added +${summaryData.targetDisasterPts} Disaster node. `;
    } else if (summaryData.skullCount > 2) {
      reportLog += `Disaster strike: ${summaryData.disasterTriggered}. `;
    }

    // Add extra coins for developments buy phase and unused workers for build phase
    const nextState: GameState = {
      ...gameState,
      phase: 'buy', // Transition into build/buy phase
      resources: nextResources,
      workers: totalWorkersYield,
      coins: summaryData.rolledCoins,
      disasterPoints: finalDisastersCount,
      playerStates: updatedPlayerStates,
      recentStatus: `Dice resolved. Gained +${totalWorkersYield} Workers to construct cities/monuments and +${summaryData.rolledCoins} temporary coins to buy developments!`,
      history: [reportLog, ...gameState.history],
    };

    updateGameState(nextState);
    setShowSummaryModal(false);
  };





  // Buy developments checkboxes
  const handleToggleDevelopmentPurchase = (devId: string) => {
    const dev = gameState.developments.find((d) => d.id === devId);
    if (!dev) return;

    if (dev.purchased) {
      // Undo purchase if they bought it this turn!
      if (lastPurchaseRefund && lastPurchaseRefund.devId === devId) {
        audio.playClick();
        const nextDevelopments = gameState.developments.map((d) => {
          if (d.id === devId) {
            return { ...d, purchased: false };
          }
          return d;
        });

        // Restore refunded resources
        const nextState: GameState = {
          ...gameState,
          developments: nextDevelopments,
          coins: gameState.coins + lastPurchaseRefund.coinsRefund,
          resources: {
            ...gameState.resources,
            wood: gameState.resources.wood + lastPurchaseRefund.goodsRefund.wood,
            stone: gameState.resources.stone + lastPurchaseRefund.goodsRefund.stone,
            pottery: gameState.resources.pottery + lastPurchaseRefund.goodsRefund.pottery,
            cloth: gameState.resources.cloth + lastPurchaseRefund.goodsRefund.cloth,
            spear: gameState.resources.spear + lastPurchaseRefund.goodsRefund.spear,
          },
          boughtDevelopmentThisTurn: false,
          recentStatus: `Undid purchase of ${dev.name} development. Resources refunded.`,
        };

        setLastPurchaseRefund(null);
        updateGameState(nextState);
      } else {
        triggerAlert("Invalid Action", "You cannot refund a development purchased in previous turns!");
      }
      return;
    }

    // Limit check: only 1 development purchase per turn!
    if (gameState.boughtDevelopmentThisTurn) {
      triggerAlert("Limit Reached", "You can only buy at most 1 development per turn!");
      return;
    }

    // Trigger interactive modal
    setSelectedGoodsToSpend({
      wood: false,
      stone: false,
      pottery: false,
      cloth: false,
      spear: false,
    });
    setActivePurchaseDev(dev);
  };

  const confirmDevelopmentPurchase = () => {
    if (!activePurchaseDev) return;
    audio.playChime();

    const cost = activePurchaseDev.cost;
    const goodsValues = {
      wood: 1,
      stone: 2,
      pottery: 3,
      cloth: 4,
      spear: 5,
    };

    let goodsVal = 0;
    const spentGoods = {
      wood: 0,
      stone: 0,
      pottery: 0,
      cloth: 0,
      spear: 0,
    };

    // Calculate value of goods selected to spend
    Object.keys(selectedGoodsToSpend).forEach((key) => {
      const gKey = key as keyof typeof spentGoods;
      if (selectedGoodsToSpend[key]) {
        const count = gameState.resources[gKey];
        goodsVal += count * goodsValues[gKey];
        spentGoods[gKey] = count;
      }
    });

    const totalOffered = gameState.coins + goodsVal;
    if (totalOffered < cost) {
      triggerAlert("Payment Failed", "Not enough coins/goods selected to pay for this development!");
      return;
    }

    // Calculate coin deduction
    const deficit = cost - goodsVal;
    const finalCoins = Math.max(0, gameState.coins - deficit);
    const coinsDeducted = gameState.coins - finalCoins;

    // Build next resources with spent goods cleared to 0
    const nextResources = { ...gameState.resources };
    Object.keys(selectedGoodsToSpend).forEach((key) => {
      const gKey = key as keyof typeof spentGoods;
      if (selectedGoodsToSpend[key]) {
        nextResources[gKey] = 0;
      }
    });

    const nextDevelopments = gameState.developments.map((d) => {
      if (d.id === activePurchaseDev.id) {
        return { ...d, purchased: true };
      }
      return d;
    });

    const nextState: GameState = {
      ...gameState,
      developments: nextDevelopments,
      resources: nextResources,
      coins: finalCoins,
      boughtDevelopmentThisTurn: true,
      recentStatus: `Purchased ${activePurchaseDev.name} development for ${cost} coins.`,
      history: [
        `Turn ${gameState.turn}: Purchased ${activePurchaseDev.name} development.`,
        ...gameState.history,
      ],
    };

    setLastPurchaseRefund({
      devId: activePurchaseDev.id,
      coinsRefund: coinsDeducted,
      goodsRefund: spentGoods,
    });

    setActivePurchaseDev(null);
    updateGameState(nextState);
  };

  // Helper for city required boxes
  const getCityRequiredBoxes = (cityNum: number): number => {
    switch (cityNum) {
      case 4: return 2;
      case 5: return 3;
      case 6: return 4;
      case 7: return 5;
      default: return 0;
    }
  };

  // Cities toggle handler - permits undoing a completed city!
  const handleToggleCity = (cityNum: number) => {
    if (cityNum === gameState.cities.count && cityNum > 3) {
      audio.playClick();
      const prevCityNum = cityNum - 1;
      const prevRequired = getCityRequiredBoxes(cityNum);
      const nextState = {
        ...gameState,
        cities: {
          count: prevCityNum,
          progress: prevRequired - 1, // Reset progress to 1 slot shy of complete
        },
        workers: gameState.workers + 1, // refund the 1 worker that completed it
        recentStatus: `Undid City ${cityNum} completion. 1 worker refunded.`,
      };
      updateGameState(nextState);
    }
  };

  // Cities progress boxes checklist toggling
  const handleToggleCityProgress = (slotIdx: number) => {
    const nextCityNum = gameState.cities.count + 1;
    if (nextCityNum > 7) return; // already maximum cities completed

    const currentProgress = gameState.cities.progress;

    let nextChecked = slotIdx < currentProgress ? slotIdx : slotIdx + 1;
    const delta = nextChecked - currentProgress;

    if (delta <= 0) {
      // Unchecking/reducing is always free, no confirmation needed
      applyCityProgressToggle(nextChecked, 0, 0);
      return;
    }

    // Checking boxes
    const availableWorkers = gameState.workers;
    const currentStone = gameState.resources.stone;
    const hasEngineering = gameState.developments.find((d) => d.id === 'engineering')?.purchased;

    if (availableWorkers < delta && hasEngineering && currentStone > 0) {
      const deficit = delta - availableWorkers;
      const stoneToSpend = Math.min(currentStone, Math.ceil(deficit / 3));
      const workersGained = stoneToSpend * 3;

      triggerConfirm(
        "Use Engineering?",
        `Spend ${stoneToSpend} stone for +${workersGained} workers to build this city?`,
        () => {
          applyCityProgressToggle(nextChecked, stoneToSpend, workersGained);
        },
        () => {
          applyCityProgressToggle(nextChecked, 0, 0);
        }
      );
    } else {
      applyCityProgressToggle(nextChecked, 0, 0);
    }
  };

  const applyCityProgressToggle = (nextChecked: number, stoneSpent: number, workersGained: number) => {
    const nextCityNum = gameState.cities.count + 1;
    if (nextCityNum > 7) return;

    const requiredBoxes = getCityRequiredBoxes(nextCityNum);
    const currentProgress = gameState.cities.progress;
    let availableWorkers = gameState.workers + workersGained;
    let currentStone = gameState.resources.stone - stoneSpent;
    const delta = nextChecked - currentProgress;

    let finalNextChecked = nextChecked;
    if (delta > 0 && availableWorkers < delta) {
      const maxAffordable = availableWorkers;
      if (maxAffordable <= 0) {
        triggerAlert("Not Enough Workers", "Not enough workers! Roll worker faces or spend stone with Engineering.");
        return;
      }
      finalNextChecked = currentProgress + maxAffordable;
    }

    const finalDelta = finalNextChecked - currentProgress;
    audio.playClick();

    let nextProgress = finalNextChecked;
    let nextCityCount = gameState.cities.count;
    let statusText = "";

    if (finalDelta > 0) {
      statusText = `Assigned ${finalDelta} worker(s) to build City ${nextCityNum}.`;
      if (nextProgress >= requiredBoxes) {
        nextCityCount += 1;
        nextProgress = 0;
        audio.playChime();
        statusText = `City ${nextCityNum} completed! You gain +1 die next turn.`;
      }
    } else if (finalDelta < 0) {
      statusText = `Removed ${Math.abs(finalDelta)} worker assignment(s) from City ${nextCityNum}. ${Math.abs(finalDelta)} worker(s) refunded.`;
    }

    const stoneSpentText = stoneSpent > 0 
      ? ` Spent ${stoneSpent} stone (Engineering dev) to gain +${workersGained} workers.` 
      : "";

    const nextState = {
      ...gameState,
      cities: {
        count: nextCityCount,
        progress: nextProgress,
      },
      workers: delta > 0 ? availableWorkers - finalDelta : gameState.workers - finalDelta,
      resources: {
        ...gameState.resources,
        stone: currentStone,
      },
      recentStatus: stoneSpent > 0 ? `${statusText}${stoneSpentText}` : statusText,
    };
    updateGameState(nextState);
  };

  // Monuments checkboxes
  const handleToggleMonumentSlot = (monumentId: string, slotIndex: number) => {
    const targetMonument = gameState.monuments.find((m) => m.id === monumentId);
    if (!targetMonument) return;

    let nextChecked = slotIndex < targetMonument.checkedSlots ? slotIndex : slotIndex + 1;
    const delta = nextChecked - targetMonument.checkedSlots;

    if (delta <= 0) {
      // Unchecking/reducing is always free, no confirmation needed
      applyMonumentToggle(monumentId, nextChecked, 0, 0);
      return;
    }

    // Checking boxes
    const availableWorkers = gameState.workers;
    const currentStone = gameState.resources.stone;
    const hasEngineering = gameState.developments.find((d) => d.id === 'engineering')?.purchased;

    if (availableWorkers < delta && hasEngineering && currentStone > 0) {
      const deficit = delta - availableWorkers;
      const stoneToSpend = Math.min(currentStone, Math.ceil(deficit / 3));
      const workersGained = stoneToSpend * 3;

      triggerConfirm(
        "Use Engineering?",
        `Spend ${stoneToSpend} stone for +${workersGained} workers to build this monument?`,
        () => {
          applyMonumentToggle(monumentId, nextChecked, stoneToSpend, workersGained);
        },
        () => {
          applyMonumentToggle(monumentId, nextChecked, 0, 0);
        }
      );
    } else {
      applyMonumentToggle(monumentId, nextChecked, 0, 0);
    }
  };

  const applyMonumentToggle = (monumentId: string, nextChecked: number, stoneSpent: number, workersGained: number) => {
    const targetMonument = gameState.monuments.find((m) => m.id === monumentId);
    if (!targetMonument) return;

    let availableWorkers = gameState.workers + workersGained;
    let currentStone = gameState.resources.stone - stoneSpent;
    const delta = nextChecked - targetMonument.checkedSlots;

    let finalNextChecked = nextChecked;
    if (delta > 0 && availableWorkers < delta) {
      const maxAffordable = availableWorkers;
      if (maxAffordable <= 0) {
        triggerAlert("Not Enough Workers", "Not enough workers! Roll worker faces or spend stone with Engineering.");
        return;
      }
      finalNextChecked = targetMonument.checkedSlots + maxAffordable;
    }

    const finalDelta = finalNextChecked - targetMonument.checkedSlots;
    audio.playClick();

    const nextMonuments = gameState.monuments.map((m) => {
      if (m.id === monumentId) {
        const isCompletedNow = finalNextChecked >= m.slots;
        let completedByPlayer = m.completedByPlayer;
        let completedByAI = m.completedByAI;

        if (isCompletedNow && !m.completedByPlayer) {
          const isMulti = gameState.playerCount && gameState.playerCount > 1;
          if (isMulti && gameState.playerStates) {
            const anyoneElseCompleted = gameState.playerStates.some(
              (p, idx) =>
                idx !== gameState.activePlayerIndex &&
                p.monuments.find((pm) => pm.id === monumentId)?.completedByPlayer
            );
            completedByPlayer = true;
            completedByAI = anyoneElseCompleted;
          } else {
            completedByPlayer = true;
            completedByAI = false;
          }
        } else if (!isCompletedNow) {
          completedByPlayer = false;
          completedByAI = false;
        }

        return {
          ...m,
          checkedSlots: finalNextChecked,
          completedByPlayer,
          completedByAI,
        };
      }
      return m;
    });

    const isNowCompleted = finalNextChecked >= targetMonument.slots && !targetMonument.completedByPlayer;
    let statusText = finalDelta > 0 
      ? `Assigned ${finalDelta} worker(s) to build ${targetMonument.name}.`
      : `Removed ${Math.abs(finalDelta)} worker assignment(s) from ${targetMonument.name}. ${Math.abs(finalDelta)} worker(s) refunded.`;

    if (isNowCompleted) {
      statusText = `Completed ${targetMonument.name}! Gained victory points.`;
      audio.playChime();
    }

    const nextState = {
      ...gameState,
      monuments: nextMonuments,
      workers: finalDelta > 0 ? availableWorkers - finalDelta : gameState.workers - finalDelta,
      resources: {
        ...gameState.resources,
        stone: currentStone,
      },
      recentStatus: stoneSpent > 0 
        ? `${statusText} Spent ${stoneSpent} stone (Engineering dev) to gain +${workersGained} workers.` 
        : statusText,
    };

    const isMulti = gameState.playerCount && gameState.playerCount > 1;
    if (isMulti && nextState.playerStates) {
      const activeIdx = nextState.activePlayerIndex ?? 0;
      const targetMon = nextMonuments.find((m) => m.id === monumentId);
      if (targetMon && targetMon.completedByPlayer && !targetMon.completedByAI) {
        nextState.playerStates = nextState.playerStates.map((p, idx) => {
          if (idx === activeIdx) return p;
          const updatedMons = p.monuments.map((pm) => {
            if (pm.id === monumentId) {
              return { ...pm, completedByAI: true };
            }
            return pm;
          });
          return { ...p, monuments: updatedMons };
        });
      } else if (targetMon && !targetMon.completedByPlayer) {
        const anyoneElseCompleted = nextState.playerStates.some(
          (p, idx) =>
            idx !== activeIdx &&
            p.monuments.find((pm) => pm.id === monumentId)?.completedByPlayer
        );
        if (!anyoneElseCompleted) {
          nextState.playerStates = nextState.playerStates.map((p, idx) => {
            if (idx === activeIdx) return p;
            const updatedMons = p.monuments.map((pm) => {
              if (pm.id === monumentId) {
                return { ...pm, completedByAI: false };
              }
              return pm;
            });
            return { ...p, monuments: updatedMons };
          });
        }
      }
    }

    updateGameState(nextState);
  };

  // Claim First vs Other Monument builder manually
  const handleToggleMonumentBonus = (
    monumentId: string,
    type: 'first' | 'other' | 'none'
  ) => {
    audio.playChime();
    const nextMonuments = gameState.monuments.map((m) => {
      if (m.id === monumentId) {
        if (type === 'first') {
          return { ...m, completedByPlayer: true, completedByAI: false };
        } else if (type === 'other') {
          return { ...m, completedByPlayer: true, completedByAI: true };
        } else {
          return { ...m, completedByPlayer: false, completedByAI: false };
        }
      }
      return m;
    });

    const nextState = { ...gameState, monuments: nextMonuments };

    const isMulti = gameState.playerCount && gameState.playerCount > 1;
    if (isMulti && nextState.playerStates) {
      const activeIdx = nextState.activePlayerIndex ?? 0;
      nextState.playerStates = nextState.playerStates.map((p, idx) => {
        if (idx === activeIdx) return p;
        const updatedMons = p.monuments.map((pm) => {
          if (pm.id === monumentId) {
            if (type === 'first') {
              return { ...pm, completedByAI: true };
            } else if (type === 'none') {
              const anyoneElseCompleted = nextState.playerStates?.some(
                (op, oIdx) =>
                  oIdx !== idx &&
                  op.monuments.find((opm) => opm.id === monumentId)?.completedByPlayer
              );
              return { ...pm, completedByAI: anyoneElseCompleted ?? false };
            }
          }
          return pm;
        });
        return { ...p, monuments: updatedMons };
      });
    }

    updateGameState(nextState);
  };

  // End Turn Event
  const handleEndTurn = () => {
    audio.playChime();

    if (gameState.workers > 0) {
      triggerConfirm(
        'Unassigned Workers',
        `You have ${gameState.workers} unassigned worker(s)! Ending your turn now will forfeit them. End turn anyway?`,
        () => {
          proceedWithEndTurnCheck();
        }
      );
    } else {
      proceedWithEndTurnCheck();
    }
  };

  const proceedWithEndTurnCheck = () => {
    const hasCaravans = gameState.developments.find((d) => d.id === 'caravans')?.purchased;
    const currentGoodsTotal =
      gameState.resources.wood +
      gameState.resources.stone +
      gameState.resources.pottery +
      gameState.resources.cloth +
      gameState.resources.spear;

    if (!hasCaravans && currentGoodsTotal > 6) {
      triggerConfirm(
        'Discard Excess Goods?',
        `You currently hold ${currentGoodsTotal} goods. Since you don't possess the Caravans development, you must discard down to 6 total goods! Discard excess now?`,
        () => {
          const trimmed = { ...gameState.resources };
          let count = currentGoodsTotal;
          while (count > 6) {
            if (trimmed.spear > 0) {
              trimmed.spear--;
            } else if (trimmed.cloth > 0) {
              trimmed.cloth--;
            } else if (trimmed.pottery > 0) {
              trimmed.pottery--;
            } else if (trimmed.stone > 0) {
              trimmed.stone--;
            } else if (trimmed.wood > 0) {
              trimmed.wood--;
            } else {
              break;
            }
            count--;
          }

          const nextState = {
            ...gameState,
            resources: trimmed,
            recentStatus: 'Turn ended. Trimmed goods count down to 6 caps.',
          };
          proceedToEndTurn(nextState);
        }
      );
    } else {
      proceedToEndTurn(gameState);
    }
  };

  const checkIsGameOver = (state: GameState): { ended: boolean; reason: string } => {
    // Helper to check monument completion across all players
    const isMonCompletedAnywhere = (monId: string) => {
      if (state.playerStates && state.playerStates.length > 0) {
        return state.playerStates.some(p => {
          const mon = p.monuments.find(m => m.id === monId);
          return mon ? (mon.completedByPlayer || mon.checkedSlots === mon.slots) : false;
        });
      }
      const mon = state.monuments.find(m => m.id === monId);
      return mon ? mon.completedByPlayer : false;
    };

    // Condition 1: All active monuments completed
    const allActiveMonsCompleted = state.monuments.every(m => isMonCompletedAnywhere(m.id));
    if (allActiveMonsCompleted && state.monuments.length > 0) {
      return { ended: true, reason: "All active monuments have been completed!" };
    }

    // Condition 2: 5 developments purchased by any player
    if (state.playerStates && state.playerStates.length > 0) {
      for (let i = 0; i < state.playerStates.length; i++) {
        const p = state.playerStates[i];
        const numDevs = p.developments.filter(d => d.purchased).length;
        if (numDevs >= 5) {
          const playerName = state.gameMode === 'solo_ai' && i === 1 ? "Rival AI" : `Player ${i + 1}`;
          return { ended: true, reason: `${playerName} purchased their 5th development!` };
        }
      }
    } else {
      const numDevs = state.developments.filter(d => d.purchased).length;
      if (numDevs >= 5) {
        return { ended: true, reason: "You purchased your 5th development!" };
      }
    }

    // Condition 3: Solitaire Turn Limit (10 turns/rounds)
    if (state.gameMode === 'solo') {
      if (state.turn >= 10) {
        return { ended: true, reason: "10 rounds have been completed!" };
      }
    }

    return { ended: false, reason: "" };
  };

  const proceedToEndTurn = (stateBeforeEnd: GameState) => {
    if (stateBeforeEnd.gameMode === 'hotseat' && stateBeforeEnd.playerStates) {
      const activeIdx = stateBeforeEnd.activePlayerIndex ?? 0;
      const pCount = stateBeforeEnd.playerCount ?? 2;
      const currentActiveState = stateBeforeEnd.playerStates[activeIdx];

      stateBeforeEnd.playerStates[activeIdx] = {
        ...currentActiveState,
        resources: stateBeforeEnd.resources,
        cities: stateBeforeEnd.cities,
        monuments: stateBeforeEnd.monuments,
        developments: stateBeforeEnd.developments,
        disasterPoints: stateBeforeEnd.disasterPoints,
        score: stateBeforeEnd.score,
        history: stateBeforeEnd.history,
        workers: stateBeforeEnd.workers,
        coins: stateBeforeEnd.coins,
        boughtDevelopmentThisTurn: stateBeforeEnd.boughtDevelopmentThisTurn,
      };

      const nextIdx = (activeIdx + 1) % pCount;
      const nextTurn = nextIdx === 0 ? stateBeforeEnd.turn + 1 : stateBeforeEnd.turn;

      // Check game-over condition at the end of a round (when transitioning back to index 0)
      if (nextIdx === 0) {
        const gameCheck = checkIsGameOver(stateBeforeEnd);
        if (gameCheck.ended) {
          const finalState: GameState = {
            ...stateBeforeEnd,
            phase: 'end',
            recentStatus: `Game Over! ${gameCheck.reason}`,
          };
          setGameState(finalState);
          saveState(finalState);
          return;
        }
      }

      const nextPlayer = stateBeforeEnd.playerStates[nextIdx];
      const nextState: GameState = {
        ...stateBeforeEnd,
        turn: nextTurn,
        phase: 'roll',
        rollsLeft: 3,
        activePlayerIndex: nextIdx,
        resources: nextPlayer.resources,
        cities: nextPlayer.cities,
        monuments: nextPlayer.monuments,
        developments: nextPlayer.developments,
        disasterPoints: nextPlayer.disasterPoints,
        score: nextPlayer.score,
        history: [
          `Turn ${nextTurn}: Player ${nextIdx + 1}'s turn begins.`,
          ...nextPlayer.history,
        ],
        recentStatus: `Player ${nextIdx + 1}'s turn begins. Roll the dice!`,
        workers: 0,
        coins: 0,
        boughtDevelopmentThisTurn: false,
      };

      setGameState(nextState);
      saveState(nextState);
      setHasRerolledSkullThisTurn(false);
      generateStartingDice(nextState.cities.count);
    } else if (stateBeforeEnd.gameMode === 'solo_ai') {
      executeAITurn(stateBeforeEnd);
    } else {
      // Solo High Score Mode: check game over immediately
      const gameCheck = checkIsGameOver(stateBeforeEnd);
      if (gameCheck.ended) {
        const finalState: GameState = {
          ...stateBeforeEnd,
          phase: 'end',
          recentStatus: `Game Over! ${gameCheck.reason}`,
        };
        setGameState(finalState);
        saveState(finalState);
        return;
      }

      const nextTurnCount = stateBeforeEnd.turn + 1;
      const nextState: GameState = {
        ...stateBeforeEnd,
        turn: nextTurnCount,
        phase: 'roll',
        rollsLeft: 3,
        workers: 0,
        coins: 0,
        boughtDevelopmentThisTurn: false,
        recentStatus: `Round ${nextTurnCount} started. Roll the dice!`,
        history: [
          `Turn ${nextTurnCount}: New round started. Roll Phase.`,
          ...stateBeforeEnd.history,
        ],
      };

      setGameState(nextState);
      saveState(nextState);
      setHasRerolledSkullThisTurn(false);
      generateStartingDice(nextState.cities.count);
    }
  };

  // Neighbor AI opponent turn step
  const executeAITurn = (sourceState: GameState) => {
    const aiState = sourceState.playerStates ? sourceState.playerStates[1] : null;
    if (!aiState) return;

    setIsRivalThinking(true);
    setAiProcessing(true);
    setRivalTurnLogs([]);
    setPendingNextState(null);

    const logs: string[] = [];
    logs.push("Rival turn started.");

    let rolledCoins = 0;
    let gainedFood = 0;
    let gainedWorkers = 0;
    let goodsCount = 0;
    let skullCount = 0;
    let foodOrWorkerDiceCount = 0;

    const faces: Die['value'][] = ['food', 'goods', 'skull', 'worker', 'food_or_worker', 'coin'];
    const diceCount = aiState.cities.count;

    // Simulate up to 3 rolls:
    let keptDice: Die['value'][] = [];

    for (let roll = 1; roll <= 3; roll++) {
      const activeCount = diceCount - keptDice.length;
      if (activeCount <= 0) break;

      const newRoll = Array.from({ length: activeCount }, () => faces[Math.floor(Math.random() * faces.length)]);
      const combined = [...keptDice, ...newRoll];

      keptDice = [];

      combined.forEach((face) => {
        if (face === 'skull') {
          keptDice.push(face);
          return;
        }

        if (face === 'goods' || face === 'worker' || face === 'coin') {
          keptDice.push(face);
          return;
        }

        if (face === 'food') {
          if (aiState.resources.food < aiState.cities.count) {
            keptDice.push(face);
            return;
          }
        }

        if (roll === 3) {
          keptDice.push(face);
        }
      });
    }

    const hasAgriculture = aiState.developments.find((d) => d.id === 'agriculture')?.purchased;
    const hasMasonry = aiState.developments.find((d) => d.id === 'masonry')?.purchased;
    const hasCoinage = aiState.developments.find((d) => d.id === 'coinage')?.purchased;

    keptDice.forEach((face) => {
      switch (face) {
        case 'food':
          gainedFood += hasAgriculture ? 4 : 3;
          break;
        case 'goods':
          goodsCount += 1;
          break;
        case 'skull':
          goodsCount += 2;
          skullCount += 1;
          break;
        case 'worker':
          gainedWorkers += hasMasonry ? 4 : 3;
          break;
        case 'food_or_worker':
          foodOrWorkerDiceCount += 1;
          break;
        case 'coin':
          rolledCoins += hasCoinage ? 12 : 7;
          break;
      }
    });

    let choiceFood = 0;
    let choiceWorkers = 0;
    for (let c = 0; c < foodOrWorkerDiceCount; c++) {
      if (aiState.resources.food + gainedFood + choiceFood * (hasAgriculture ? 3 : 2) < aiState.cities.count) {
        choiceFood += 1;
      } else {
        choiceWorkers += 1;
      }
    }
    gainedFood += choiceFood * (hasAgriculture ? 3 : 2);
    gainedWorkers += choiceWorkers * (hasMasonry ? 3 : 2);

    logs.push(`Rolled ${diceCount} dice: ` + keptDice.map((d) => d.toUpperCase()).join(", "));
    
    let collectionMsg = "Collected: ";
    const collectedParts: string[] = [];
    if (gainedFood > 0) collectedParts.push(`+${gainedFood} Food`);
    if (goodsCount > 0) collectedParts.push(`+${goodsCount} Goods`);
    if (gainedWorkers > 0) collectedParts.push(`+${gainedWorkers} Workers`);
    if (rolledCoins > 0) collectedParts.push(`+${rolledCoins} Coins`);
    if (skullCount > 0) collectedParts.push(`+${skullCount} Skulls`);
    logs.push(collectionMsg + (collectedParts.length > 0 ? collectedParts.join(", ") : "nothing"));

    // Add goods sequentially
    const goodsOrder: Array<keyof ResourceState> = ['wood', 'stone', 'pottery', 'cloth', 'spear'];
    const limits = getResourceLimits();
    const tempResources = { ...aiState.resources };
    const gainedGoodsDisplay: string[] = [];

    let currentSlot = 0;
    const hasQuarrying = aiState.developments.find((d) => d.id === 'quarrying')?.purchased;

    for (let g = 0; g < goodsCount; g++) {
      const key = goodsOrder[currentSlot];
      const max = limits[key];
      if (tempResources[key] < max) {
        tempResources[key] += 1;
        gainedGoodsDisplay.push(key.toUpperCase());
        if (key === 'stone' && hasQuarrying && tempResources.stone < limits.stone) {
          tempResources.stone += 1;
          gainedGoodsDisplay.push('STONE (+1 Quarrying)');
        }
      }
      currentSlot = (currentSlot + 1) % goodsOrder.length;
    }

    if (gainedGoodsDisplay.length > 0) {
      logs.push(`Goods added: ${gainedGoodsDisplay.join(', ')}`);
    }

    // Feed cities
    let starvationPenalty = 0;
    let nextFood = Math.min(limits.food, tempResources.food + gainedFood);
    const requiredFood = aiState.cities.count;

    if (nextFood >= requiredFood) {
      nextFood -= requiredFood;
      logs.push(`Fed ${requiredFood} cities with ${requiredFood} food.`);
    } else {
      starvationPenalty = requiredFood - nextFood;
      nextFood = 0;
      logs.push(`Famine! ${starvationPenalty} unfed cities caused +${starvationPenalty} Disaster Points.`);
    }
    tempResources.food = nextFood;

    // Disasters resolution
    let nextAIDisasterPoints = aiState.disasterPoints;
    let activePlayerState = { ...sourceState.playerStates[0] };
    let activePlayerDisasterPoints = sourceState.playerStates[0].disasterPoints;
    let activePlayerResources = { ...sourceState.playerStates[0].resources };

    if (starvationPenalty > 0) {
      nextAIDisasterPoints = Math.min(9, nextAIDisasterPoints + starvationPenalty);
    }

    if (skullCount === 2) {
      const oppHasIrrigation = aiState.developments.find((d) => d.id === 'irrigation')?.purchased;
      if (oppHasIrrigation) {
        logs.push(`Averted Drought with Irrigation!`);
      } else {
        nextAIDisasterPoints = Math.min(9, nextAIDisasterPoints + 2);
        logs.push(`Suffered Drought: +2 disaster points.`);
      }
    } else if (skullCount === 3) {
      logs.push(`Rolled 3 skulls! Epidemic (Pestilence) strikes the player.`);
      const playerHasMedicine = activePlayerState.developments.find((d) => d.id === 'medicine')?.purchased;
      if (playerHasMedicine) {
        logs.push(`Player averted Epidemic with Medicine.`);
      } else {
        activePlayerDisasterPoints = Math.min(9, activePlayerDisasterPoints + 3);
        logs.push(`Player suffered Epidemic: +3 disaster points.`);
      }
    } else if (skullCount === 4) {
      logs.push(`Rolled 4 skulls! Invasion strikes the player.`);
      const playerGreatWall = sourceState.monuments.find((m) => m.id === 'great_wall')?.completedByPlayer;
      if (playerGreatWall) {
        logs.push(`Player averted Invasion with Great Wall.`);
      } else {
        activePlayerDisasterPoints = Math.min(9, activePlayerDisasterPoints + 4);
        logs.push(`Player suffered Invasion: +4 disaster points.`);
      }
    } else if (skullCount >= 5) {
      logs.push(`Rolled 5+ skulls! Revolt strikes the player.`);
      const playerHasReligion = activePlayerState.developments.find((d) => d.id === 'religion')?.purchased;
      if (playerHasReligion) {
        logs.push(`Player averted Revolt with Religion.`);
      } else {
        activePlayerResources.wood = 0;
        activePlayerResources.stone = 0;
        activePlayerResources.pottery = 0;
        activePlayerResources.cloth = 0;
        activePlayerResources.spear = 0;
        logs.push(`Player suffered Revolt: lost all non-food goods.`);
      }
    }

    // Build Phase
    let remainingWorkers = gainedWorkers;
    let currentCitiesCount = aiState.cities.count;
    let currentCitiesProgress = aiState.cities.progress;

    while (remainingWorkers > 0 && currentCitiesCount < 7) {
      const requiredProgress = getCityRequiredBoxes(currentCitiesCount + 1);
      const progressNeeded = requiredProgress - currentCitiesProgress;
      if (remainingWorkers >= progressNeeded) {
        remainingWorkers -= progressNeeded;
        currentCitiesCount += 1;
        currentCitiesProgress = 0;
        logs.push(`Built city #${currentCitiesCount}!`);
      } else {
        currentCitiesProgress += remainingWorkers;
        remainingWorkers = 0;
        logs.push(`Completed ${currentCitiesProgress}/${requiredProgress} progress for city #${currentCitiesCount + 1}.`);
      }
    }

    // Monuments checking
    const completedMonumentIdsThisTurn: string[] = [];
    const nextMonuments = sourceState.monuments.map((m) => {
      if (remainingWorkers <= 0 || m.completedByPlayer) {
        return m;
      }

      const slotLimit = m.slots;
      const currentChecked = m.checkedSlots;
      const slotsNeeded = slotLimit - currentChecked;

      if (remainingWorkers >= slotsNeeded) {
        remainingWorkers -= slotsNeeded;
        logs.push(`Completed construction on the ${m.name}!`);
        completedMonumentIdsThisTurn.push(m.id);
        return {
          ...m,
          checkedSlots: slotLimit,
          completedByPlayer: true,
        };
      } else {
        const progressApplied = remainingWorkers;
        remainingWorkers = 0;
        logs.push(`Checked ${currentChecked + progressApplied}/${slotLimit} slots on the ${m.name}.`);
        return {
          ...m,
          checkedSlots: currentChecked + progressApplied,
        };
      }
    });

    // Buy Phase
    const availableDevelopments = aiState.developments.filter((d) => !d.purchased);
    availableDevelopments.sort((a, b) => b.cost - a.cost);

    let coins = rolledCoins;
    let purchasedDevName = '';

    const nextDevelopments = aiState.developments.map((d) => {
      if (d.purchased || purchasedDevName) return d;

      // Calculate total spending power of remaining goods
      const goodsValueSum =
        tempResources.wood * 1 +
        tempResources.stone * 2 +
        tempResources.pottery * 3 +
        tempResources.cloth * 4 +
        tempResources.spear * 5;

      const totalAffordableValue = coins + goodsValueSum;
      if (totalAffordableValue >= d.cost) {
        purchasedDevName = d.name;
        logs.push(`Purchased ${d.name} development!`);

        let costRemaining = d.cost;
        if (coins >= costRemaining) {
          coins -= costRemaining;
          costRemaining = 0;
        } else {
          costRemaining -= coins;
          coins = 0;

          const goodTypesSorted: Array<keyof ResourceState> = ['spear', 'cloth', 'pottery', 'stone', 'wood'];
          const goodValues = { wood: 1, stone: 2, pottery: 3, cloth: 4, spear: 5 };

          for (const gt of goodTypesSorted) {
            if (costRemaining <= 0) break;
            const goodCount = tempResources[gt];
            if (goodCount > 0) {
              const goodValue = goodCount * goodValues[gt];
              costRemaining -= goodValue;
              tempResources[gt] = 0;
            }
          }
        }
        return { ...d, purchased: true };
      }
      return d;
    });

    // Discard Phase
    const aiHasCaravans = nextDevelopments.find((d) => d.id === 'caravans')?.purchased;
    const totalG = tempResources.wood + tempResources.stone + tempResources.pottery + tempResources.cloth + tempResources.spear;
    if (totalG > 6 && !aiHasCaravans) {
      let excess = totalG - 6;
      const goodTypesAsc: Array<keyof ResourceState> = ['wood', 'stone', 'pottery', 'cloth', 'spear'];
      for (const gt of goodTypesAsc) {
        if (excess <= 0) break;
        const count = tempResources[gt];
        if (count > 0) {
          const discardCount = Math.min(excess, count);
          tempResources[gt] -= discardCount;
          excess -= discardCount;
        }
      }
      logs.push(`Discarded excess goods down to storage limit of 6.`);
    }

    // Compute scores
    const newAIScore = computeScore({
      ...sourceState,
      monuments: nextMonuments,
      developments: nextDevelopments,
      cities: {
        count: currentCitiesCount,
        progress: currentCitiesProgress,
      },
      disasterPoints: nextAIDisasterPoints,
    });

    const updatedAIState = {
      ...aiState,
      resources: tempResources,
      cities: {
        count: currentCitiesCount,
        progress: currentCitiesProgress,
      },
      monuments: nextMonuments,
      developments: nextDevelopments,
      disasterPoints: nextAIDisasterPoints,
      score: newAIScore,
      history: [...logs, ...aiState.history],
    };

    const nextTurnCount = sourceState.turn + 1;
    const updatedHumanMonuments = activePlayerState.monuments.map((m) => {
      if (completedMonumentIdsThisTurn.includes(m.id)) {
        return { ...m, completedByAI: true };
      }
      return m;
    });

    const player1Score = computeScore({
      ...sourceState,
      monuments: updatedHumanMonuments,
      developments: activePlayerState.developments,
      cities: activePlayerState.cities,
      disasterPoints: activePlayerDisasterPoints,
      resources: activePlayerResources,
    });

    const updatedHumanState = {
      ...activePlayerState,
      monuments: updatedHumanMonuments,
      disasterPoints: activePlayerDisasterPoints,
      resources: activePlayerResources,
      score: player1Score,
    };

    const intermediateState: GameState = {
      ...sourceState,
      playerStates: [updatedHumanState, updatedAIState],
    };

    const gameCheck = checkIsGameOver(intermediateState);
    if (gameCheck.ended) {
      const finalState: GameState = {
        ...intermediateState,
        phase: 'end',
        recentStatus: `Game Over! ${gameCheck.reason}`,
      };
      setPendingNextState(finalState);
      setRivalTurnLogs(logs);
      setTimeout(() => {
        setAiProcessing(false);
      }, 2000);
      return;
    }

    const nextState: GameState = {
      ...sourceState,
      turn: nextTurnCount,
      phase: 'roll',
      rollsLeft: 3,
      monuments: updatedHumanMonuments,
      workers: 0,
      coins: 0,
      boughtDevelopmentThisTurn: false,
      playerStates: [updatedHumanState, updatedAIState],
      resources: activePlayerResources,
      disasterPoints: activePlayerDisasterPoints,
      score: player1Score,
      recentStatus: `Turn ${nextTurnCount} started. Rival turn completed!`,
      history: [
        `Turn ${nextTurnCount}: New round started. Roll Phase.`,
        ...logs.map(l => `Rival: ${l}`),
        ...sourceState.history,
      ],
    };

    setPendingNextState(nextState);
    setRivalTurnLogs(logs);

    setTimeout(() => {
      setAiProcessing(false);
    }, 2000);
  };

  if (!gameState.setupCompleted) {
    return (
      <main className="w-full h-full relative p-4 flex flex-col justify-center items-center min-h-screen texture-wood font-sans">
        <div className="texture-parchment max-w-md w-full rounded-[2rem] p-8 border border-outline shadow-2xl relative text-center flex flex-col gap-6">
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-tl-xl" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-tr-xl" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-bl-xl" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-br-xl" />

          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-on-primary-fixed tracking-tight uppercase leading-none">
              Alea Imperii
            </h1>
            <p className="font-label text-[9px] font-bold text-on-tertiary-fixed/60 uppercase tracking-widest mt-2">
              A civilization game of chance and ambition
            </p>
          </div>

          <div className="p-4 bg-surface-container-lowest/5 rounded-xl border border-on-tertiary-fixed/10 font-sans text-xs leading-relaxed text-on-primary-fixed">
            Select your game mode to begin. In hotseat multiplayer, players take turns on the same screen to build their monuments and empires!
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleStartSetup('solo')}
              className="w-full py-3.5 bg-on-primary-fixed hover:bg-surface-variant text-white hover:text-white rounded-xl font-serif text-base font-bold transition-all shadow-md select-none flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer active:scale-98"
            >
              👤 Solo High Score
            </button>
            <button
              onClick={() => handleStartSetup('solo_ai')}
              className="w-full py-3.5 text-white hover:text-white rounded-xl font-serif text-base font-bold transition-all shadow-md select-none flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer active:scale-98"
              style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #854d0e 100%)' }}
            >
              🤖 Solo + AI Campaign
            </button>
            <div className="border-t border-on-tertiary-fixed/15 my-1" />
            <button
              onClick={() => handleStartSetup('hotseat_2')}
              className="w-full py-3 bg-gradient-to-r from-amber-700 to-orange-850 hover:brightness-110 text-white hover:text-white rounded-xl font-serif text-sm font-bold transition-all shadow-md select-none flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer active:scale-98"
            >
              👥 2 Players (Hotseat)
            </button>
            <button
              onClick={() => handleStartSetup('hotseat_3')}
              className="w-full py-3 bg-gradient-to-r from-amber-800 to-amber-950 hover:brightness-110 text-white hover:text-white rounded-xl font-serif text-sm font-bold transition-all shadow-md select-none flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer active:scale-98"
            >
              👑 3 Players (Hotseat)
            </button>
          </div>


        </div>
      </main>
    );
  }

  if (gameState.phase === 'end') {
    const standings = getGameOverStandings();
    const isSolo = gameState.gameMode === 'solo';
    const isRivalWinner = standings[0]?.name === 'Rival AI';

    return (
      <main className="w-full h-full relative p-4 flex flex-col justify-center items-center min-h-screen texture-wood font-sans">
        <div className="texture-parchment max-w-2xl w-full rounded-[1.5rem] p-4 md:p-5 border border-outline shadow-2xl relative flex flex-col gap-4 text-on-primary-fixed">
          {/* Decorative Corners */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-br-lg" />

          <div className="text-center">
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold tracking-tight uppercase leading-none text-amber-950 flex items-center justify-center gap-1.5">
              👑 {isRivalWinner ? "Rival Empire Triumphant" : "Player Empire Triumphant"} 👑
            </h1>
            <p className="font-label text-[9px] font-bold text-on-tertiary-fixed/60 uppercase tracking-widest mt-1">
              Annals of the Alea Imperii
            </p>
          </div>

          {/* Reason Card */}
          <div className="p-2.5 bg-amber-950/5 border border-amber-900/10 rounded-xl text-center shadow-inner">
            <span className="font-label text-[8px] font-bold text-amber-900 uppercase tracking-wider block leading-none mb-0.5">
              Trigger Event
            </span>
            <p className="text-xs font-serif italic font-bold text-amber-950">
              {gameState.recentStatus.replace("Game Over! ", "")}
            </p>
          </div>

          {/* Standings list */}
          <div className="flex flex-col gap-2">
            <h3 className="font-serif text-sm font-bold text-amber-950 border-b border-outline-variant/25 pb-1">
              🏆 Final Standings
            </h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-0.5">
              {standings.map((p, idx) => {
                const isWinner = idx === 0;
                let trophy = '🥉';
                if (idx === 0) trophy = '🏆';
                else if (idx === 1) trophy = '🥈';

                // Solo rank evaluation
                let rankLabel = "";
                if (isSolo) {
                  if (p.score >= 40) rankLabel = "Grand Emperor of the Ages (Legendary!)";
                  else if (p.score >= 30) rankLabel = "Enlightened Monarch";
                  else if (p.score >= 20) rankLabel = "Resolute Patrician";
                  else rankLabel = "Humble Tribune (Novice Rank)";
                }

                const hasAchievements = p.monuments.some(m => m.completedByPlayer) || p.developments.some(d => d.purchased);

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                      isWinner
                        ? 'bg-amber-900/10 border-amber-800 shadow-sm'
                        : 'bg-surface-container-lowest/5 border-on-tertiary-fixed/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{trophy}</span>
                        <div className="flex flex-col">
                          <span className="font-serif font-bold text-sm text-amber-950">
                            {p.name} {isWinner && !isSolo && <span className="text-[9px] text-green-700 bg-green-100 px-1 py-0.2 rounded font-sans font-bold uppercase ml-1">Winner</span>}
                          </span>
                          {isSolo ? (
                            <span className="text-[9px] text-amber-800 font-semibold italic">
                              {rankLabel}
                            </span>
                          ) : (
                            <span className="text-[9px] text-on-tertiary-fixed/60">
                              {p.citiesCount} Cities • {p.disasterPoints} Disaster Points
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-0.5 shrink-0">
                        <span className="text-xl font-serif font-black text-amber-950">{p.score}</span>
                        <span className="text-[9px] uppercase font-bold text-amber-900 font-label">pts</span>
                      </div>
                    </div>

                    {/* Compact Inline Achievements */}
                    {hasAchievements && (
                      <div className="flex flex-wrap gap-1 border-t border-on-tertiary-fixed/5 pt-1.5">
                        {p.monuments.filter(m => m.completedByPlayer).map((m, mIdx) => (
                          <span key={mIdx} className="bg-amber-900/5 text-amber-900 border border-amber-900/15 px-1.5 py-0.5 rounded text-[8px] font-sans font-bold uppercase tracking-tight">
                            🏛️ {m.name}
                          </span>
                        ))}
                        {p.developments.filter(d => d.purchased).map((d, dIdx) => (
                          <span key={dIdx} className="bg-amber-950/5 text-amber-900 border border-amber-955/15 px-1.5 py-0.5 rounded text-[8px] font-sans font-bold uppercase tracking-tight">
                            📜 {d.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1.5 flex justify-center">
            <button
              onClick={handleForceRestart}
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white hover:text-white rounded-xl font-serif text-sm font-bold transition-all shadow-md select-none flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer active:scale-98 animate-pulse"
            >
              🔄 Rebuild Another Empire
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full h-full relative overflow-y-auto overflow-x-hidden p-1.5 md:p-2.5 flex flex-col justify-start texture-wood items-center min-h-screen gap-2.5 font-sans">
      
      {/* Turn Console Wood Header Block */}
      <TurnConsole
        gameState={gameState}
        onToggleMusic={handleToggleMusic}
        onShowRules={() => setIsRulesOpen(true)}
        onShowStatus={() => setIsStatusOpen(true)}
        onRestart={handleRestart}
      />

      {/* Dice Tray Section */}
      <DiceTray
        dice={dice}
        rollsLeft={gameState.rollsLeft}
        phase={gameState.phase}
        hasLeadership={gameState.developments.find((d) => d.id === 'leadership')?.purchased || false}
        hasRerolledSkullThisTurn={hasRerolledSkullThisTurn}
        onToggleKeep={handleToggleKeep}
        onRerollSkull={handleRerollSkull}
        onRoll={handleRollDice}
        onDoneRolling={handleDoneRolling}
      />

      {/* Main Container Dashboard */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-2.5 items-stretch mb-6">
        
        {/* Parchment Small Resources Dashboard */}
        <ResourcesPanel
          resources={gameState.resources}
        />

        {/* Scrollable Aged Parchment Scoresheet */}
        <ScoreSheet
          gameState={gameState}
          onToggleDevelopmentPurchase={handleToggleDevelopmentPurchase}
          onToggleCity={handleToggleCity}
          onToggleCityProgress={handleToggleCityProgress}
          onToggleMonumentSlot={handleToggleMonumentSlot}
          onToggleMonumentBonus={handleToggleMonumentBonus}
        />

      </div>

      {/* Floating bronze "End Turn" button */}
      <button
        onClick={handleEndTurn}
        className="fixed bottom-8 right-8 px-8 py-4 embossed-bronze font-serif text-lg font-bold rounded-xl shadow-2xl active:scale-95 transition-all z-10 flex items-center gap-2 select-none uppercase cursor-pointer"
        title="Complete turn and let neighboring state rivals play"
      >
        End Turn <ArrowRight size={20} />
      </button>

      {/* Summary Assignments Modal (Evaluate phase transition) */}
      <AnimatePresence>
        {showSummaryModal && summaryData && (
          <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="texture-parchment text-surface-container-lowest max-w-lg w-full rounded-[2rem] p-6 md:p-8 border border-outline shadow-2xl relative"
            >
              <div className="border-b border-outline-variant/35 pb-3.5 mb-5 text-center">
                <span className="font-label text-xs uppercase tracking-widest text-on-tertiary-fixed font-bold">
                  Roll Evaluations
                </span>
                <h3 className="font-serif text-2xl font-bold text-on-primary-fixed mt-1">
                  Turn {gameState.turn} Harvest &amp; Tolls
                </h3>
              </div>

              {/* Development modifiers check */}
              {(() => {
                const hasAgriculture = gameState.developments.find((d) => d.id === 'agriculture')?.purchased;
                const hasMasonry = gameState.developments.find((d) => d.id === 'masonry')?.purchased;

                const workerChoiceCount = summaryData.foodOrWorkerDiceCount - foodChoiceCount;
                const choiceFoodGained = foodChoiceCount * (hasAgriculture ? 3 : 2);
                const choiceWorkersGained = workerChoiceCount * (hasMasonry ? 3 : 2);

                const totalFoodGained = summaryData.gainedFood + choiceFoodGained;
                const totalWorkersGained = summaryData.gainedWorkers + choiceWorkersGained;

                return (
                  <div className="space-y-4 font-sans text-xs">
                    {/* Food block */}
                    <div className="flex justify-between items-center border-b border-on-tertiary-fixed/15 pb-1 text-on-primary-fixed">
                      <span className="font-semibold flex items-center gap-1.5">
                        🍴 Food Yield:
                      </span>
                      <span className="font-bold text-sm text-amber-900">
                        +{totalFoodGained} Food {foodChoiceCount > 0 && <span className="text-[10px] font-normal font-sans opacity-70">({summaryData.gainedFood} rolled + {choiceFoodGained} chosen)</span>}
                      </span>
                    </div>

                    {/* Workers block */}
                    <div className="flex justify-between items-center border-b border-on-tertiary-fixed/15 pb-1 text-on-primary-fixed">
                      <span className="font-semibold flex items-center gap-1.5">
                        👷 Workers Yield:
                      </span>
                      <span className="font-bold text-sm text-amber-950">
                        +{totalWorkersGained} Workers {workerChoiceCount > 0 && <span className="text-[10px] font-normal font-sans opacity-70">({summaryData.gainedWorkers} rolled + {choiceWorkersGained} chosen)</span>}
                      </span>
                    </div>

                    {/* Coin block */}
                    <div className="flex justify-between items-center border-b border-on-tertiary-fixed/15 pb-1 text-on-primary-fixed">
                      <span className="font-semibold flex items-center gap-1.5">
                        💰 Coin Harvest:
                      </span>
                      <span className="font-bold text-sm text-yellow-800">
                        +{summaryData.rolledCoins} Coins
                      </span>
                    </div>

                    {/* Choice Dice Assignment block */}
                    {summaryData.foodOrWorkerDiceCount > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-950/5 border border-amber-900/10 text-on-primary-fixed my-2.5 shadow-sm">
                        <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 mb-1 text-amber-900 font-label">
                          ✨ Assign Choice Dice ({summaryData.foodOrWorkerDiceCount} face{summaryData.foodOrWorkerDiceCount > 1 ? 's' : ''})
                        </span>
                        <p className="text-[10px] text-amber-900/80 mb-2 leading-snug font-sans">
                          You rolled {summaryData.foodOrWorkerDiceCount} dual-choice face(s). Split them between food and workers:
                        </p>
                        <div className="flex items-center justify-between gap-3 bg-surface-container-lowest/5 p-2 rounded-lg border border-on-tertiary-fixed/10">
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={foodChoiceCount === 0}
                              onClick={() => setFoodChoiceCount(prev => prev - 1)}
                              className="w-6 h-6 rounded border border-on-tertiary-fixed/20 bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 flex items-center justify-center font-bold text-xs select-none disabled:opacity-30 cursor-pointer text-on-primary-fixed"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-xs bg-surface-container-lowest/30 px-2 py-0.5 rounded border border-on-tertiary-fixed/10 text-on-primary-fixed">
                              {foodChoiceCount}
                            </span>
                            <button
                              disabled={foodChoiceCount === summaryData.foodOrWorkerDiceCount}
                              onClick={() => setFoodChoiceCount(prev => prev + 1)}
                              className="w-6 h-6 rounded border border-on-tertiary-fixed/20 bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 flex items-center justify-center font-bold text-xs select-none disabled:opacity-30 cursor-pointer text-on-primary-fixed"
                            >
                              +
                            </button>
                            <span className="text-[10px] font-sans opacity-85 font-medium ml-1">
                              assigned to Food
                            </span>
                          </div>
                          <div className="text-right text-[10px] font-sans opacity-95">
                            <div className="font-bold text-amber-800">+{foodChoiceCount * (hasAgriculture ? 3 : 2)} Food</div>
                            <div className="font-bold text-amber-950">+{workerChoiceCount * (hasMasonry ? 3 : 2)} Workers</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Goods block */}
                    {summaryData.gainedGoodsItems.length > 0 && (
                      <div className="flex justify-between items-start border-b border-on-tertiary-fixed/15 pb-1 text-on-primary-fixed">
                        <span className="font-semibold">📦 Sequential Goods:</span>
                        <span className="font-bold text-right text-orange-950/90 leading-tight max-w-[220px]">
                          {summaryData.gainedGoodsItems.join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Disasters block */}
                    <div className="p-3 rounded-xl bg-red-950/5 border border-red-950/15 text-red-950">
                      <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 mb-1 font-label">
                        <AlertTriangle size={13} /> Disaster Mitigation &amp; Threat
                      </span>
                      <span className="font-medium text-[11px] block text-red-900 leading-tight">
                        {summaryData.disasterTriggered === 'None'
                          ? 'No severe disasters occurred this turn. Your towns are peaceful!'
                          : summaryData.disasterTriggered}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleApplySummaryAndFeed}
                  className="px-6 py-3 whitespace-nowrap bg-on-primary-fixed hover:bg-surface-variant text-white hover:text-white rounded-lg font-bold text-xs tracking-wider transition-all shadow-md select-none flex items-center gap-2 uppercase font-label cursor-pointer"
                >
                  Apply &amp; Feed Cities <Check size={14} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Development Purchase Overlay */}
      <AnimatePresence>
        {activePurchaseDev && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="texture-parchment max-w-md w-full rounded-[2rem] p-6 border border-outline shadow-2xl relative flex flex-col gap-5 text-on-primary-fixed"
            >
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-tl-xl" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-tr-xl" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-bl-xl" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-br-xl" />

              <div className="text-center">
                <h3 className="font-serif text-2xl font-extrabold tracking-tight uppercase leading-none">
                  Acquire Development
                </h3>
                <p className="font-sans text-[11px] text-on-tertiary-fixed/60 uppercase tracking-widest mt-1">
                  Spend Coins and Goods Track Items
                </p>
              </div>

              {/* Dev Info Card */}
              <div className="p-4 bg-surface-container-lowest/10 rounded-xl border border-on-tertiary-fixed/15 flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="font-serif font-bold text-lg leading-tight text-on-primary-fixed">
                    {activePurchaseDev.name}
                  </span>
                  <span className="text-[10px] text-on-tertiary-fixed/80 max-w-[220px]">
                    {activePurchaseDev.effect}
                  </span>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[10px] font-bold text-on-tertiary-fixed/60 uppercase tracking-wider">Cost</span>
                  <div className="w-12 h-12 rounded-full bg-amber-700/10 border-2 border-amber-800 flex items-center justify-center font-serif text-xl font-bold text-amber-900 shadow-md">
                    {activePurchaseDev.cost}
                  </div>
                </div>
              </div>

              {/* Available Coins */}
              <div className="flex justify-between items-center px-4 py-2.5 bg-surface-container-lowest/5 rounded-xl border border-on-tertiary-fixed/10 text-xs">
                <span className="font-semibold">Turn Coins Pool:</span>
                <span className="font-mono font-bold text-sm text-amber-900 bg-amber-100/50 px-2.5 py-0.5 rounded-full border border-amber-800/20">
                  {gameState.coins} Coins
                </span>
              </div>

              {/* Spendable Goods Section */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-serif font-bold border-b border-on-tertiary-fixed/10 pb-1">
                  <span>Spend Goods Completely</span>
                  <span className="text-[10px] font-sans font-normal opacity-70">(Spending a track spends ALL units on it)</span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {(() => {
                    const goodsList = [
                      { key: 'wood', label: 'Wood', value: 1 },
                      { key: 'stone', label: 'Stone', value: 2 },
                      { key: 'pottery', label: 'Pottery', value: 3 },
                      { key: 'cloth', label: 'Cloth', value: 4 },
                      { key: 'spear', label: 'Spears', value: 5 },
                    ];

                    return goodsList.map((g) => {
                      const count = gameState.resources[g.key as keyof ResourceState];
                      const totalVal = count * g.value;
                      const isSelected = selectedGoodsToSpend[g.key];
                      const hasCount = count > 0;

                      return (
                        <button
                          key={g.key}
                          disabled={!hasCount}
                          onClick={() => {
                            setSelectedGoodsToSpend((prev) => ({
                              ...prev,
                              [g.key]: !prev[g.key],
                            }));
                          }}
                          className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all select-none text-left ${
                            !hasCount
                              ? 'opacity-40 cursor-not-allowed border-transparent bg-transparent'
                              : isSelected
                              ? 'bg-amber-900/10 border-amber-800/60 shadow-xs'
                              : 'bg-surface-container-lowest/5 border-on-tertiary-fixed/10 hover:bg-surface-container-lowest/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                              isSelected ? 'bg-amber-800 border-amber-800 text-white' : 'border-on-tertiary-fixed/30'
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={4} />}
                            </div>
                            <span className="text-xs font-semibold">{g.label} ({count} units)</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-900">
                            +{totalVal} Value
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Total Calculation & Validation */}
              {(() => {
                const goodsValues = { wood: 1, stone: 2, pottery: 3, cloth: 4, spear: 5 };
                let totalGoodsValue = 0;
                Object.keys(selectedGoodsToSpend).forEach((key) => {
                  if (selectedGoodsToSpend[key]) {
                    const count = gameState.resources[key as keyof ResourceState];
                    totalGoodsValue += count * goodsValues[key as keyof typeof goodsValues];
                  }
                });

                const totalOffered = gameState.coins + totalGoodsValue;
                const canAfford = totalOffered >= activePurchaseDev.cost;

                return (
                  <div className="flex flex-col gap-3.5 mt-2 border-t border-on-tertiary-fixed/10 pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-on-tertiary-fixed/70">Total Value Offered:</span>
                      <span className={`font-mono font-extrabold text-sm ${canAfford ? 'text-green-800' : 'text-red-800'}`}>
                        {totalOffered} / {activePurchaseDev.cost} Coins
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setActivePurchaseDev(null)}
                        className="flex-1 py-2.5 rounded-lg border border-on-tertiary-fixed/20 text-xs font-semibold hover:bg-surface-container-lowest/15 transition-all text-center uppercase tracking-wider cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!canAfford}
                        onClick={confirmDevelopmentPurchase}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-xs tracking-wider transition-all shadow-md select-none text-center uppercase cursor-pointer ${
                          canAfford
                            ? 'bg-amber-800 hover:bg-amber-900 text-white hover:text-white'
                            : 'bg-on-tertiary-fixed/15 text-on-tertiary-fixed/40 cursor-not-allowed shadow-none'
                        }`}
                      >
                        Confirm Buy
                      </button>
                    </div>
                  </div>
                );
              })()}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Rules Overlay */}
      <RulesSection isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Standing details breakdown overlay */}
      <StatusModal
        isOpen={isStatusOpen}
        gameState={gameState}
        onClose={() => setIsStatusOpen(false)}
      />

      {/* Rival AI Turn Thinking Overlay */}
      <AnimatePresence>
        {isRivalThinking && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[900] p-4 select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg texture-parchment border-2 border-amber-950/40 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-5 border-opacity-40 animate-scale-up"
            >
              {/* Decorative Corners */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-tl" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-tr" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-bl" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-br" />

              <div className="flex flex-col items-center justify-center py-2 relative">
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-amber-500/5 blur-xl rounded-full" />
                {/* Rotating Hourglass */}
                <motion.div
                  animate={aiProcessing ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ repeat: aiProcessing ? Infinity : 0, duration: 2.5, ease: "linear" }}
                  className="w-16 h-16 rounded-full border border-amber-900/30 bg-amber-950/5 flex items-center justify-center shadow-inner relative z-10"
                >
                  <span className="text-3xl text-amber-800">⏳</span>
                </motion.div>
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-serif text-xl md:text-2xl font-bold text-amber-950 uppercase tracking-wide">
                  Rival Turn Resolution
                </h3>
                <p className="font-sans text-xs md:text-sm text-on-primary-fixed/80 italic font-semibold max-w-md mx-auto">
                  {aiProcessing 
                    ? "The Rival is planning their expansion, rolling dice, building cities, and purchasing developments..." 
                    : "The Rival has finished their turn! Review their actions below."}
                </p>
              </div>

              {/* Console annals log */}
              <div className="flex-1 overflow-y-auto max-h-[220px] border border-amber-950/20 bg-amber-950/10 rounded-xl p-4 font-mono text-[11px] text-amber-950/90 leading-relaxed shadow-inner">
                <div className="font-semibold text-center border-b border-amber-900/10 pb-1.5 mb-2 uppercase tracking-widest text-[9px]">
                  📜 Rival Annals of this Turn
                </div>
                {rivalTurnLogs.length === 0 ? (
                  <div className="text-center italic opacity-60 animate-pulse py-4">
                    Consulting regional advisors...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rivalTurnLogs.map((log, idx) => (
                      <div key={idx} className="border-b border-amber-950/5 pb-1 flex gap-2">
                        <span className="text-amber-800">✦</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2">
                {aiProcessing ? (
                  <div className="w-full py-3.5 bg-amber-950/10 border border-amber-950/20 text-on-primary-fixed rounded-xl font-serif text-xs font-bold text-center tracking-widest uppercase animate-pulse">
                    ⚡ Simulating Opponent Strategy ⚡
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      audio.playChime();
                      if (pendingNextState) {
                        setGameState(pendingNextState);
                        saveState(pendingNextState);
                        setHasRerolledSkullThisTurn(false);
                        if (pendingNextState.phase !== 'end') {
                          generateStartingDice(pendingNextState.cities.count);
                        }
                      }
                      setIsRivalThinking(false);
                      setPendingNextState(null);
                    }}
                    className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-serif text-xs font-bold transition-all shadow-md select-none uppercase tracking-widest cursor-pointer active:scale-95 flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    {pendingNextState?.phase === 'end' ? "View Game Over Standings 🏆" : "Begin Your Next Turn →"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Parchment Modal Dialog overlay */}
      {modal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-[999] p-4">
          <div className="w-full max-w-sm texture-parchment border-2 border-amber-950/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4 border-opacity-40 animate-scale-up">
            {/* Corners */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-tl" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-tr" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-outline-variant/30 pointer-events-none rounded-bl" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-outline-variant/30 pointer-events-none rounded-br" />

            <div className="flex flex-col gap-2 select-none text-center">
              <h3 className="font-serif text-lg md:text-xl font-bold text-amber-950 uppercase tracking-wide">
                {modal.title}
              </h3>
              <p className="font-sans text-xs md:text-sm text-on-primary-fixed leading-relaxed font-semibold">
                {modal.message}
              </p>
            </div>

            <div className="flex gap-3 justify-center mt-2.5">
              {modal.type === 'confirm' && (
                <button
                  onClick={() => {
                    audio.playClick();
                    if (modal.onCancel) modal.onCancel();
                    setModal(null);
                  }}
                  className="px-4 py-2 bg-on-tertiary-fixed/10 hover:bg-on-tertiary-fixed/20 text-on-primary-fixed border border-on-tertiary-fixed/10 rounded-xl font-serif text-xs font-bold transition-all shadow select-none uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  audio.playClick();
                  modal.onConfirm();
                  setModal(null);
                }}
                className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-serif text-xs font-bold transition-all shadow-md select-none uppercase tracking-wider cursor-pointer active:scale-95"
              >
                {modal.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
