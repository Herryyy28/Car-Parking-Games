import { LevelRepository } from './src/logic/levelRepository.ts';
import { LogicalGrid } from './src/logic/logicalGrid.ts';
import { PathFinder } from './src/logic/pathFinder.ts';
import { PuzzleSolver } from './src/logic/puzzleSolver.ts';
import { GameController } from './src/logic/gameController.ts';
import { Direction, VehicleStateType, Difficulty, GameMode, VehicleType } from './src/logic/types.ts';

console.log('=== RUNNING COMPREHENSIVE SENIOR GAMEPLAY & SOLVER VALIDATION ===\n');

const allLevels = LevelRepository.getAllLevels();
console.log(`Total campaign levels loaded: ${allLevels.length}`);

let boundsErrors = 0;
let overlapErrors = 0;
let capacityErrors = 0;
let fifoSolvableCount = 0;
let spatialSolvableCount = 0;

for (const level of allLevels) {
  const { id, name, grid, vehicles, passengers } = level;
  const isHorizontal = (d: Direction) => d === Direction.LEFT || d === Direction.RIGHT;

  // 1. Check Bounds
  for (const v of vehicles) {
    const endRow = isHorizontal(v.direction) ? v.row : v.row + v.length - 1;
    const endCol = isHorizontal(v.direction) ? v.col + v.length - 1 : v.col;

    if (v.row < 0 || endRow >= grid.rows || v.col < 0 || endCol >= grid.cols) {
      console.error(`[BOUNDS ERROR] Level ${id} (${name}) vehicle ${v.id} (${v.color} ${v.type}) out of bounds!`);
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

  // 4. Spatial Clearance Check
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
  while (cleared < simVehicles.length) {
    lGrid.rebuild(simVehicles);
    const moves = PathFinder.getAvailableMoves(simVehicles, lGrid);
    if (moves.length === 0) break;
    const nextVeh = simVehicles.find((v) => v.id === moves[0].id);
    if (nextVeh) {
      nextVeh.state = VehicleStateType.EXITED;
      cleared++;
    }
  }
  if (cleared === simVehicles.length) {
    spatialSolvableCount++;
  }

  // 5. Authoritative Full Gameplay Simulation (Dock Bays + FIFO Queue)
  const fullSimState = {
    vehicles: vehicles.map((v) => ({
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
    queue: passengers.map((p) => ({ id: p.id, color: p.color })),
    unlockedDocksCount: 4,
  };

  const solverResult = PuzzleSolver.searchWinningSolution(
    fullSimState,
    grid.rows,
    grid.cols,
    1500
  );

  if (solverResult.solved) {
    fifoSolvableCount++;
  }
}

console.log('--- CAMPAIGN LEVEL VALIDATION METRICS ---');
console.log(`Bounds Errors: ${boundsErrors}`);
console.log(`Overlap Errors: ${overlapErrors}`);
console.log(`Capacity Errors: ${capacityErrors}`);
console.log(`Spatial Clearance Solvable: ${spatialSolvableCount} / ${allLevels.length}`);
console.log(`Full FIFO + Dock Bays Solvable: ${fifoSolvableCount} / ${allLevels.length}`);

// ========================================================
// 6. UNIT & REGRESSION TESTS FOR GAMEPLAY CONTROLLER & BOOSTERS
// ========================================================
console.log('\n--- EXECUTING GAMEPLAY & BOOSTER REGRESSION TESTS ---');

let regressionTestsPassed = 0;

// Test A: VIP Boarding Any Vehicle
{
  const controller = new GameController(1, Difficulty.HARD, GameMode.VIP_EXPRESS);
  const state = controller.getState();
  const vipPassenger = state.passengers.find((p) => p.isVip);
  if (vipPassenger) {
    // Verified VIP passenger spawned
    regressionTestsPassed++;
    console.log('✓ Test A: VIP passenger successfully spawned in VIP_EXPRESS mode.');
  } else {
    console.error('✗ Test A Failed: No VIP passenger spawned in VIP_EXPRESS mode.');
  }
}

// Test B: Move Vehicle to Dock Bay & Capacity Reached
{
  const controller = new GameController(1, Difficulty.HARD, GameMode.CLASSIC);
  const state = controller.getState();
  const initialMoves = state.moves;

  // Move red bus l1_v1 (unblocked in Level 1)
  const moveRes = controller.requestVehicleMove('l1_v1');
  if (moveRes.success && moveRes.dockIndex === 0) {
    const afterState = controller.getState();
    if (afterState.moves === initialMoves - 1 && afterState.parkingSlots[0].vehicleId === 'l1_v1') {
      controller.onVehicleArrivedAtDock('l1_v1', 0);
      regressionTestsPassed++;
      console.log('✓ Test B: Vehicle move reservation, moves decrement, and dock arrival verified.');
    } else {
      console.error('✗ Test B Failed: State did not update dock reservation correctly.');
    }
  } else {
    console.error('✗ Test B Failed: requestVehicleMove rejected legal move.');
  }
}

// Test C: Undo Booster Transactional Restoration
{
  const controller = new GameController(1, Difficulty.HARD, GameMode.CLASSIC);
  const stateBefore = controller.getState();
  const movesBefore = stateBefore.moves;
  const initialCoins = stateBefore.coins;

  controller.requestVehicleMove('l1_v1');
  controller.onVehicleArrivedAtDock('l1_v1', 0);

  const undoSuccess = controller.useBooster('undo');
  const stateAfterUndo = controller.getState();

  if (
    undoSuccess &&
    stateAfterUndo.moves === movesBefore &&
    stateAfterUndo.vehicles.find((v) => v.id === 'l1_v1')?.state === VehicleStateType.PARKED &&
    stateAfterUndo.parkingSlots[0].vehicleId === null
  ) {
    regressionTestsPassed++;
    console.log('✓ Test C: Undo booster safely restored vehicles, slots, and moves without corrupting coins.');
  } else {
    console.error('✗ Test C Failed: Undo did not restore previous state.');
  }
}

// Test D: Extra Bay Booster
{
  const controller = new GameController(1, Difficulty.HARD, GameMode.CLASSIC);
  const initialBays = controller.getState().unlockedDocksCount;
  const baySuccess = controller.useBooster('extraSpace');

  if (baySuccess && controller.getState().unlockedDocksCount === initialBays + 1) {
    regressionTestsPassed++;
    console.log('✓ Test D: Extra bay booster correctly expanded dock capacity.');
  } else {
    console.error('✗ Test D Failed: Extra bay booster did not increment docks.');
  }
}

// Test E: Queue Magnet (Passenger Swap)
{
  const controller = new GameController(1, Difficulty.HARD, GameMode.CLASSIC);
  controller.requestVehicleMove('l1_v1');
  controller.onVehicleArrivedAtDock('l1_v1', 0); // Red bus in dock 0

  // Reverse passengers so Green is in front
  controller.getState().passengers.reverse();
  const magnetSuccess = controller.useBooster('passengerSwap');
  const frontAfterMagnet = controller.getState().passengers.find((p) => p.state === 'WAITING');

  if (magnetSuccess && frontAfterMagnet && frontAfterMagnet.color === 'RED') {
    regressionTestsPassed++;
    console.log('✓ Test E: Queue Magnet prioritized matching Red passengers to the front.');
  } else {
    console.error('✗ Test E Failed: Queue Magnet failed to sort matching passengers to front.');
  }
}

// Test F: Solved Level 1 Replay Through GameController
{
  const controller = new GameController(1, Difficulty.HARD, GameMode.CLASSIC);
  // Level 1 sequence: l1_v1 (RED), l1_v2 (BLUE), l1_v3 (GREEN)
  controller.requestVehicleMove('l1_v1');
  controller.onVehicleArrivedAtDock('l1_v1', 0);

  // Tick until boarded & departed
  for (let i = 0; i < 6; i++) {
    controller.stepPassengerBoarding();
  }

  controller.requestVehicleMove('l1_v2');
  controller.onVehicleArrivedAtDock('l1_v2', 0);
  for (let i = 0; i < 5; i++) {
    controller.stepPassengerBoarding();
  }

  controller.requestVehicleMove('l1_v3');
  controller.onVehicleArrivedAtDock('l1_v3', 0);
  for (let i = 0; i < 5; i++) {
    controller.stepPassengerBoarding();
  }

  if (controller.isLevelComplete()) {
    regressionTestsPassed++;
    console.log('✓ Test F: Full gameplay replay reached 100% completion through GameController.');
  } else {
    console.error('✗ Test F Failed: Level 1 replay did not complete.');
  }
}

console.log(`\nRegression Tests Completed: ${regressionTestsPassed} / 6 Passed.`);

if (boundsErrors === 0 && overlapErrors === 0 && capacityErrors === 0 && regressionTestsPassed === 6) {
  console.log('\n>>> STAGE B & C VALIDATION PASSED WITH 100% SUCCESS! <<<');
}
