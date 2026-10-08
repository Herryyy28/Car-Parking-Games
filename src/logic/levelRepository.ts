import {
  Difficulty,
  DIFFICULTY_CONFIGS,
  Direction,
  GameState,
  GameStatus,
  PassengerState,
  VehicleColor,
  VehicleState,
  VehicleStateType,
  VehicleType,
} from './types.ts';
import { ProceduralLevelGenerator } from './proceduralLevelGenerator.ts';

export interface LevelData {
  id: number;
  name: string;
  world: number;
  parMoves: number;
  timeLimit: number; // in seconds
  objective?: string;
  grid: {
    rows: number;
    cols: number;
  };
  vehicles: Array<{
    id: string;
    type: VehicleType;
    color: VehicleColor;
    row: number;
    col: number;
    direction: Direction;
    length: number;
    capacity: number;
  }>;
  passengers: Array<{
    id: string;
    color: VehicleColor;
  }>;
}

export const LEVELS_DATA: LevelData[] = [
  // ========================================================
  // LEVEL 1: First Commute (Tutorial: Tap to move free cars)
  // ========================================================
  {
    id: 1,
    name: 'First Commute',
    world: 1,
    parMoves: 15,
    timeLimit: 60,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l1_v1', type: VehicleType.BUS, color: 'RED', row: 1, col: 3, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l1_v2', type: VehicleType.CAR, color: 'BLUE', row: 4, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l1_v3', type: VehicleType.CAR, color: 'GREEN', row: 4, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
    ],
    passengers: [
      { id: 'l1_p1', color: 'RED' },
      { id: 'l1_p2', color: 'RED' },
      { id: 'l1_p3', color: 'RED' },
      { id: 'l1_p4', color: 'RED' },
      { id: 'l1_p5', color: 'BLUE' },
      { id: 'l1_p6', color: 'BLUE' },
      { id: 'l1_p7', color: 'BLUE' },
      { id: 'l1_p8', color: 'GREEN' },
      { id: 'l1_p9', color: 'GREEN' },
      { id: 'l1_p10', color: 'GREEN' },
    ],
  },

  // ========================================================
  // LEVEL 2: Lane Unlocking (Tutorial: Moving outer cars to free inner bus)
  // ========================================================
  {
    id: 2,
    name: 'Lane Unlocking',
    world: 1,
    parMoves: 20,
    timeLimit: 75,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      // Top car opens path
      { id: 'l2_v1', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 3, direction: Direction.UP, length: 2, capacity: 3 },
      // Trapped bus behind car
      { id: 'l2_v2', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 3, direction: Direction.UP, length: 3, capacity: 4 },
      // Horizontal cross cars
      { id: 'l2_v3', type: VehicleType.CAR, color: 'RED', row: 5, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l2_v4', type: VehicleType.VAN, color: 'YELLOW', row: 5, col: 3, direction: Direction.DOWN, length: 2, capacity: 4 },
      { id: 'l2_v5', type: VehicleType.CAR, color: 'RED', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
    ],
    passengers: [
      { id: 'l2_p1', color: 'YELLOW' },
      { id: 'l2_p2', color: 'YELLOW' },
      { id: 'l2_p3', color: 'YELLOW' },
      { id: 'l2_p4', color: 'BLUE' },
      { id: 'l2_p5', color: 'BLUE' },
      { id: 'l2_p6', color: 'BLUE' },
      { id: 'l2_p7', color: 'BLUE' },
      { id: 'l2_p8', color: 'RED' },
      { id: 'l2_p9', color: 'RED' },
      { id: 'l2_p10', color: 'RED' },
      { id: 'l2_p11', color: 'YELLOW' },
      { id: 'l2_p12', color: 'YELLOW' },
      { id: 'l2_p13', color: 'YELLOW' },
      { id: 'l2_p14', color: 'YELLOW' },
      { id: 'l2_p15', color: 'RED' },
      { id: 'l2_p16', color: 'RED' },
      { id: 'l2_p17', color: 'RED' },
    ],
  },

  // ========================================================
  // LEVEL 3: Spiral Downtown (Complex dependency loop)
  // ========================================================
  {
    id: 3,
    name: 'Spiral Downtown',
    world: 1,
    parMoves: 26,
    timeLimit: 90,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l3_v1', type: VehicleType.BUS, color: 'PINK', row: 0, col: 1, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l3_v2', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l3_v3', type: VehicleType.BUS, color: 'BLUE', row: 1, col: 5, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l3_v4', type: VehicleType.CAR, color: 'GREEN', row: 6, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l3_v5', type: VehicleType.BUS, color: 'RED', row: 6, col: 1, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l3_v6', type: VehicleType.CAR, color: 'PURPLE', row: 3, col: 0, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l3_v7', type: VehicleType.BUS, color: 'ORANGE', row: 2, col: 2, direction: Direction.UP, length: 2, capacity: 4 },
      { id: 'l3_v8', type: VehicleType.BUS, color: 'YELLOW', row: 3, col: 3, direction: Direction.DOWN, length: 2, capacity: 4 },
    ],
    passengers: [
      { id: 'l3_p1', color: 'PINK' }, { id: 'l3_p2', color: 'PINK' }, { id: 'l3_p3', color: 'PINK' }, { id: 'l3_p4', color: 'PINK' },
      { id: 'l3_p5', color: 'YELLOW' }, { id: 'l3_p6', color: 'YELLOW' }, { id: 'l3_p7', color: 'YELLOW' },
      { id: 'l3_p8', color: 'BLUE' }, { id: 'l3_p9', color: 'BLUE' }, { id: 'l3_p10', color: 'BLUE' }, { id: 'l3_p11', color: 'BLUE' },
      { id: 'l3_p12', color: 'GREEN' }, { id: 'l3_p13', color: 'GREEN' }, { id: 'l3_p14', color: 'GREEN' },
      { id: 'l3_p15', color: 'RED' }, { id: 'l3_p16', color: 'RED' }, { id: 'l3_p17', color: 'RED' }, { id: 'l3_p18', color: 'RED' },
      { id: 'l3_p19', color: 'PURPLE' }, { id: 'l3_p20', color: 'PURPLE' }, { id: 'l3_p21', color: 'PURPLE' },
      { id: 'l3_p22', color: 'ORANGE' }, { id: 'l3_p23', color: 'ORANGE' }, { id: 'l3_p24', color: 'ORANGE' }, { id: 'l3_p25', color: 'ORANGE' },
      { id: 'l3_p26', color: 'YELLOW' }, { id: 'l3_p27', color: 'YELLOW' }, { id: 'l3_p28', color: 'YELLOW' }, { id: 'l3_p29', color: 'YELLOW' },
    ],
  },

  // ========================================================
  // LEVEL 4: Butterfly Wings (Symmetric interlocking)
  // ========================================================
  {
    id: 4,
    name: 'Butterfly Logic',
    world: 1,
    parMoves: 30,
    timeLimit: 105,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l4_v1', type: VehicleType.CAR, color: 'ORANGE', row: 0, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l4_v2', type: VehicleType.CAR, color: 'ORANGE', row: 0, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l4_v3', type: VehicleType.BUS, color: 'BLUE', row: 0, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l4_v4', type: VehicleType.BUS, color: 'BLUE', row: 0, col: 4, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l4_v5', type: VehicleType.BUS, color: 'RED', row: 1, col: 3, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l4_v6', type: VehicleType.CAR, color: 'GREEN', row: 5, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l4_v7', type: VehicleType.CAR, color: 'GREEN', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l4_v8', type: VehicleType.BUS, color: 'PURPLE', row: 4, col: 2, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l4_v9', type: VehicleType.BUS, color: 'PURPLE', row: 4, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
    ],
    passengers: [
      { id: 'l4_p1', color: 'ORANGE' }, { id: 'l4_p2', color: 'ORANGE' }, { id: 'l4_p3', color: 'ORANGE' },
      { id: 'l4_p4', color: 'BLUE' }, { id: 'l4_p5', color: 'BLUE' }, { id: 'l4_p6', color: 'BLUE' }, { id: 'l4_p7', color: 'BLUE' },
      { id: 'l4_p8', color: 'ORANGE' }, { id: 'l4_p9', color: 'ORANGE' }, { id: 'l4_p10', color: 'ORANGE' },
      { id: 'l4_p11', color: 'BLUE' }, { id: 'l4_p12', color: 'BLUE' }, { id: 'l4_p13', color: 'BLUE' }, { id: 'l4_p14', color: 'BLUE' },
      { id: 'l4_p15', color: 'RED' }, { id: 'l4_p16', color: 'RED' }, { id: 'l4_p17', color: 'RED' }, { id: 'l4_p18', color: 'RED' },
      { id: 'l4_p19', color: 'GREEN' }, { id: 'l4_p20', color: 'GREEN' }, { id: 'l4_p21', color: 'GREEN' },
      { id: 'l4_p22', color: 'GREEN' }, { id: 'l4_p23', color: 'GREEN' }, { id: 'l4_p24', color: 'GREEN' },
      { id: 'l4_p25', color: 'PURPLE' }, { id: 'l4_p26', color: 'PURPLE' }, { id: 'l4_p27', color: 'PURPLE' }, { id: 'l4_p28', color: 'PURPLE' },
      { id: 'l4_p29', color: 'PURPLE' }, { id: 'l4_p30', color: 'PURPLE' }, { id: 'l4_p31', color: 'PURPLE' }, { id: 'l4_p32', color: 'PURPLE' },
    ],
  },

  // ========================================================
  // LEVEL 5: Crossroad Crisis (Interlocking perpendicular lanes)
  // ========================================================
  {
    id: 5,
    name: 'Crossroad Crisis',
    world: 1,
    parMoves: 34,
    timeLimit: 120,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l5_v1', type: VehicleType.BUS, color: 'RED', row: 0, col: 1, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l5_v2', type: VehicleType.BUS, color: 'PINK', row: 0, col: 5, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l5_v3', type: VehicleType.CAR, color: 'YELLOW', row: 1, col: 3, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l5_v4', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 2, direction: Direction.RIGHT, length: 3, capacity: 4 },
      { id: 'l5_v5', type: VehicleType.CAR, color: 'YELLOW', row: 3, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l5_v6', type: VehicleType.BUS, color: 'GREEN', row: 4, col: 1, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l5_v7', type: VehicleType.BUS, color: 'RED', row: 4, col: 5, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l5_v8', type: VehicleType.CAR, color: 'GREEN', row: 6, col: 2, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l5_v9', type: VehicleType.BUS, color: 'BLUE', row: 4, col: 2, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l5_v10', type: VehicleType.BUS, color: 'PINK', row: 3, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
    ],
    passengers: [
      { id: 'l5_p1', color: 'RED' }, { id: 'l5_p2', color: 'RED' }, { id: 'l5_p3', color: 'RED' }, { id: 'l5_p4', color: 'RED' },
      { id: 'l5_p5', color: 'PINK' }, { id: 'l5_p6', color: 'PINK' }, { id: 'l5_p7', color: 'PINK' }, { id: 'l5_p8', color: 'PINK' },
      { id: 'l5_p9', color: 'YELLOW' }, { id: 'l5_p10', color: 'YELLOW' }, { id: 'l5_p11', color: 'YELLOW' },
      { id: 'l5_p12', color: 'YELLOW' }, { id: 'l5_p13', color: 'YELLOW' }, { id: 'l5_p14', color: 'YELLOW' },
      { id: 'l5_p15', color: 'BLUE' }, { id: 'l5_p16', color: 'BLUE' }, { id: 'l5_p17', color: 'BLUE' }, { id: 'l5_p18', color: 'BLUE' },
      { id: 'l5_p19', color: 'GREEN' }, { id: 'l5_p20', color: 'GREEN' }, { id: 'l5_p21', color: 'GREEN' }, { id: 'l5_p22', color: 'GREEN' },
      { id: 'l5_p23', color: 'RED' }, { id: 'l5_p24', color: 'RED' }, { id: 'l5_p25', color: 'RED' }, { id: 'l5_p26', color: 'RED' },
      { id: 'l5_p27', color: 'GREEN' }, { id: 'l5_p28', color: 'GREEN' }, { id: 'l5_p29', color: 'GREEN' },
      { id: 'l5_p30', color: 'BLUE' }, { id: 'l5_p31', color: 'BLUE' }, { id: 'l5_p32', color: 'BLUE' }, { id: 'l5_p33', color: 'BLUE' },
      { id: 'l5_p34', color: 'PINK' }, { id: 'l5_p35', color: 'PINK' }, { id: 'l5_p36', color: 'PINK' }, { id: 'l5_p37', color: 'PINK' },
    ],
  },

  // ========================================================
  // LEVEL 6: Grand Terminal Jam (Master Level)
  // ========================================================
  {
    id: 6,
    name: 'Grand Terminal Jam',
    world: 2,
    parMoves: 40,
    timeLimit: 135,
    grid: { rows: 8, cols: 8 },
    vehicles: [
      { id: 'l6_v1', type: VehicleType.BUS, color: 'PURPLE', row: 0, col: 1, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l6_v2', type: VehicleType.BUS, color: 'ORANGE', row: 0, col: 6, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l6_v3', type: VehicleType.CAR, color: 'RED', row: 1, col: 2, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l6_v4', type: VehicleType.CAR, color: 'BLUE', row: 1, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l6_v5', type: VehicleType.BUS, color: 'YELLOW', row: 3, col: 0, direction: Direction.LEFT, length: 3, capacity: 4 },
      { id: 'l6_v6', type: VehicleType.BUS, color: 'GREEN', row: 2, col: 3, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l6_v7', type: VehicleType.BUS, color: 'YELLOW', row: 3, col: 5, direction: Direction.RIGHT, length: 3, capacity: 4 },
      { id: 'l6_v8', type: VehicleType.CAR, color: 'RED', row: 5, col: 2, direction: Direction.DOWN, length: 2, capacity: 3 },
      { id: 'l6_v9', type: VehicleType.BUS, color: 'BLUE', row: 5, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l6_v10', type: VehicleType.CAR, color: 'PINK', row: 7, col: 2, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l6_v11', type: VehicleType.BUS, color: 'PURPLE', row: 5, col: 1, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l6_v12', type: VehicleType.BUS, color: 'PINK', row: 5, col: 6, direction: Direction.DOWN, length: 3, capacity: 4 },
    ],
    passengers: [
      { id: 'l6_p1', color: 'PURPLE' }, { id: 'l6_p2', color: 'PURPLE' }, { id: 'l6_p3', color: 'PURPLE' }, { id: 'l6_p4', color: 'PURPLE' },
      { id: 'l6_p5', color: 'ORANGE' }, { id: 'l6_p6', color: 'ORANGE' }, { id: 'l6_p7', color: 'ORANGE' }, { id: 'l6_p8', color: 'ORANGE' },
      { id: 'l6_p9', color: 'RED' }, { id: 'l6_p10', color: 'RED' }, { id: 'l6_p11', color: 'RED' },
      { id: 'l6_p12', color: 'BLUE' }, { id: 'l6_p13', color: 'BLUE' }, { id: 'l6_p14', color: 'BLUE' },
      { id: 'l6_p15', color: 'YELLOW' }, { id: 'l6_p16', color: 'YELLOW' }, { id: 'l6_p17', color: 'YELLOW' }, { id: 'l6_p18', color: 'YELLOW' },
      { id: 'l6_p19', color: 'GREEN' }, { id: 'l6_p20', color: 'GREEN' }, { id: 'l6_p21', color: 'GREEN' }, { id: 'l6_p22', color: 'GREEN' },
      { id: 'l6_p23', color: 'YELLOW' }, { id: 'l6_p24', color: 'YELLOW' }, { id: 'l6_p25', color: 'YELLOW' }, { id: 'l6_p26', color: 'YELLOW' },
      { id: 'l6_p27', color: 'RED' }, { id: 'l6_p28', color: 'RED' }, { id: 'l6_p29', color: 'RED' },
      { id: 'l6_p30', color: 'BLUE' }, { id: 'l6_p31', color: 'BLUE' }, { id: 'l6_p32', color: 'BLUE' }, { id: 'l6_p33', color: 'BLUE' },
      { id: 'l6_p34', color: 'PINK' }, { id: 'l6_p35', color: 'PINK' }, { id: 'l6_p36', color: 'PINK' },
      { id: 'l6_p37', color: 'PURPLE' }, { id: 'l6_p38', color: 'PURPLE' }, { id: 'l6_p39', color: 'PURPLE' }, { id: 'l6_p40', color: 'PURPLE' },
      { id: 'l6_p41', color: 'PINK' }, { id: 'l6_p42', color: 'PINK' }, { id: 'l6_p43', color: 'PINK' }, { id: 'l6_p44', color: 'PINK' },
    ],
  },
];

export class LevelRepository {
  private static cachedLevels: LevelData[] | null = null;

  public static getAllLevels(): LevelData[] {
    if (this.cachedLevels) return this.cachedLevels;
    const list = [...LEVELS_DATA];
    for (let i = 7; i <= 40; i++) {
      list.push(ProceduralLevelGenerator.generateLevel(i, Difficulty.HARD));
    }
    this.cachedLevels = list;
    return list;
  }

  public static getLevel(id: number, difficulty: Difficulty = Difficulty.HARD): LevelData {
    const all = this.getAllLevels();
    const found = all.find((l) => l.id === id);
    if (found) return found;
    return ProceduralLevelGenerator.generateLevel(id, difficulty);
  }

  public static createInitialGameState(
    levelId: number,
    coins = 1000,
    difficulty: Difficulty = Difficulty.HARD
  ): GameState {
    const data = this.getLevel(levelId, difficulty);

    const vehicles: VehicleState[] = data.vehicles.map((v) => ({
      id: v.id,
      type: v.type,
      color: v.color,
      gridPosition: { row: v.row, col: v.col },
      direction: v.direction,
      length: v.length,
      width: 1,
      state: VehicleStateType.PARKED,
      capacity: v.capacity,
      loadedPassengers: 0,
    }));

    const passengers: PassengerState[] = data.passengers.map((p) => ({
      id: p.id,
      color: p.color,
      state: 'WAITING',
    }));

    const parkingSlots = [
      { index: 0, isUnlocked: true, vehicleId: null },
      { index: 1, isUnlocked: true, vehicleId: null },
      { index: 2, isUnlocked: true, vehicleId: null },
      { index: 3, isUnlocked: true, vehicleId: null },
      { index: 4, isUnlocked: false, vehicleId: null },
      { index: 5, isUnlocked: false, vehicleId: null },
    ];

    const diffConfig = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS[Difficulty.HARD];
    const baseTime = data.timeLimit || 75;
    const adjustedTime = Math.max(25, Math.round(baseTime * diffConfig.timeMultiplier));
    const baseMoves = data.parMoves;
    const adjustedMoves = Math.max(10, Math.round(baseMoves * diffConfig.moveMultiplier));

    return {
      levelId: data.id,
      levelName: data.name,
      worldId: data.world || 1,
      moves: adjustedMoves,
      parMoves: adjustedMoves,
      timeLeft: adjustedTime,
      totalTime: adjustedTime,
      coins,
      score: 0,
      gridRows: data.grid.rows,
      gridCols: data.grid.cols,
      vehicles,
      passengers,
      parkingSlots,
      availableBoosters: {
        undo: 5,
        hint: 3,
        shuffle: 3,
        extraSpace: 2,
        passengerSwap: 2,
      },
      status: GameStatus.READY,
      difficulty,
      activeHintVehicleId: null,
      hintMessage: 'Tap an unblocked vehicle pointing to an open road!',
      comboCount: 0,
      unlockedDocksCount: 4,
      objective: data.objective || 'CLEAR THE TRAFFIC & MATCH PASSENGERS',
    };
  }
}
