package com.trafficpuzzle.game.entities

import com.badlogic.gdx.graphics.Color

/**
 * Types of vehicles supported by the game.
 */
enum class VehicleType(val displayName: String, val gridLength: Int, val lengthUnits: Float) {
    CAR("Sedan Car", 2, 3.2f),
    BUS("Transit Bus", 3, 4.8f),
    VAN("Compact Van", 2, 3.6f)
}

/**
 * Valid movement and heading directions for vehicles on the grid.
 */
enum class VehicleDirection(val angleY: Float, val dirX: Float, val dirZ: Float) {
    UP(180f, 0f, -1f),
    DOWN(0f, 0f, 1f),
    LEFT(90f, -1f, 0f),
    RIGHT(270f, 1f, 0f)
}

/**
 * Dynamic state of a vehicle within the puzzle loop.
 */
enum class VehicleState {
    PARKED,
    SELECTED,
    MOVING,
    BLOCKED,
    EXITED
}

/**
 * Rich palette of distinct vehicle colors following the game design guide.
 */
enum class VehicleColor(val displayName: String, val gdxColor: Color, val hex: String) {
    ROYAL_BLUE("Royal Blue", Color(0.15f, 0.40f, 0.95f, 1.0f), "#2563EB"),
    CORAL_ORANGE("Coral Orange", Color(0.98f, 0.45f, 0.15f, 1.0f), "#F97316"),
    FRESH_GREEN("Fresh Green", Color(0.12f, 0.72f, 0.38f, 1.0f), "#10B981"),
    SUN_YELLOW("Sun Yellow", Color(0.96f, 0.75f, 0.12f, 1.0f), "#EAB308"),
    VIOLET_PURPLE("Violet Purple", Color(0.55f, 0.25f, 0.90f, 1.0f), "#8B5CF6"),
    CRIMSON_RED("Crimson Red", Color(0.90f, 0.20f, 0.25f, 1.0f), "#EF4444")
}
