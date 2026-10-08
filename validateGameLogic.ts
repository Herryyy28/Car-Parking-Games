import { LevelRepository } from './src/logic/levelRepository.ts';
import { LogicalGrid } from './src/logic/logicalGrid.ts';
import { PathFinder } from './src/logic/pathFinder.ts';
import { PuzzleSolver } from './src/logic/puzzleSolver.ts';
import { Direction, VehicleStateType, Difficulty } from './src/logic/types.ts';

console.log('=== RUNNING COMPREHENSIVE GAME LOGIC VALIDATION ===\n');

const allLevels = LevelRepository.getAllLevels();
console.log(`Total levels loaded: ${allLevels.length}`);

let boundsErrors = 0;
let overlapErrors = 0;
let capacityErrors = 0;
let unsolvableLevels = 0;

for (const level of allLevels) {
  const { id, name, grid, vehicles, passengers } = level;
  const isHorizontal = (d: Direction) => d === Direction.LEFT || d === Direction.RIGHT;

  // 1. Check Bounds
  for (const v of vehicles) {
    const endRow = isHorizontal(v.direction) ? v.row : v.row + v.length - 1;
    const endCol = isHorizontal(v.direction) ? v.col + v.length - 1 : v.col;

    if (v.row < 0 || endRow >= grid.rows || v.col < 0 || endCol >= grid.cols) {
      console.error(`[BOUNDS ERROR] Level ${id} (${name}) vehicle ${v.id} (${v.color} ${v.type}) out of bounds! row:${v.row}..${endRow}/${grid.rows}, col:${v.col}..${endCol}/${grid.cols}`);
      boundsErrors++;
    }
  }

  // 2. Check Overlaps
  const occupiedCells = new Map<string, string>();
  for (const v of vehicles) {
    for (let i = 0; i < v.length; i++) {
      const r = isHorizontal(v.direction) ? v.row : v.row + i;
      const c = isHorizontal(v.direction) ? v.col + i : v.col;
      const key = `${r},${c}`;
      if (occupiedCells.has(key)) {
        console.error(`[OVERLAP ERROR] Level ${id} (${name}) collision at (${key}) between ${v.id} and ${occupiedCells.get(key)}`);
        overlapErrors++;
      } else {
        occupiedCells.set(key, v.id);
      }
    }
  }

  // 3. Check Capacity & Color Matching
  const capByColor: Record<string, number> = {};
  for (const v of vehicles) {
    capByColor[v.color] = (capByColor[v.color] || 0) + v.capacity;
  }
  const passByColor: Record<string, number> = {};
  for (const p of passengers) {
    passByColor[p.color] = (passByColor[p.color] || 0) + 1;
  }

  for (const [color, count] of Object.entries(passByColor)) {
    const cap = capByColor[color] || 0;
    if (cap < count) {
      console.error(`[CAPACITY ERROR] Level ${id} (${name}) color ${color} has ${count} passengers but only ${cap} vehicle capacity!`);
      capacityErrors++;
    }
  }

  // 4. Check Solvability (Can all vehicles eventually exit?)
  const simVehicles = vehicles.map((v) => ({
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

  const lGrid = new LogicalGrid(grid.rows, grid.cols);
  let cleared = 0;
  let stuck = false;

  while (cleared < simVehicles.length && !stuck) {
    lGrid.rebuild(simVehicles);
    const moves = PathFinder.getAvailableMoves(simVehicles, lGrid);
    if (moves.length === 0) {
      stuck = true;
      break;
    }
    // Greedily pick the first available move
    const nextVeh = simVehicles.find((v) => v.id === moves[0].id);
    if (nextVeh) {
      nextVeh.state = VehicleStateType.EXITED;
      cleared++;
    }
  }

  if (stuck && cleared < simVehicles.length) {
    console.warn(`[SOLVABILITY WARNING] Level ${id} (${name}) greedy simulation cleared ${cleared}/${simVehicles.length} vehicles.`);
    unsolvableLevels++;
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Bounds Errors: ${boundsErrors}`);
console.log(`Overlap Errors: ${overlapErrors}`);
console.log(`Capacity Errors: ${capacityErrors}`);
console.log(`Unsolvable Levels (Greedy): ${unsolvableLevels}`);

if (boundsErrors === 0 && overlapErrors === 0 && capacityErrors === 0 && unsolvableLevels === 0) {
  console.log('\n>>> ALL 40 LEVELS PASSED 100% VALIDATION! <<<');
}
