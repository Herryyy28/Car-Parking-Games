package com.trafficpuzzle.game

/**
 * Global game constants and configuration parameters.
 */
object GameConfig {
    const val GAME_TITLE = "Traffic Jam 3D"
    const val VIRTUAL_WIDTH = 1080f
    const val VIRTUAL_HEIGHT = 1920f

    // Camera Configuration
    const val CAMERA_FOV = 55f
    const val CAMERA_NEAR = 0.5f
    const val CAMERA_FAR = 100f
    const val CAMERA_INITIAL_X = 8f
    const val CAMERA_INITIAL_Y = 12f
    const val CAMERA_INITIAL_Z = 10f

    // Visual Palette & Lighting
    const val AMBIENT_LIGHT_R = 0.45f
    const val AMBIENT_LIGHT_G = 0.45f
    const val AMBIENT_LIGHT_B = 0.55f
    const val AMBIENT_LIGHT_A = 1f

    const val DIR_LIGHT_R = 0.95f
    const val DIR_LIGHT_G = 0.95f
    const val DIR_LIGHT_B = 0.90f
    const val DIR_LIGHT_DIR_X = -0.6f
    const val DIR_LIGHT_DIR_Y = -1.0f
    const val DIR_LIGHT_DIR_Z = -0.5f

    // Background Clear Color (Soft gradient feel)
    const val BG_COLOR_R = 0.88f
    const val BG_COLOR_G = 0.91f
    const val BG_COLOR_B = 0.96f
    const val BG_COLOR_A = 1.0f
}
