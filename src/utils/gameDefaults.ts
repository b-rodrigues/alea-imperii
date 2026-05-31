import type { Monument, Development, GameState } from '../types';

export const INITIAL_MONUMENTS: Monument[] = [
  {
    id: 'step_pyramid',
    name: 'Step Pyramid',
    slots: 3,
    checkedSlots: 0,
    firstPoints: 1,
    otherPoints: 0,
    completedByPlayer: false,
    completedByAI: false,
  },
  {
    id: 'stone_circle',
    name: 'Stone Circle',
    slots: 5,
    checkedSlots: 0,
    firstPoints: 2,
    otherPoints: 1,
    completedByPlayer: false,
    completedByAI: false,
  },
  {
    id: 'temple',
    name: 'Temple',
    slots: 7,
    checkedSlots: 0,
    firstPoints: 4,
    otherPoints: 2,
    completedByPlayer: false,
    completedByAI: false,
  },
  {
    id: 'obelisk',
    name: 'Obelisk',
    slots: 9,
    checkedSlots: 0,
    firstPoints: 6,
    otherPoints: 3,
    completedByPlayer: false,
    completedByAI: false,
  },
  {
    id: 'hanging_gardens',
    name: 'Hanging Gardens',
    slots: 11,
    checkedSlots: 0,
    firstPoints: 8,
    otherPoints: 4,
    completedByPlayer: false,
    completedByAI: false,
  },
  {
    id: 'great_wall',
    name: 'Great Wall',
    slots: 13,
    checkedSlots: 0,
    firstPoints: 10,
    otherPoints: 5,
    completedByPlayer: false,
    completedByAI: false,
  },
  {
    id: 'great_pyramid',
    name: 'Great Pyramid',
    slots: 15,
    checkedSlots: 0,
    firstPoints: 12,
    otherPoints: 6,
    completedByPlayer: false,
    completedByAI: false,
  },
];

export const INITIAL_DEVELOPMENTS: Development[] = [
  {
    id: 'leadership',
    name: 'Leadership',
    cost: 10,
    points: 2,
    purchased: false,
    effect: 'After last roll: re-roll 1 die of choice (incl. skulls). Must keep new result.',
  },
  {
    id: 'irrigation',
    name: 'Irrigation',
    cost: 10,
    points: 2,
    purchased: false,
    effect: 'Immune to Drought.',
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    cost: 15,
    points: 3,
    purchased: false,
    effect: '+1 food per food-face die (incl. 2-food-or-workers face if food chosen).',
  },
  {
    id: 'quarrying',
    name: 'Quarrying',
    cost: 15,
    points: 3,
    purchased: false,
    effect: '+1 stone whenever stone is produced.',
  },
  {
    id: 'medicine',
    name: 'Medicine',
    cost: 15,
    points: 3,
    purchased: false,
    effect: 'Immune to Pestilence caused by opponents.',
  },
  {
    id: 'coinage',
    name: 'Coinage',
    cost: 20,
    points: 4,
    purchased: false,
    effect: 'Coin die face yields 12 coins instead of 7.',
  },
  {
    id: 'caravans',
    name: 'Caravans',
    cost: 20,
    points: 4,
    purchased: false,
    effect: 'No need to discard goods at end of turn (hold any amount).',
  },
  {
    id: 'religion',
    name: 'Religion',
    cost: 20,
    points: 6,
    purchased: false,
    effect: 'On Revolt: you keep your goods; opponents lose all theirs.',
  },
  {
    id: 'granaries',
    name: 'Granaries',
    cost: 30,
    points: 6,
    purchased: false,
    effect: 'During Buy phase: sell food at 4 coins each toward development purchase.',
  },
  {
    id: 'masonry',
    name: 'Masonry',
    cost: 30,
    points: 6,
    purchased: false,
    effect: '+1 worker per worker-face die (incl. 2-food-or-workers face if workers chosen).',
  },
  {
    id: 'engineering',
    name: 'Engineering',
    cost: 40,
    points: 6,
    purchased: false,
    effect: 'During Build phase: spend stone for 3 boxes each. Any amount.',
  },
  {
    id: 'architecture',
    name: 'Architecture',
    cost: 50,
    points: 8,
    purchased: false,
    effect: 'End game bonus: +1 point per completed monument.',
  },
  {
    id: 'empire',
    name: 'Empire',
    cost: 60,
    points: 8,
    purchased: false,
    effect: 'End game bonus: +1 point per city owned (including starting 3).',
  },
];

export const getStartingState = (): GameState => ({
  turn: 1,
  gameMode: 'solo',
  phase: 'roll',
  rollsLeft: 3,
  recentStatus: 'A new game begins. Roll the dice to acquire resources and build your empire!',
  score: 0,
  resources: {
    food: 3,
    wood: 2,
    stone: 0,
    pottery: 0,
    cloth: 0,
    spear: 0,
  },
  cities: {
    count: 3,
    progress: 0,
  },
  monuments: INITIAL_MONUMENTS.map(m => ({ ...m })),
  developments: INITIAL_DEVELOPMENTS.map(d => ({ ...d })),
  disasterPoints: 0,
  history: ['Turn 1: Game started. Current active cities: 3.'],
  isMuted: true,
  aiScores: {
    monuments: {},
  },
  workers: 0,
  coins: 0,
  boughtDevelopmentThisTurn: false,
});

export const getResourceLimits = () => ({
  food: 15,
  wood: 6,
  stone: 6,
  pottery: 6,
  cloth: 6,
  spear: 6,
});

export const getResourceCoins = (name: string): number => {
  switch (name.toLowerCase()) {
    case 'wood': return 1;
    case 'stone': return 2;
    case 'pottery': return 3;
    case 'cloth': return 4;
    case 'spear': return 5;
    default: return 0;
  }
};
