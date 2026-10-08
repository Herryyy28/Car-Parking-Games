package com.trafficpuzzle.game.screens

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Screen
import com.trafficpuzzle.game.TrafficGame
import com.trafficpuzzle.game.input.TouchInputHandler
import com.trafficpuzzle.game.rendering.SceneRenderer

/**
 * Primary 3D gameplay screen for Traffic Jam 3D.
 * Manages the 3D scene lifecycle, touch inputs, and rendering loop.
 */
class GameScreen(private val game: TrafficGame) : Screen {

    private lateinit var sceneRenderer: SceneRenderer
    private lateinit var inputHandler: TouchInputHandler

    override fun show() {
        sceneRenderer = SceneRenderer()
        inputHandler = TouchInputHandler(sceneRenderer) { vehicle, x, y ->
            if (vehicle != null) {
                Gdx.app.log("GameScreen", "Selected vehicle ${vehicle.id} (${vehicle.color.displayName}) at ($x, $y)")
            } else {
                Gdx.app.log("GameScreen", "Touch at ($x, $y) - No vehicle hit")
            }
        }
        Gdx.input.inputProcessor = inputHandler
    }

    override fun render(delta: Float) {
        sceneRenderer.render(delta)
    }

    override fun resize(width: Int, height: Int) {
        sceneRenderer.resize(width, height)
    }

    override fun pause() {}

    override fun resume() {}

    override fun hide() {
        Gdx.input.inputProcessor = null
    }

    override fun dispose() {
        sceneRenderer.dispose()
    }
}
