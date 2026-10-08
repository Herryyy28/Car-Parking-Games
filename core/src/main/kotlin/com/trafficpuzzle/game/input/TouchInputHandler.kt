package com.trafficpuzzle.game.input

import com.badlogic.gdx.InputAdapter
import com.trafficpuzzle.game.rendering.SceneRenderer

/**
 * Handles Android touch events and delegates raycast hit testing to the 3D scene.
 */
class TouchInputHandler(
    private val sceneRenderer: SceneRenderer,
    private val onObjectSelected: (Boolean, Float, Float) -> Unit = { _, _, _ -> }
) : InputAdapter() {

    override fun touchDown(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
        val hit = sceneRenderer.checkTouchIntersection(screenX.toFloat(), screenY.toFloat())
        onObjectSelected(hit, screenX.toFloat(), screenY.toFloat())
        return hit
    }
}
