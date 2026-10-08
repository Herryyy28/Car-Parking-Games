package com.trafficpuzzle.game.game

/**
 * Authoritative game lifecycle states matching architectural spec Section 2.
 */
enum class GameStatus {
    LOADING,
    READY,
    PLAYING,
    VEHICLE_MOVING,
    PASSENGER_LOADING,
    PAUSED,
    COMPLETED,
    FAILED
}
