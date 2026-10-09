import { Direction, VehicleType, VehicleColor, VehicleStateType } from '../src/logic/types.ts';
import { LevelData } from '../src/logic/levelRepository.ts';
import { LogicalGrid } from '../src/logic/logicalGrid.ts';
import { PathFinder } from '../src/logic/pathFinder.ts';
import { PuzzleSolver } from '../src/logic/puzzleSolver.ts';

// Helper to construct passengers matching vehicles
function createPassengers(vehicles: Array<{ color: VehicleColor; capacity: number }>, orderVehicleIds: number[]): Array<{ id: string; color: VehicleColor }> {
  const result: Array<{ id: string; color: VehicleColor }> = [];
  let pIdx = 1;
  for (const vIdx of orderVehicleIds) {
    const v = vehicles[vIdx];
    for (let c = 0; c < v.capacity; c++) {
      result.push({ id: `p_${pIdx++}`, color: v.color });
    }
  }
  return result;
}

export const CANDIDATE_LEVELS: LevelData[] = [
  // LEVEL 7: Parallel Transit
  {
    id: 7,
    name: 'Parallel Transit',
    world: 1,
    parMoves: 22,
    timeLimit: 85,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l7_v1', type: VehicleType.CAR, color: 'GREEN', row: 0, col: 2, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l7_v2', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 4, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l7_v3', type: VehicleType.BUS, color: 'RED', row: 2, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l7_v4', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 4, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l7_v5', type: VehicleType.CAR, color: 'GREEN', row: 5, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l7_v6', type: VehicleType.CAR, color: 'YELLOW', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l7_v7', type: VehicleType.VAN, color: 'RED', row: 5, col: 2, direction: Direction.DOWN, length: 2, capacity: 4 },
      { id: 'l7_v8', type: VehicleType.VAN, color: 'BLUE', row: 5, col: 4, direction: Direction.DOWN, length: 2, capacity: 4 },
    ],
    passengers: [], // filled below
  },

  // LEVEL 8: The Zipper Junction (Interleaving left/right cars)
  {
    id: 8,
    name: 'The Zipper Junction',
    world: 1,
    parMoves: 24,
    timeLimit: 90,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l8_v1', type: VehicleType.CAR, color: 'PURPLE', row: 0, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l8_v2', type: VehicleType.CAR, color: 'ORANGE', row: 1, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l8_v3', type: VehicleType.BUS, color: 'BLUE', row: 1, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l8_v4', type: VehicleType.BUS, color: 'GREEN', row: 3, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l8_v5', type: VehicleType.CAR, color: 'PURPLE', row: 3, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l8_v6', type: VehicleType.CAR, color: 'ORANGE', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l8_v7', type: VehicleType.VAN, color: 'YELLOW', row: 5, col: 2, direction: Direction.DOWN, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 9: Cornerstone Pocket (Perimeter clearance)
  {
    id: 9,
    name: 'Cornerstone Pocket',
    world: 1,
    parMoves: 26,
    timeLimit: 95,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l9_v1', type: VehicleType.CAR, color: 'RED', row: 0, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l9_v2', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l9_v3', type: VehicleType.BUS, color: 'GREEN', row: 2, col: 1, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l9_v4', type: VehicleType.BUS, color: 'YELLOW', row: 2, col: 5, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l9_v5', type: VehicleType.VAN, color: 'RED', row: 3, col: 3, direction: Direction.UP, length: 2, capacity: 4 },
      { id: 'l9_v6', type: VehicleType.CAR, color: 'BLUE', row: 6, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l9_v7', type: VehicleType.BUS, color: 'GREEN', row: 5, col: 3, direction: Direction.DOWN, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 10: Milestone: Metro Express
  {
    id: 10,
    name: 'Milestone: Metro Express',
    world: 1,
    parMoves: 28,
    timeLimit: 100,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l10_v1', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l10_v2', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l10_v3', type: VehicleType.BUS, color: 'RED', row: 0, col: 3, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l10_v4', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 1, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l10_v5', type: VehicleType.BUS, color: 'GREEN', row: 2, col: 4, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l10_v6', type: VehicleType.VAN, color: 'PURPLE', row: 4, col: 3, direction: Direction.DOWN, length: 2, capacity: 4 },
      { id: 'l10_v7', type: VehicleType.CAR, color: 'BLUE', row: 5, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l10_v8', type: VehicleType.CAR, color: 'GREEN', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
    ],
    passengers: [],
  },

  // LEVEL 11: T-Bone Crossway
  {
    id: 11,
    name: 'T-Bone Crossway',
    world: 1,
    parMoves: 26,
    timeLimit: 95,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l11_v1', type: VehicleType.CAR, color: 'ORANGE', row: 0, col: 2, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l11_v2', type: VehicleType.CAR, color: 'ORANGE', row: 0, col: 4, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l11_v3', type: VehicleType.BUS, color: 'PURPLE', row: 2, col: 1, direction: Direction.RIGHT, length: 3, capacity: 4 },
      { id: 'l11_v4', type: VehicleType.BUS, color: 'YELLOW', row: 3, col: 3, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l11_v5', type: VehicleType.CAR, color: 'RED', row: 5, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l11_v6', type: VehicleType.CAR, color: 'BLUE', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l11_v7', type: VehicleType.BUS, color: 'PURPLE', row: 6, col: 2, direction: Direction.LEFT, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 12: The Roundabout Maze
  {
    id: 12,
    name: 'The Roundabout Maze',
    world: 1,
    parMoves: 30,
    timeLimit: 105,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l12_v1', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 2, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l12_v2', type: VehicleType.BUS, color: 'GREEN', row: 1, col: 5, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l12_v3', type: VehicleType.CAR, color: 'RED', row: 5, col: 3, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l12_v4', type: VehicleType.BUS, color: 'YELLOW', row: 3, col: 1, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l12_v5', type: VehicleType.VAN, color: 'BLUE', row: 2, col: 3, direction: Direction.UP, length: 2, capacity: 4 },
      { id: 'l12_v6', type: VehicleType.CAR, color: 'GREEN', row: 4, col: 2, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l12_v7', type: VehicleType.VAN, color: 'RED', row: 3, col: 4, direction: Direction.DOWN, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 13: Gridlock Alley
  {
    id: 13,
    name: 'Gridlock Alley',
    world: 1,
    parMoves: 32,
    timeLimit: 110,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l13_v1', type: VehicleType.CAR, color: 'PINK', row: 0, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l13_v2', type: VehicleType.CAR, color: 'PINK', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l13_v3', type: VehicleType.BUS, color: 'RED', row: 1, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l13_v4', type: VehicleType.BUS, color: 'BLUE', row: 1, col: 5, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l13_v5', type: VehicleType.CAR, color: 'GREEN', row: 4, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l13_v6', type: VehicleType.BUS, color: 'RED', row: 4, col: 2, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l13_v7', type: VehicleType.CAR, color: 'YELLOW', row: 5, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
    ],
    passengers: [],
  },

  // LEVEL 14: Double Trouble
  {
    id: 14,
    name: 'Double Trouble',
    world: 1,
    parMoves: 30,
    timeLimit: 105,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l14_v1', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l14_v2', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l14_v3', type: VehicleType.BUS, color: 'RED', row: 1, col: 1, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l14_v4', type: VehicleType.BUS, color: 'RED', row: 1, col: 4, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l14_v5', type: VehicleType.VAN, color: 'YELLOW', row: 3, col: 2, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l14_v6', type: VehicleType.CAR, color: 'GREEN', row: 5, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l14_v7', type: VehicleType.BUS, color: 'BLUE', row: 4, col: 3, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l14_v8', type: VehicleType.CAR, color: 'GREEN', row: 6, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
    ],
    passengers: [],
  },

  // LEVEL 15: Milestone: Central Interchange
  {
    id: 15,
    name: 'Milestone: Central Interchange',
    world: 1,
    parMoves: 34,
    timeLimit: 120,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l15_v1', type: VehicleType.CAR, color: 'PURPLE', row: 0, col: 2, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l15_v2', type: VehicleType.CAR, color: 'ORANGE', row: 0, col: 4, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l15_v3', type: VehicleType.BUS, color: 'YELLOW', row: 2, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l15_v4', type: VehicleType.BUS, color: 'RED', row: 2, col: 5, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l15_v5', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 2, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l15_v6', type: VehicleType.BUS, color: 'GREEN', row: 2, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l15_v7', type: VehicleType.VAN, color: 'PURPLE', row: 5, col: 1, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l15_v8', type: VehicleType.VAN, color: 'ORANGE', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 16: The Hourglass
  {
    id: 16,
    name: 'The Hourglass',
    world: 1,
    parMoves: 32,
    timeLimit: 115,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l16_v1', type: VehicleType.CAR, color: 'RED', row: 0, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l16_v2', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l16_v3', type: VehicleType.BUS, color: 'GREEN', row: 1, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l16_v4', type: VehicleType.BUS, color: 'YELLOW', row: 1, col: 4, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l16_v5', type: VehicleType.VAN, color: 'RED', row: 3, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l16_v6', type: VehicleType.VAN, color: 'BLUE', row: 3, col: 5, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l16_v7', type: VehicleType.BUS, color: 'PURPLE', row: 4, col: 3, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l16_v8', type: VehicleType.CAR, color: 'GREEN', row: 6, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
    ],
    passengers: [],
  },

  // LEVEL 17: Crosswind Depot
  {
    id: 17,
    name: 'Crosswind Depot',
    world: 1,
    parMoves: 32,
    timeLimit: 115,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l17_v1', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 1, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l17_v2', type: VehicleType.CAR, color: 'PURPLE', row: 0, col: 5, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l17_v3', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l17_v4', type: VehicleType.BUS, color: 'RED', row: 2, col: 3, direction: Direction.RIGHT, length: 3, capacity: 4 },
      { id: 'l17_v5', type: VehicleType.VAN, color: 'GREEN', row: 3, col: 2, direction: Direction.UP, length: 2, capacity: 4 },
      { id: 'l17_v6', type: VehicleType.BUS, color: 'YELLOW', row: 4, col: 1, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l17_v7', type: VehicleType.CAR, color: 'PURPLE', row: 4, col: 5, direction: Direction.DOWN, length: 2, capacity: 3 },
      { id: 'l17_v8', type: VehicleType.VAN, color: 'BLUE', row: 6, col: 3, direction: Direction.RIGHT, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 18: Symmetric Split
  {
    id: 18,
    name: 'Symmetric Split',
    world: 1,
    parMoves: 34,
    timeLimit: 120,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l18_v1', type: VehicleType.CAR, color: 'ORANGE', row: 0, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l18_v2', type: VehicleType.CAR, color: 'ORANGE', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l18_v3', type: VehicleType.BUS, color: 'RED', row: 1, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l18_v4', type: VehicleType.BUS, color: 'BLUE', row: 1, col: 4, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l18_v5', type: VehicleType.CAR, color: 'GREEN', row: 4, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l18_v6', type: VehicleType.CAR, color: 'GREEN', row: 4, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l18_v7', type: VehicleType.BUS, color: 'YELLOW', row: 4, col: 2, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l18_v8', type: VehicleType.BUS, color: 'PURPLE', row: 4, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 19: The Spiral Exit
  {
    id: 19,
    name: 'The Spiral Exit',
    world: 1,
    parMoves: 36,
    timeLimit: 125,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l19_v1', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l19_v2', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l19_v3', type: VehicleType.BUS, color: 'PINK', row: 1, col: 6, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l19_v4', type: VehicleType.BUS, color: 'GREEN', row: 5, col: 4, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l19_v5', type: VehicleType.BUS, color: 'RED', row: 4, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l19_v6', type: VehicleType.BUS, color: 'YELLOW', row: 1, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l19_v7', type: VehicleType.VAN, color: 'PINK', row: 3, col: 3, direction: Direction.UP, length: 2, capacity: 4 },
      { id: 'l19_v8', type: VehicleType.CAR, color: 'GREEN', row: 5, col: 1, direction: Direction.DOWN, length: 2, capacity: 3 },
    ],
    passengers: [],
  },

  // LEVEL 20: Milestone: Golden Terminal
  {
    id: 20,
    name: 'Milestone: Golden Terminal',
    world: 1,
    parMoves: 38,
    timeLimit: 130,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l20_v1', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 1, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l20_v2', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 6, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l20_v3', type: VehicleType.BUS, color: 'PURPLE', row: 1, col: 2, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l20_v4', type: VehicleType.BUS, color: 'ORANGE', row: 1, col: 4, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l20_v5', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 3, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l20_v6', type: VehicleType.VAN, color: 'RED', row: 3, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l20_v7', type: VehicleType.VAN, color: 'GREEN', row: 3, col: 5, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l20_v8', type: VehicleType.BUS, color: 'BLUE', row: 4, col: 1, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l20_v9', type: VehicleType.BUS, color: 'RED', row: 4, col: 5, direction: Direction.DOWN, length: 3, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 21: Cascade Crossing
  {
    id: 21,
    name: 'Cascade Crossing',
    world: 1,
    parMoves: 36,
    timeLimit: 125,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l21_v1', type: VehicleType.CAR, color: 'RED', row: 0, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l21_v2', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l21_v3', type: VehicleType.BUS, color: 'GREEN', row: 1, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l21_v4', type: VehicleType.BUS, color: 'YELLOW', row: 2, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l21_v5', type: VehicleType.VAN, color: 'RED', row: 3, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l21_v6', type: VehicleType.VAN, color: 'BLUE', row: 4, col: 1, direction: Direction.DOWN, length: 2, capacity: 4 },
      { id: 'l21_v7', type: VehicleType.BUS, color: 'PURPLE', row: 5, col: 3, direction: Direction.RIGHT, length: 3, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 22: Twin Express
  {
    id: 22,
    name: 'Twin Express',
    world: 1,
    parMoves: 38,
    timeLimit: 130,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l22_v1', type: VehicleType.CAR, color: 'GREEN', row: 0, col: 2, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l22_v2', type: VehicleType.CAR, color: 'GREEN', row: 0, col: 4, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l22_v3', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l22_v4', type: VehicleType.BUS, color: 'BLUE', row: 2, col: 4, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l22_v5', type: VehicleType.VAN, color: 'ORANGE', row: 4, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l22_v6', type: VehicleType.VAN, color: 'ORANGE', row: 4, col: 5, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l22_v7', type: VehicleType.BUS, color: 'RED', row: 5, col: 2, direction: Direction.DOWN, length: 2, capacity: 4 },
      { id: 'l22_v8', type: VehicleType.BUS, color: 'RED', row: 5, col: 4, direction: Direction.DOWN, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 23: The Labyrinth
  {
    id: 23,
    name: 'The Labyrinth',
    world: 1,
    parMoves: 40,
    timeLimit: 135,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l23_v1', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 1, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l23_v2', type: VehicleType.CAR, color: 'YELLOW', row: 0, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l23_v3', type: VehicleType.BUS, color: 'PURPLE', row: 1, col: 2, direction: Direction.UP, length: 3, capacity: 4 },
      { id: 'l23_v4', type: VehicleType.BUS, color: 'BLUE', row: 1, col: 5, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l23_v5', type: VehicleType.VAN, color: 'RED', row: 3, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l23_v6', type: VehicleType.VAN, color: 'GREEN', row: 4, col: 3, direction: Direction.UP, length: 2, capacity: 4 },
      { id: 'l23_v7', type: VehicleType.BUS, color: 'PURPLE', row: 4, col: 1, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l23_v8', type: VehicleType.CAR, color: 'RED', row: 6, col: 4, direction: Direction.RIGHT, length: 2, capacity: 3 },
    ],
    passengers: [],
  },

  // LEVEL 24: Diamond Lock
  {
    id: 24,
    name: 'Diamond Lock',
    world: 1,
    parMoves: 40,
    timeLimit: 135,
    grid: { rows: 7, cols: 7 },
    vehicles: [
      { id: 'l24_v1', type: VehicleType.CAR, color: 'PINK', row: 0, col: 3, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l24_v2', type: VehicleType.BUS, color: 'BLUE', row: 1, col: 1, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l24_v3', type: VehicleType.BUS, color: 'GREEN', row: 1, col: 4, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l24_v4', type: VehicleType.VAN, color: 'YELLOW', row: 2, col: 3, direction: Direction.DOWN, length: 2, capacity: 4 },
      { id: 'l24_v5', type: VehicleType.CAR, color: 'PINK', row: 3, col: 0, direction: Direction.LEFT, length: 2, capacity: 3 },
      { id: 'l24_v6', type: VehicleType.CAR, color: 'PINK', row: 3, col: 5, direction: Direction.RIGHT, length: 2, capacity: 3 },
      { id: 'l24_v7', type: VehicleType.BUS, color: 'RED', row: 4, col: 2, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l24_v8', type: VehicleType.BUS, color: 'RED', row: 4, col: 4, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l24_v9', type: VehicleType.VAN, color: 'BLUE', row: 5, col: 3, direction: Direction.DOWN, length: 2, capacity: 4 },
    ],
    passengers: [],
  },

  // LEVEL 25: Grand Chapter Finale: Metro Megacity (Master Finale of Chapter 1)
  {
    id: 25,
    name: 'Metro Megacity Finale',
    world: 1,
    parMoves: 44,
    timeLimit: 145,
    grid: { rows: 8, cols: 8 },
    vehicles: [
      { id: 'l25_v1', type: VehicleType.CAR, color: 'RED', row: 0, col: 1, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l25_v2', type: VehicleType.CAR, color: 'BLUE', row: 0, col: 6, direction: Direction.UP, length: 2, capacity: 3 },
      { id: 'l25_v3', type: VehicleType.BUS, color: 'YELLOW', row: 1, col: 2, direction: Direction.RIGHT, length: 3, capacity: 4 },
      { id: 'l25_v4', type: VehicleType.BUS, color: 'GREEN', row: 2, col: 0, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l25_v5', type: VehicleType.BUS, color: 'PURPLE', row: 2, col: 6, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l25_v6', type: VehicleType.VAN, color: 'ORANGE', row: 3, col: 3, direction: Direction.UP, length: 2, capacity: 4 },
      { id: 'l25_v7', type: VehicleType.BUS, color: 'RED', row: 3, col: 4, direction: Direction.DOWN, length: 3, capacity: 4 },
      { id: 'l25_v8', type: VehicleType.BUS, color: 'BLUE', row: 5, col: 1, direction: Direction.LEFT, length: 2, capacity: 4 },
      { id: 'l25_v9', type: VehicleType.BUS, color: 'GREEN', row: 5, col: 5, direction: Direction.RIGHT, length: 2, capacity: 4 },
      { id: 'l25_v10', type: VehicleType.CAR, color: 'YELLOW', row: 6, col: 2, direction: Direction.DOWN, length: 2, capacity: 3 },
    ],
    passengers: [],
  },
];

console.log('Testing and generating passenger sequences for Levels 7-25...');

for (const lvl of CANDIDATE_LEVELS) {
  // 1. Check bounds and overlaps
  const occupied = new Set<string>();
  let hasOverlap = false;
  let hasOOB = false;
  for (const v of lvl.vehicles) {
    const isH = v.direction === Direction.LEFT || v.direction === Direction.RIGHT;
    for (let i = 0; i < v.length; i++) {
      const r = isH ? v.row : v.row + i;
      const c = isH ? v.col + i : v.col;
      if (r < 0 || r >= lvl.grid.rows || c < 0 || c >= lvl.grid.cols) {
        console.error(`L${lvl.id} OOB: ${v.id} at (${r},${c})`);
        hasOOB = true;
      }
      const k = `${r},${c}`;
      if (occupied.has(k)) {
        console.error(`L${lvl.id} OVERLAP: ${v.id} at ${k}`);
        hasOverlap = true;
      }
      occupied.add(k);
    }
  }

  // 2. Compute spatial exit sequence using LogicalGrid
  const simVehicles = lvl.vehicles.map((v) => ({
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
  const lGrid = new LogicalGrid(lvl.grid.rows, lvl.grid.cols);
  const exitOrder: string[] = [];
  let cleared = 0;
  while (cleared < simVehicles.length) {
    lGrid.rebuild(simVehicles);
    const moves = PathFinder.getAvailableMoves(simVehicles, lGrid);
    if (moves.length === 0) break;
    // pick first move
    const m = moves[0];
    m.state = VehicleStateType.EXITED;
    exitOrder.push(m.id);
    cleared++;
  }

  if (cleared !== simVehicles.length) {
    console.error(`L${lvl.id} SPATIAL DEADLOCK! Cleared only ${cleared}/${simVehicles.length}`);
    continue;
  }

  // 3. Generate passenger queue based on spatial exit order
  // When vehicles exit in order, their passengers should be at the front of the queue
  const passengers: Array<{ id: string; color: VehicleColor }> = [];
  let pCount = 1;
  for (const vId of exitOrder) {
    const v = lvl.vehicles.find((x) => x.id === vId)!;
    for (let c = 0; c < v.capacity; c++) {
      passengers.push({ id: `l${lvl.id}_p${pCount++}`, color: v.color });
    }
  }
  lvl.passengers = passengers;

  // 4. Test PuzzleSolver
  const fullSimState = {
    vehicles: lvl.vehicles.map((v) => ({
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
    })),
    docks: [],
    queue: lvl.passengers.map((p) => ({ id: p.id, color: p.color })),
    unlockedDocksCount: 4,
  };

  const solverResult = PuzzleSolver.searchWinningSolution(
    fullSimState,
    lvl.grid.rows,
    lvl.grid.cols,
    2500
  );

  console.log(`Level ${lvl.id} (${lvl.name}): Solved=${solverResult.solved}, Steps=${solverResult.provenPath.length}, Vehicles=${lvl.vehicles.length}, Passengers=${passengers.length}`);
}
