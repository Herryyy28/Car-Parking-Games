import { GameState, VehicleColor, VehicleState, VehicleStateType } from './types.ts';
import { LogicalGrid } from './logicalGrid.ts';
import { PathFinder } from './pathFinder.ts';

export interface HintRecommendation {
  vehicleId: string;
  vehicle: VehicleState;
  reason: string;
  isProvenWinningMove?: boolean;
}

export interface SolverResult {
  solvable: boolean;
  provenPath: string[]; // Sequence of vehicle IDs leading to victory
  nodesVisited: number;
}

interface SimDockedBus {
  id: string;
  color: VehicleColor;
  capacity: number;
  loaded: number;
}

interface SimPassenger {
  id: string;
  color: VehicleColor;
  isVip?: boolean;
}

interface SimState {
  vehicles: VehicleState[];
  docks: SimDockedBus[];
  queue: SimPassenger[];
  unlockedDocksCount: number;
}

export class PuzzleSolver {
  /**
   * Fast state fingerprint generator for transposition table.
   */
  private static getFingerprint(state: SimState): string {
    const parkedIds = state.vehicles
      .filter((v) => v.state === VehicleStateType.PARKED)
      .map((v) => v.id)
      .sort()
      .join(',');

    const docksFingerprint = state.docks
      .map((d) => `${d.color}:${d.loaded}/${d.capacity}`)
      .sort()
      .join(';');

    const queueFingerprint = state.queue
      .slice(0, 8)
      .map((p) => (p.isVip ? 'VIP' : p.color))
      .join(',');

    return `${parkedIds}|${docksFingerprint}|${queueFingerprint}`;
  }

  /**
   * Authoritative forward simulation step: moves a vehicle to dock and processes FIFO queue boarding.
   */
  private static simulateMove(state: SimState, vehicleId: string, grid: LogicalGrid): SimState | null {
    if (state.docks.length >= state.unlockedDocksCount) {
      return null; // All docks full
    }

    const veh = state.vehicles.find((v) => v.id === vehicleId);
    if (!veh || veh.state !== VehicleStateType.PARKED) {
      return null;
    }

    // Clone state
    const nextVehicles = state.vehicles.map((v) =>
      v.id === vehicleId ? { ...v, state: VehicleStateType.DOCKED } : { ...v }
    );
    const nextDocks: SimDockedBus[] = [
      ...state.docks,
      {
        id: veh.id,
        color: veh.color,
        capacity: veh.capacity,
        loaded: 0,
      },
    ];
    let nextQueue: SimPassenger[] = state.queue.map((p) => ({ ...p }));

    // Execute FIFO passenger boarding and bus departure loop
    let progress = true;
    while (progress && nextQueue.length > 0) {
      progress = false;
      const front = nextQueue[0];

      // Find eligible docked bus
      const targetBus = nextDocks.find(
        (b) => (b.color === front.color || front.isVip) && b.loaded < b.capacity
      );

      if (targetBus) {
        targetBus.loaded += 1;
        nextQueue.shift();
        progress = true;

        // If target bus is now full, depart it immediately
        if (targetBus.loaded >= targetBus.capacity) {
          const busIdx = nextDocks.indexOf(targetBus);
          if (busIdx !== -1) {
            nextDocks.splice(busIdx, 1);
            // Mark vehicle as exited
            const exitedVeh = nextVehicles.find((v) => v.id === targetBus.id);
            if (exitedVeh) {
              exitedVeh.state = VehicleStateType.EXITED;
            }
          }
        }
      }
    }

    return {
      vehicles: nextVehicles,
      docks: nextDocks,
      queue: nextQueue,
      unlockedDocksCount: state.unlockedDocksCount,
    };
  }

  /**
   * Calculates heuristic cost for A* search prioritizing states with fewer remaining vehicles and matched commuters.
   */
  private static calculateHeuristic(state: SimState): number {
    const parkedCount = state.vehicles.filter((v) => v.state === VehicleStateType.PARKED).length;
    let score = parkedCount * 25 + state.queue.length * 8;

    // Positive bonus if docked bus matches front waiting passenger
    if (state.queue.length > 0) {
      const front = state.queue[0];
      const match = state.docks.some(
        (d) => (d.color === front.color || front.isVip) && d.loaded < d.capacity
      );
      if (match) {
        score -= 30; // Strongly prioritize states that allow immediate boarding!
      }
    }

    return score;
  }

  /**
   * Forward-searches the state space using A* heuristic priority search with transposition table pruning.
   */
  public static searchWinningSolution(
    initialState: SimState,
    rows: number,
    cols: number,
    maxBudgetNodes = 2500
  ): { solved: boolean; winningFirstMoveId: string | null; provenPath: string[] } {
    const grid = new LogicalGrid(rows, cols);
    const visited = new Set<string>();

    interface PriorityNode {
      state: SimState;
      path: string[];
      fScore: number;
    }

    // Min-Priority queue
    const queue: PriorityNode[] = [
      {
        state: initialState,
        path: [],
        fScore: this.calculateHeuristic(initialState),
      },
    ];
    visited.add(this.getFingerprint(initialState));

    let nodes = 0;

    while (queue.length > 0 && nodes < maxBudgetNodes) {
      // Pick best node (lowest fScore)
      const { state, path } = queue.shift()!;
      nodes++;

      // Check victory condition
      const allExited = state.vehicles.every((v) => v.state === VehicleStateType.EXITED);
      if (allExited && state.queue.length === 0) {
        return {
          solved: true,
          winningFirstMoveId: path[0] || null,
          provenPath: path,
        };
      }

      // Check deadlock condition
      if (state.docks.length >= state.unlockedDocksCount) {
        if (state.queue.length > 0) {
          const front = state.queue[0];
          const canAnyBoard = state.docks.some(
            (d) => (d.color === front.color || front.isVip) && d.loaded < d.capacity
          );
          if (!canAnyBoard) {
            continue; // Deadlock branch, prune
          }
        }
      }

      // Find legal moves
      grid.rebuild(state.vehicles);
      const available = PathFinder.getAvailableMoves(state.vehicles, grid);

      for (const cand of available) {
        const nextState = this.simulateMove(state, cand.id, grid);
        if (!nextState) continue;

        const fingerprint = this.getFingerprint(nextState);
        if (!visited.has(fingerprint)) {
          visited.add(fingerprint);
          const nextPath = [...path, cand.id];
          const fScore = nextPath.length * 1.5 + this.calculateHeuristic(nextState);

          // Insert into priority queue in sorted order
          const insertIdx = queue.findIndex((node) => node.fScore > fScore);
          const newNode: PriorityNode = { state: nextState, path: nextPath, fScore };
          if (insertIdx === -1) {
            queue.push(newNode);
          } else {
            queue.splice(insertIdx, 0, newNode);
          }
        }
      }
    }

    return { solved: false, winningFirstMoveId: null, provenPath: [] };
  }

  /**
   * Evaluates valid moves and determines the optimal next move for the player.
   * Leverages forward state-space search to guarantee winning recommendations where budget allows.
   */
  public static findBestMove(state: GameState, budgetNodes = 700): HintRecommendation | null {
    const grid = new LogicalGrid(state.gridRows, state.gridCols);
    grid.rebuild(state.vehicles);

    const available = PathFinder.getAvailableMoves(state.vehicles, grid);
    if (available.length === 0) return null;

    if (available.length === 1) {
      return {
        vehicleId: available[0].id,
        vehicle: available[0],
        reason: `Clear the ${available[0].color} ${available[0].type} to free traffic!`,
      };
    }

    // Convert current GameState into SimState for forward search
    const simDocks: SimDockedBus[] = [];
    for (let i = 0; i < state.unlockedDocksCount; i++) {
      const slot = state.parkingSlots[i];
      if (slot && slot.vehicleId) {
        const v = state.vehicles.find((veh) => veh.id === slot.vehicleId);
        if (v && v.state === VehicleStateType.DOCKED) {
          simDocks.push({
            id: v.id,
            color: v.color,
            capacity: v.capacity,
            loaded: v.loadedPassengers,
          });
        }
      }
    }

    const simQueue: SimPassenger[] = state.passengers
      .filter((p) => p.state === 'WAITING')
      .map((p) => ({ id: p.id, color: p.color, isVip: p.isVip }));

    const simState: SimState = {
      vehicles: state.vehicles.map((v) => ({ ...v })),
      docks: simDocks,
      queue: simQueue,
      unlockedDocksCount: state.unlockedDocksCount,
    };

    // 1. Run forward search to find a proven winning move
    const searchResult = this.searchWinningSolution(
      simState,
      state.gridRows,
      state.gridCols,
      budgetNodes
    );

    if (searchResult.solved && searchResult.winningFirstMoveId) {
      const winningVeh = available.find((v) => v.id === searchResult.winningFirstMoveId);
      if (winningVeh) {
        return {
          vehicleId: winningVeh.id,
          vehicle: winningVeh,
          reason: `Proven path: Move ${winningVeh.color} ${winningVeh.type} to solve the level!`,
          isProvenWinningMove: true,
        };
      }
    }

    // 2. Filter out moves that result in immediate unrecoverable deadlocks
    const safeCandidates: VehicleState[] = [];
    for (const cand of available) {
      const outcome = this.simulateMove(simState, cand.id, grid);
      if (!outcome) continue;
      // Is this immediate outcome deadlocked?
      if (outcome.docks.length >= outcome.unlockedDocksCount && outcome.queue.length > 0) {
        const front = outcome.queue[0];
        const canBoard = outcome.docks.some(
          (d) => (d.color === front.color || front.isVip) && d.loaded < d.capacity
        );
        if (!canBoard) {
          continue; // Deadlock trap! Avoid!
        }
      }
      safeCandidates.push(cand);
    }

    const candidatePool = safeCandidates.length > 0 ? safeCandidates : available;

    // 3. High Priority: Available vehicle whose color matches front passenger
    if (simQueue.length > 0) {
      const frontPassenger = simQueue[0];
      const directColorMatch = candidatePool.find(
        (v) => v.color === frontPassenger.color || frontPassenger.isVip
      );
      if (directColorMatch) {
        return {
          vehicleId: directColorMatch.id,
          vehicle: directColorMatch,
          reason: `Tap the ${directColorMatch.color} ${directColorMatch.type} to board waiting commuters!`,
        };
      }

      // Check upcoming passengers in queue
      const upcomingMatch = candidatePool.find((v) =>
        simQueue.slice(0, 3).some((p) => p.color === v.color)
      );
      if (upcomingMatch) {
        return {
          vehicleId: upcomingMatch.id,
          vehicle: upcomingMatch,
          reason: `Dock the ${upcomingMatch.color} ${upcomingMatch.type} for incoming passengers!`,
        };
      }
    }

    // 4. Medium Priority: Vehicle that unblocks the highest number of trapped vehicles
    let bestFreer: VehicleState | null = null;
    let maxFreed = 0;

    for (const cand of candidatePool) {
      const simVehicles = state.vehicles.map((v) =>
        v.id === cand.id ? { ...v, state: VehicleStateType.EXITED } : { ...v }
      );
      const simGrid = new LogicalGrid(state.gridRows, state.gridCols);
      simGrid.rebuild(simVehicles);

      const simAvailable = PathFinder.getAvailableMoves(simVehicles, simGrid);
      const newlyFreed = simAvailable.filter(
        (v) => !available.some((orig) => orig.id === v.id)
      ).length;

      if (newlyFreed > maxFreed) {
        maxFreed = newlyFreed;
        bestFreer = cand;
      }
    }

    if (bestFreer) {
      return {
        vehicleId: bestFreer.id,
        vehicle: bestFreer,
        reason: `Move the ${bestFreer.color} ${bestFreer.type} to open traffic lanes!`,
      };
    }

    // 5. Fallback: First safe candidate
    const fallback = candidatePool[0];
    return {
      vehicleId: fallback.id,
      vehicle: fallback,
      reason: `Clear the ${fallback.color} ${fallback.type} onto the open road!`,
    };
  }

  /**
   * Checks whether the current game state has at least one valid path forward
   * or has entered an unrecoverable gridlock.
   * Accurately accounts for moving vehicles, departing buses, and VIP golden passengers.
   */
  public static isGridlocked(state: GameState): boolean {
    const activeVehicles = state.vehicles.filter(
      (v) => v.state !== VehicleStateType.EXITED && v.state !== VehicleStateType.DOCKED
    );
    if (activeVehicles.length === 0) return false;

    // If any vehicle is currently in transit, the game cannot be gridlocked yet!
    const isAnyMoving = state.vehicles.some((v) => v.state === VehicleStateType.MOVING);
    if (isAnyMoving) return false;

    // If any docked bus is fully loaded, it will depart on next tick, freeing a bay!
    const isAnyDeparting = state.vehicles.some(
      (v) => v.state === VehicleStateType.DOCKED && v.loadedPassengers >= v.capacity
    );
    if (isAnyDeparting) return false;

    // Check if there are still open parking bays
    const openDocks = state.parkingSlots
      .slice(0, state.unlockedDocksCount)
      .filter((s) => s.vehicleId === null).length;

    if (openDocks > 0) return false; // Player can still move a vehicle into an open dock!

    // All bays full: Can any docked bus board the front waiting passenger?
    const frontPassenger = state.passengers.find((p) => p.state === 'WAITING');
    if (!frontPassenger) return false;

    const dockedVehicles = state.vehicles.filter((v) => v.state === VehicleStateType.DOCKED);

    // Front passenger boards if:
    // a) Passenger is VIP (can board ANY bus with available capacity)
    // b) Color matches a docked bus with available capacity
    const canAnyBoard = dockedVehicles.some(
      (v) => (v.color === frontPassenger.color || frontPassenger.isVip) && v.loadedPassengers < v.capacity
    );

    return !canAnyBoard;
  }
}
