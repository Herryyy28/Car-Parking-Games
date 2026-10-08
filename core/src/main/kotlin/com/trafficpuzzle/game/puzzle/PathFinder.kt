package com.trafficpuzzle.game.puzzle

import com.trafficpuzzle.game.game.VehicleState
import com.trafficpuzzle.game.game.VehicleStateType
import com.trafficpuzzle.game.grid.Direction
import com.trafficpuzzle.game.grid.GridPosition
import com.trafficpuzzle.game.grid.LogicalGrid

data class PathResult(
    val isClear: Boolean,
    val blockerId: String?,
    val pathCells: List<GridPosition>
)

object PathFinder {
    fun isPathClear(vehicle: VehicleState, grid: LogicalGrid): PathResult {
        if (vehicle.state == VehicleStateType.EXITED || vehicle.state == VehicleStateType.DOCKED) {
            return PathResult(false, null, emptyList())
        }

        val front = LogicalGrid.getFrontCell(vehicle)
        val cells = mutableListOf<GridPosition>()
        var curR = front.row
        var curC = front.col

        val (deltaR, deltaC) = when (vehicle.direction) {
            Direction.UP -> Pair(-1, 0)
            Direction.DOWN -> Pair(1, 0)
            Direction.LEFT -> Pair(0, -1)
            Direction.RIGHT -> Pair(0, 1)
        }

        while (true) {
            curR += deltaR
            curC += deltaC

            if (!grid.isInBounds(curR, curC)) {
                return PathResult(true, null, cells)
            }

            val occupant = grid.getCell(curR, curC)
            if (occupant != null && occupant != vehicle.id) {
                return PathResult(false, occupant, cells)
            }

            cells.add(GridPosition(curR, curC))
        }
    }

    fun canReachExit(vehicle: VehicleState, grid: LogicalGrid): Boolean {
        return isPathClear(vehicle, grid).isClear
    }

    fun getAvailableMoves(vehicles: List<VehicleState>, grid: LogicalGrid): List<VehicleState> {
        grid.rebuild(vehicles)
        return vehicles.filter {
            it.state == VehicleStateType.PARKED && isPathClear(it, grid).isClear
        }
    }
}
