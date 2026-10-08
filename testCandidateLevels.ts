import { LogicalGrid } from './src/logic/logicalGrid.ts';
import { PathFinder } from './src/logic/pathFinder.ts';
import { Direction, VehicleType, VehicleColor, VehicleStateType } from './src/logic/types.ts';
import { LevelData } from './src/logic/levelRepository.ts';

function testLevel(lvl: LevelData): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const isHorizontal = (d: Direction) => d === Direction.LEFT || d === Direction.RIGHT;

  // Bounds
  for (const v of lvl.vehicles) {
    const endRow = isHorizontal(v.direction) ? v.row : v.row + v.length - 1;
    const endCol = isHorizontal(v.direction) ? v.col + v.length - 1 : v.col;
    if (v.row < 0 || endRow >= lvl.grid.rows || v.col < 0 || endCol >= lvl.grid.cols) {
      errors.push(`Bounds error on ${v.id}: ${v.row}..${endRow}/${lvl.grid.rows}, ${v.col}..${endCol}/${lvl.grid.cols}`);
    }
  }

  // Overlap
  const occ = new Map<string, string>();
  for (const v of lvl.vehicles) {
    for (let i = 0; i < v.length; i++) {
      const r = isHorizontal(v.direction) ? v.row : v.row + i;
      const c = isHorizontal(v.direction) ? v.col + i : v.col;
      const key = `${r},${c}`;
      if (occ.has(key)) {
        errors.push(`Collision at (${key}) between ${v.id} and ${occ.get(key)}`);
      } else {
        occ.set(key, v.id);
      }
    }
  }

  // Solvability via BFS / greedy
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

  const grid = new LogicalGrid(lvl.grid.rows, lvl.grid.cols);
  let cleared = 0;
  while (cleared < simVehicles.length) {
    grid.rebuild(simVehicles);
    const moves = PathFinder.getAvailableMoves(simVehicles, grid);
    if (moves.length === 0) {
      errors.push(`Stuck! Cleared ${cleared}/${simVehicles.length}`);
      break;
    }
    const toClear = simVehicles.find((v) => v.id === moves[0].id);
    if (toClear) {
      toClear.state = VehicleStateType.EXITED;
      cleared++;
    }
  }

  return { ok: errors.length === 0, errors };
}

// LEVEL 5: Crossroad Crisis
const level5: LevelData = {
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
  passengers: [],
};
console.log('Level 5 test:', testLevel(level5));

// LEVEL 6: Grand Terminal Jam
const level6: LevelData = {
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
  passengers: [],
};
console.log('Level 6 test:', testLevel(level6));
