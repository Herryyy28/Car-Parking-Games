package com.trafficpuzzle.game.game

import com.trafficpuzzle.game.entities.VehicleColor
import com.trafficpuzzle.game.entities.VehicleType
import com.trafficpuzzle.game.grid.Direction
import com.trafficpuzzle.game.grid.GridPosition

enum class VehicleStateType {
    PARKED,
    SELECTED,
    MOVING,
    BLOCKED,
    DOCKED,
    EXITED
}

data class VehicleState(
    val id: String,
    val type: VehicleType,
    val color: VehicleColor,
    val gridPosition: GridPosition,
    val direction: Direction,
    val length: Int,
    val width: Int = 1,
    val state: VehicleStateType = VehicleStateType.PARKED,
    val capacity: Int = 4,
    val loadedPassengers: Int = 0,
    val dockIndex: Int? = null
)

data class PassengerState(
    val id: String,
    val color: VehicleColor,
    val state: String = "WAITING"
)

data class BusState(
    val id: String,
    val color: VehicleColor,
    val capacity: Int,
    val currentPassengers: Int = 0
)

data class ParkingSlotState(
    val index: Int,
    val isUnlocked: Boolean,
    val vehicleId: String? = null
)

data class ExitState(
    val direction: Direction
)

data class BoosterState(
    val undo: Int = 5,
    val hint: Int = 3,
    val shuffle: Int = 3,
    val extraSpace: Int = 2,
    val passengerSwap: Int = 2
)

data class GameState(
    val levelId: Int,
    val levelName: String,
    val moves: Int,
    val parMoves: Int,
    val coins: Int,
    val vehicles: List<VehicleState>,
    val passengers: List<PassengerState>,
    val buses: List<BusState>,
    val parkingSlots: List<ParkingSlotState>,
    val exits: List<ExitState>,
    val availableBoosters: BoosterState,
    val status: GameStatus
)
