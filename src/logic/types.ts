export enum Difficulty {
  CASUAL = 'CASUAL',
  HARD = 'HARD',
  EXPERT = 'EXPERT',
}

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  badge: string;
  description: string;
  timeMultiplier: number;
  moveMultiplier: number;
  starMultiplier: number;
  coinMultiplier: number;
  colorClass: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.CASUAL]: {
    id: Difficulty.CASUAL,
    label: 'Casual',
    badge: 'Relaxed',
    description: '+35% Extra Time & +40% More Moves. Perfect for relaxed sorting!',
    timeMultiplier: 1.35,
    moveMultiplier: 1.4,
    starMultiplier: 1.0,
    coinMultiplier: 1.0,
    colorClass: 'emerald',
  },
  [Difficulty.HARD]: {
    id: Difficulty.HARD,
    label: 'Hard',
    badge: 'Standard',
    description: 'Original arcade balance. Standard timer & strict move limits.',
    timeMultiplier: 1.0,
    moveMultiplier: 1.0,
    starMultiplier: 1.0,
    coinMultiplier: 1.25,
    colorClass: 'blue',
  },
  [Difficulty.EXPERT]: {
    id: Difficulty.EXPERT,
    label: 'Expert',
    badge: 'Master Rush',
    description: '-30% Tight Timer & -25% Moves! +50% Bonus Coins for master drivers.',
    timeMultiplier: 0.7,
    moveMultiplier: 0.75,
    starMultiplier: 1.0,
    coinMultiplier: 1.5,
    colorClass: 'amber',
  },
};

export enum GameMode {
  CLASSIC = 'CLASSIC',
  RUSH_HOUR = 'RUSH_HOUR',
  PUZZLE_MASTER = 'PUZZLE_MASTER',
  VIP_EXPRESS = 'VIP_EXPRESS',
}

export interface GameModeConfig {
  id: GameMode;
  name: string;
  badge: string;
  icon: string;
  tagline: string;
  description: string;
  timeBonusPerBus: number;
  comboScoreMultiplier: number;
  coinMultiplier: number;
  colorClass: string;
  features: string[];
}

export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  [GameMode.CLASSIC]: {
    id: GameMode.CLASSIC,
    name: 'Classic Jam',
    badge: 'Standard',
    icon: '🚌',
    tagline: 'Match & Clear Parking Flow',
    description: 'The definitive parking puzzle experience. Unblock lanes, match passengers, and maintain order.',
    timeBonusPerBus: 0,
    comboScoreMultiplier: 1.0,
    coinMultiplier: 1.0,
    colorClass: 'from-blue-500 to-indigo-600',
    features: ['Balanced Timer & Moves', 'Standard Passenger Queue', 'Full Booster Compatibility'],
  },
  [GameMode.RUSH_HOUR]: {
    id: GameMode.RUSH_HOUR,
    name: 'Rush Hour Blitz',
    badge: 'Time Attack',
    icon: '⚡',
    tagline: '+15s Bonus Time Per Cleared Bus!',
    description: 'Adrenaline-fueled rush against the clock! Fast departures add +15s extra time and huge combo streaks.',
    timeBonusPerBus: 15,
    comboScoreMultiplier: 2.0,
    coinMultiplier: 1.5,
    colorClass: 'from-amber-500 to-orange-600',
    features: ['+15s Bonus per Departed Bus', 'Double Combo Points', 'Speed Surge Fever Mode'],
  },
  [GameMode.PUZZLE_MASTER]: {
    id: GameMode.PUZZLE_MASTER,
    name: 'Puzzle Master',
    badge: 'Strict Moves',
    icon: '🎯',
    tagline: 'Limited Move Budget, Pure Brainpower',
    description: 'Precision tactical mode. Generous time limit, but every vehicle tap counts against a tight move budget.',
    timeBonusPerBus: 0,
    comboScoreMultiplier: 1.5,
    coinMultiplier: 1.75,
    colorClass: 'from-purple-500 to-pink-600',
    features: ['-30% Strict Move Budget', 'Relaxed Timer Pressure', 'Triple 3-Star Mastery Payout'],
  },
  [GameMode.VIP_EXPRESS]: {
    id: GameMode.VIP_EXPRESS,
    name: 'VIP Express',
    badge: 'Golden Pass',
    icon: '👑',
    tagline: 'Rainbow VIPs Board Any Vehicle!',
    description: 'Golden VIP commuters join the queue! They can board ANY open vehicle for huge instant cash & combo boosts.',
    timeBonusPerBus: 5,
    comboScoreMultiplier: 2.5,
    coinMultiplier: 2.0,
    colorClass: 'from-emerald-500 to-teal-600',
    features: ['Golden Rainbow VIP Passengers', 'Any-Bus Boarding Access', '+250 Bonus Coins per VIP'],
  },
};

export enum GameStatus {
  LOADING = 'LOADING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  VEHICLE_MOVING = 'VEHICLE_MOVING',
  PASSENGER_LOADING = 'PASSENGER_LOADING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  OUT_OF_TIME = 'OUT_OF_TIME',
}

export enum Direction {
  UP = 'UP',       // North / Towards Bus Terminal (-Row)
  DOWN = 'DOWN',   // South (+Row)
  LEFT = 'LEFT',   // West (-Col)
  RIGHT = 'RIGHT', // East (+Col)
}

export enum VehicleType {
  CAR = 'CAR',
  BUS = 'BUS',
  VAN = 'VAN',
  TRUCK = 'TRUCK',
  SPECIAL = 'SPECIAL',
}

export type VehicleColor = 'RED' | 'BLUE' | 'YELLOW' | 'GREEN' | 'PURPLE' | 'ORANGE' | 'PINK';

export const COLOR_MAP: Record<VehicleColor, { hex: string; name: string }> = {
  RED: { hex: '#EF4444', name: 'Red' },
  BLUE: { hex: '#2563EB', name: 'Blue' },
  YELLOW: { hex: '#EAB308', name: 'Yellow' },
  GREEN: { hex: '#22C55E', name: 'Green' },
  PURPLE: { hex: '#A855F7', name: 'Purple' },
  ORANGE: { hex: '#F97316', name: 'Orange' },
  PINK: { hex: '#EC4899', name: 'Pink' },
};

export enum VehicleStateType {
  PARKED = 'PARKED',
  SELECTED = 'SELECTED',
  MOVING = 'MOVING',
  BLOCKED = 'BLOCKED',
  DOCKED = 'DOCKED',
  EXITED = 'EXITED',
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface VehicleState {
  id: string;
  type: VehicleType;
  color: VehicleColor;
  gridPosition: GridPosition;
  direction: Direction;
  length: number; // e.g. 2 for Car, 3 for Bus
  width: number;  // 1 cell width
  state: VehicleStateType;
  capacity: number; // e.g. 3 for Car, 4 for Bus
  loadedPassengers: number;
  dockIndex?: number;
}

export interface PassengerState {
  id: string;
  color: VehicleColor;
  state: 'WAITING' | 'BOARDING' | 'LOADED';
  isVip?: boolean;
}

export interface ParkingSlotState {
  index: number;
  isUnlocked: boolean;
  vehicleId: string | null;
}

export interface BoosterState {
  undo: number;
  hint: number;
  shuffle: number;
  extraSpace: number;
  passengerSwap: number;
}

export interface GameState {
  levelId: number;
  levelName: string;
  worldId: number;
  moves: number;
  parMoves: number;
  coins: number;
  score: number;
  gridRows: number;
  gridCols: number;
  vehicles: VehicleState[];
  passengers: PassengerState[];
  parkingSlots: ParkingSlotState[];
  availableBoosters: BoosterState;
  status: GameStatus;
  difficulty: Difficulty;
  gameMode: GameMode;
  timeLeft: number;
  totalTime: number;
  activeHintVehicleId: string | null;
  hintMessage: string;
  comboCount: number;
  unlockedDocksCount: number;
  objective: string;
  timeBonusAlert?: number | null;
  vipBonusCoins?: number;
}
