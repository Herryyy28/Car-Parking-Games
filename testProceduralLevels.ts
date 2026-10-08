import { ProceduralLevelGenerator } from './src/logic/proceduralLevelGenerator.ts';
import { LogicalGrid } from './src/logic/logicalGrid.ts';
import { PathFinder } from './src/logic/pathFinder.ts';
import { Direction, VehicleStateType } from './src/logic/types.ts';

console.log('Testing procedural levels 7 to 40...');

for (let id = 7; id <= 40; id++) {
  const level = ProceduralLevelGenerator.generateLevel(id);
  const isHorizontal = (d: Direction) => d === Direction.LEFT || d === Direction.RIGHT;

  // Overlaps
  const occ = new Map<string, string>();
  for (const v of level.vehicles) {
    for (let i = 0; i < v.length; i++) {
      const r = isHorizontal(v.direction) ? v.row : v.row + i;
      const c = isHorizontal(v.direction) ? v.col + i : v.col;
      const key = `${r},${c}`;
      if (occ.has(key)) {
        console.error(`Level ${id} collision at ${key}`);
      }
      occ.set(key, v.id);
    }
  }

  // Solvability
  const simVehicles = level.vehicles.map((v) => ({
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

  const grid = new LogicalGrid(level.grid.rows, level.grid.cols);
  let cleared = 0;
  while (cleared < simVehicles.length) {
    grid.rebuild(simVehicles);
    const moves = PathFinder.getAvailableMoves(simVehicles, grid);
    if (moves.length === 0) break;
    const toClear = simVehicles.find((v) => v.id === moves[0].id);
    if (toClear) {
      toClear.state = VehicleStateType.EXITED;
      cleared++;
    }
  }

  if (cleared < simVehicles.length) {
    console.log(`Level ${id} cleared ${cleared}/${simVehicles.length} (STUCK)`);
  } else {
    // console.log(`Level ${id} OK (cleared ${cleared}/${simVehicles.length})`);
  }
}

console.log('Done testing procedural levels.');
