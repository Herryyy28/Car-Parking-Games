package com.trafficpuzzle.game.input

import com.badlogic.gdx.InputAdapter
import com.trafficpuzzle.game.entities.Vehicle
import com.trafficpuzzle.game.rendering.SceneRenderer

/**
 * Handles Android touch events and delegates raycast hit testing to the 3D scene.
 */
class TouchInputHandler(
    private val sceneRenderer: SceneRenderer,
    private val onVehicleSelected: (Vehicle?, Float, Float) -> Unit = { _, _, _ -> }
) : InputAdapter() {

    override fun touchDown(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
        val hitVehicle = sceneRenderer.checkTouchIntersection(screenX.toFloat(), screenY.toFloat())
        onVehicleSelected(hitVehicle, screenX.toFloat(), screenY.toFloat())
        return hitVehicle != null
    }
}

