import { Direction, GridPosition, VehicleState, VehicleStateType } from './types.ts';

export class LogicalGrid {
  public rows: number;
  public cols: number;
  private cells: (string | null)[][]; // vehicleId or null

  constructor(rows = 7, cols = 7) {
    this.rows = rows;
    this.cols = cols;
    this.cells = Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  /**
   * Returns all grid cells occupied by a vehicle.
   */
  public static getOccupiedCells(vehicle: VehicleState): GridPosition[] {
    const cells: GridPosition[] = [];
    const isHorizontal = vehicle.direction === Direction.LEFT || vehicle.direction === Direction.RIGHT;

    for (let i = 0; i < vehicle.length; i++) {
      if (isHorizontal) {
        cells.push({ row: vehicle.gridPosition.row, col: vehicle.gridPosition.col + i });
      } else {
        cells.push({ row: vehicle.gridPosition.row + i, col: vehicle.gridPosition.col });
      }
    }
    return cells;
  }

  /**
   * Returns the front-most head cell of the vehicle in its facing direction.
   */
  public static getFrontCell(vehicle: VehicleState): GridPosition {
    switch (vehicle.direction) {
      case Direction.UP:
        return { row: vehicle.gridPosition.row, col: vehicle.gridPosition.col };
      case Direction.DOWN:
        return { row: vehicle.gridPosition.row + vehicle.length - 1, col: vehicle.gridPosition.col };
      case Direction.LEFT:
        return { row: vehicle.gridPosition.row, col: vehicle.gridPosition.col };
      case Direction.RIGHT:
        return { row: vehicle.gridPosition.row, col: vehicle.gridPosition.col + vehicle.length - 1 };
    }
  }

  /**
   * Re-builds grid occupancy table from active (non-exited) vehicles.
   */
  public rebuild(vehicles: VehicleState[]): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c] = null;
      }
    }

    for (const v of vehicles) {
      if (v.state === VehicleStateType.EXITED || v.state === VehicleStateType.DOCKED) continue;

      const occ = LogicalGrid.getOccupiedCells(v);
      for (const cell of occ) {
        if (this.isInBounds(cell.row, cell.col)) {
          this.cells[cell.row][cell.col] = v.id;
        }
      }
    }
  }

  public isInBounds(r: number, c: number): boolean {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  public getCell(r: number, c: number): string | null {
    if (!this.isInBounds(r, c)) return null;
    return this.cells[r][c];
  }

  public isCellOccupied(r: number, c: number, ignoreVehicleId?: string): boolean {
    if (!this.isInBounds(r, c)) return false;
    const occ = this.cells[r][c];
    return occ !== null && occ !== ignoreVehicleId;
  }
}
