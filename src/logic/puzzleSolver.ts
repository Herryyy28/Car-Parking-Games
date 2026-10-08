import { GameState, VehicleState, VehicleStateType } from './types.ts';
import { LogicalGrid } from './logicalGrid.ts';
import { PathFinder } from './pathFinder.ts';

export interface HintRecommendation {
  vehicleId: string;
  vehicle: VehicleState;
  reason: string;
}

export class PuzzleSolver {
  /**
   * Evaluates valid moves and determines the optimal next move for the player.
   */
  public static findBestMove(state: GameState): HintRecommendation | null {
    const grid = new LogicalGrid(state.gridRows, state.gridCols);
    grid.rebuild(state.vehicles);

    const available = PathFinder.getAvailableMoves(state.vehicles, grid);
    if (available.length === 0) return null;

    // 1. High Priority: Available vehicle whose color matches front passenger!
    const frontPassenger = state.passengers.find((p) => p.state === 'WAITING');
    if (frontPassenger) {
      const directColorMatch = available.find((v) => v.color === frontPassenger.color);
      if (directColorMatch) {
        return {
          vehicleId: directColorMatch.id,
          vehicle: directColorMatch,
          reason: `Tap the ${directColorMatch.color} ${directColorMatch.type} to board waiting ${frontPassenger.color} passengers!`,
        };
      }

      // Check second or third passenger in line
      const nextMatch = available.find((v) => state.passengers.slice(0, 3).some((p) => p.color === v.color));
      if (nextMatch) {
        return {
          vehicleId: nextMatch.id,
          vehicle: nextMatch,
          reason: `Move the ${nextMatch.color} ${nextMatch.type} to dock for upcoming queue passengers!`,
        };
      }
    }

    // 2. Medium Priority: Vehicle that frees up another blocked vehicle
    let bestFreer: VehicleState | null = null;
    let maxFreed = 0;

    for (const cand of available) {
      // Simulate removing cand
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
        reason: `Move the ${bestFreer.color} ${bestFreer.type} to clear locked lanes!`,
      };
    }

    // 3. Fallback: First available clear vehicle
    const fallback = available[0];
    return {
      vehicleId: fallback.id,
      vehicle: fallback,
      reason: `Clear the ${fallback.color} ${fallback.type} onto the open road!`,
    };
  }

  /**
   * Checks whether the current game state has at least one valid path forward
   * or has entered an unrecoverable gridlock.
   */
  public static isGridlocked(state: GameState): boolean {
    const activeVehicles = state.vehicles.filter(
      (v) => v.state !== VehicleStateType.EXITED && v.state !== VehicleStateType.DOCKED
    );
    if (activeVehicles.length === 0) return false;

    // Check if all unlocked bays are full
    const openDocks = state.parkingSlots
      .slice(0, state.unlockedDocksCount)
      .filter((s) => s.vehicleId === null).length;

    if (openDocks > 0) return false; // Still has open parking bays

    // All bays full: Can any docked bus board the front passenger?
    const frontPassenger = state.passengers.find((p) => p.state === 'WAITING');
    if (!frontPassenger) return false;

    const dockedVehicles = state.vehicles.filter((v) => v.state === VehicleStateType.DOCKED);
    const canAnyBoard = dockedVehicles.some(
      (v) => v.color === frontPassenger.color && v.loadedPassengers < v.capacity
    );

    return !canAnyBoard;
  }
}
