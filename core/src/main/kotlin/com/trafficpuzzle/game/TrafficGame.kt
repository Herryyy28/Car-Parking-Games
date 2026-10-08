package com.trafficpuzzle.game

import com.badlogic.gdx.Game
import com.trafficpuzzle.game.screens.GameScreen

/**
 * Main application listener class extending LibGDX Game.
 * Serves as the central state and screen manager.
 */
class TrafficGame : Game() {

    override fun create() {
        // Set the primary 3D game screen
        setScreen(GameScreen(this))
    }

    override fun dispose() {
        super.dispose()
        screen?.dispose()
    }
}
