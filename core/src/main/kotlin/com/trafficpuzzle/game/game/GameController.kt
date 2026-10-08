package com.trafficpuzzle.game.game

import com.trafficpuzzle.game.grid.Direction
import com.trafficpuzzle.game.grid.LogicalGrid
import com.trafficpuzzle.game.puzzle.PathFinder

class GameController(var state: GameState) {
    private val grid = LogicalGrid(7, 7)
    private val historyStack = mutableListOf<GameState>()

    init {
        grid.rebuild(state.vehicles)
    }

    fun requestVehicleMove(vehicleId: String): MoveResult {
        if (state.status == GameStatus.COMPLETED || state.status == GameStatus.FAILED) {
            return MoveResult(false, null, "Game finished")
        }

        val vehicle = state.vehicles.find { it.id == vehicleId }
            ?: return MoveResult(false, null, "Vehicle not found")

        if (vehicle.state != VehicleStateType.PARKED) {
            return MoveResult(false, null, "Vehicle not parked")
        }

        // Check parking bays
        val openSlot = state.parkingSlots.indexOfFirst { it.isUnlocked && it.vehicleId == null }
        if (openSlot == -1) {
            return MoveResult(false, null, "ALL_BAYS_FULL")
        }

        grid.rebuild(state.vehicles)
        val path = PathFinder.isPathClear(vehicle, grid)
        if (!path.isClear) {
            return MoveResult(false, path.blockerId, "Path blocked")
        }

        // Save snapshot
        historyStack.add(state.copy())

        // Move vehicle
        val updatedVehicles = state.vehicles.map {
            if (it.id == vehicleId) it.copy(state = VehicleStateType.MOVING, dockIndex = openSlot) else it
        }

        val updatedSlots = state.parkingSlots.mapIndexed { idx, slot ->
            if (idx == openSlot) slot.copy(vehicleId = vehicleId) else slot
        }

        state = state.copy(
            moves = maxOf(0, state.moves - 1),
            vehicles = updatedVehicles,
            parkingSlots = updatedSlots,
            status = GameStatus.VEHICLE_MOVING
        )

        grid.rebuild(state.vehicles)
        return MoveResult(true, null, "Moving", openSlot)
    }

    fun onVehicleArrivedAtDock(vehicleId: String, dockIndex: Int) {
        val updatedVehicles = state.vehicles.map {
            if (it.id == vehicleId) it.copy(state = VehicleStateType.DOCKED, dockIndex = dockIndex) else it
        }
        state = state.copy(
            vehicles = updatedVehicles,
            status = GameStatus.PLAYING
        )
    }

    fun undo(): Boolean {
        if (historyStack.isEmpty()) return false
        state = historyStack.removeAt(historyStack.size - 1)
        grid.rebuild(state.vehicles)
        return true
    }

    data class MoveResult(
        val success: Boolean,
        val blockerId: String?,
        val message: String,
        val dockIndex: Int? = null
    )
}
