import { Direction, GridPosition, VehicleState, VehicleStateType } from './types.ts';
import { LogicalGrid } from './logicalGrid.ts';

export interface PathClearResult {
  clear: boolean;
  blockerId: string | null;
  pathCells: GridPosition[];
}

export class PathFinder {
  /**
   * Checks if the forward path along the vehicle's direction to the grid boundary is completely free.
   */
  public static isPathClear(vehicle: VehicleState, grid: LogicalGrid): PathClearResult {
    if (vehicle.state === VehicleStateType.EXITED || vehicle.state === VehicleStateType.DOCKED) {
      return { clear: false, blockerId: null, pathCells: [] };
    }

    const front = LogicalGrid.getFrontCell(vehicle);
    const pathCells: GridPosition[] = [];
    let curR = front.row;
    let curC = front.col;

    let deltaR = 0;
    let deltaC = 0;

    switch (vehicle.direction) {
      case Direction.UP:
        deltaR = -1;
        break;
      case Direction.DOWN:
        deltaR = 1;
        break;
      case Direction.LEFT:
        deltaC = -1;
        break;
      case Direction.RIGHT:
        deltaC = 1;
        break;
    }

    while (true) {
      curR += deltaR;
      curC += deltaC;

      // Has exited grid boundary? Path is clear!
      if (!grid.isInBounds(curR, curC)) {
        return { clear: true, blockerId: null, pathCells };
      }

      const occupant = grid.getCell(curR, curC);
      if (occupant !== null && occupant !== vehicle.id) {
        return { clear: false, blockerId: occupant, pathCells };
      }

      pathCells.push({ row: curR, col: curC });
    }
  }

  /**
   * Returns true if vehicle has unobstructed exit route.
   */
  public static canReachExit(vehicle: VehicleState, grid: LogicalGrid): boolean {
    return this.isPathClear(vehicle, grid).clear;
  }

  /**
   * Returns the list of grid waypoints up to the exit edge.
   */
  public static getPath(vehicle: VehicleState, grid: LogicalGrid): GridPosition[] {
    return this.isPathClear(vehicle, grid).pathCells;
  }

  /**
   * Returns all vehicles in the current game state that have a clear path to exit.
   */
  public static getAvailableMoves(vehicles: VehicleState[], grid: LogicalGrid): VehicleState[] {
    grid.rebuild(vehicles);
    return vehicles.filter(
      (v) =>
        v.state === VehicleStateType.PARKED &&
        PathFinder.isPathClear(v, grid).clear
    );
  }
}
