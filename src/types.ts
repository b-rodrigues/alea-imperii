export interface Die {
  id: number;
  value: 'food' | 'goods' | 'skull' | 'worker' | 'food_or_worker' | 'coin';
  kept: boolean;
  rolling: boolean;
}

export interface ResourceState {
  food: number;
  wood: number;
  stone: number;
  pottery: number;
  cloth: number;
  spear: number;
}

export interface Monument {
  id: string;
  name: string;
  slots: number;
  checkedSlots: number;
  firstPoints: number;
  otherPoints: number;
  completedByPlayer: boolean;
  completedByAI: boolean;
}

export interface Development {
  id: string;
  name: string;
  cost: number;
  points: number;
  purchased: boolean;
  effect: string;
}

export interface GameState {
  turn: number;
  gameMode?: 'solo' | 'solo_ai' | 'hotseat';
  phase: 'roll' | 'assign' | 'feed' | 'buy' | 'end';
  rollsLeft: number;
  recentStatus: string;
  score: number;
  resources: ResourceState;
  cities: {
    count: number; // 3 to 7
    progress: number; // For building next city
  };
  monuments: Monument[];
  developments: Development[];
  disasterPoints: number; // -1 to -20 or count
  history: string[];
  isMuted: boolean;
  aiScores: {
    monuments: Record<string, boolean>;
  };
  workers: number; // Ephemeral worker count for active turn
  coins: number; // Ephemeral coin count for active turn
  boughtDevelopmentThisTurn?: boolean;
  // Multiplayer hotseat support
  setupCompleted?: boolean;
  playerCount?: number;
  activePlayerIndex?: number;
  playerStates?: Array<{
    name: string;
    resources: ResourceState;
    cities: {
      count: number;
      progress: number;
    };
    monuments: Monument[];
    developments: Development[];
    disasterPoints: number;
    score: number;
    history: string[];
    workers: number;
    coins: number;
    boughtDevelopmentThisTurn?: boolean;
  }>;
}
