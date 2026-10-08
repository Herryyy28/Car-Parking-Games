package com.trafficpuzzle.game.grid

data class GridPosition(
    val row: Int,
    val col: Int
)

enum class Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT
}
