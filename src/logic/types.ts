export enum GameStatus {
  LOADING = 'LOADING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  VEHICLE_MOVING = 'VEHICLE_MOVING',
  PASSENGER_LOADING = 'PASSENGER_LOADING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
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
  activeHintVehicleId: string | null;
  hintMessage: string;
  comboCount: number;
  unlockedDocksCount: number;
}
