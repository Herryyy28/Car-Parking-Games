package com.trafficpuzzle.game.grid

import com.trafficpuzzle.game.game.VehicleState
import com.trafficpuzzle.game.game.VehicleStateType

class LogicalGrid(val rows: Int = 7, val cols: Int = 7) {
    private val cells = Array(rows) { arrayOfNulls<String>(cols) }

    fun rebuild(vehicles: List<VehicleState>) {
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                cells[r][c] = null
            }
        }

        for (v in vehicles) {
            if (v.state == VehicleStateType.EXITED || v.state == VehicleStateType.DOCKED) continue

            for (cell in getOccupiedCells(v)) {
                if (isInBounds(cell.row, cell.col)) {
                    cells[cell.row][cell.col] = v.id
                }
            }
        }
    }

    fun isInBounds(r: Int, c: Int): Boolean = r in 0 until rows && c in 0 until cols

    fun getCell(r: Int, c: Int): String? = if (isInBounds(r, c)) cells[r][c] else null

    fun isCellOccupied(r: Int, c: Int, ignoreVehicleId: String? = null): Boolean {
        if (!isInBounds(r, c)) return false
        val occupant = cells[r][c]
        return occupant != null && occupant != ignoreVehicleId
    }

    companion object {
        fun getOccupiedCells(vehicle: VehicleState): List<GridPosition> {
            val list = mutableListOf<GridPosition>()
            val isHorizontal = vehicle.direction == Direction.LEFT || vehicle.direction == Direction.RIGHT

            for (i in 0 until vehicle.length) {
                if (isHorizontal) {
                    list.add(GridPosition(vehicle.gridPosition.row, vehicle.gridPosition.col + i))
                } else {
                    list.add(GridPosition(vehicle.gridPosition.row + i, vehicle.gridPosition.col))
                }
            }
            return list
        }

        fun getFrontCell(vehicle: VehicleState): GridPosition {
            return when (vehicle.direction) {
                Direction.UP -> GridPosition(vehicle.gridPosition.row, vehicle.gridPosition.col)
                Direction.DOWN -> GridPosition(vehicle.gridPosition.row + vehicle.length - 1, vehicle.gridPosition.col)
                Direction.LEFT -> GridPosition(vehicle.gridPosition.row, vehicle.gridPosition.col)
                Direction.RIGHT -> GridPosition(vehicle.gridPosition.row, vehicle.gridPosition.col + vehicle.length - 1)
            }
        }
    }
}
