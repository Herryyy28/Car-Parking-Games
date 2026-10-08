package com.trafficpuzzle.game.entities

import com.badlogic.gdx.graphics.g3d.Environment
import com.badlogic.gdx.graphics.g3d.Model
import com.badlogic.gdx.graphics.g3d.ModelBatch
import com.badlogic.gdx.graphics.g3d.ModelInstance
import com.badlogic.gdx.math.Intersector
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.math.collision.BoundingBox
import com.badlogic.gdx.math.collision.Ray
import com.badlogic.gdx.utils.Disposable

/**
 * Abstract base class for all vehicles (Car, Bus, Van) in Traffic Jam 3D.
 * Manages 3D transform, bounding box for touch raycasting, state, and rendering.
 */
abstract class Vehicle(
    val id: String,
    val type: VehicleType,
    val color: VehicleColor,
    initialX: Float,
    initialY: Float,
    initialZ: Float,
    var direction: VehicleDirection = VehicleDirection.DOWN
) : Disposable {

    val position: Vector3 = Vector3(initialX, initialY, initialZ)
    var rotationY: Float = direction.angleY
    var state: VehicleState = VehicleState.PARKED

    abstract val width: Float
    abstract val height: Float
    abstract val length: Float

    protected var model: Model? = null
    var modelInstance: ModelInstance? = null
        protected set

    val boundingBox: BoundingBox = BoundingBox()
    private val localBounds: BoundingBox = BoundingBox()

    private var bounceAnimationTime = 0f
    private val basePosY = initialY

    /**
     * Initializes the 3D model instance and calculates the collision bounds.
     */
    protected fun initializeInstance(instance: ModelInstance) {
        this.modelInstance = instance
        instance.calculateBoundingBox(localBounds)
        updateTransform()
    }

    /**
     * Updates world transform and aligns the world-space bounding box.
     */
    fun updateTransform() {
        modelInstance?.let { instance ->
            instance.transform.idt()
            instance.transform.translate(position)
            instance.transform.rotate(Vector3.Y, rotationY)

            boundingBox.set(localBounds)
            boundingBox.mul(instance.transform)
        }
    }

    /**
     * Sets vehicle position in world space.
     */
    fun setPosition(x: Float, y: Float, z: Float) {
        position.set(x, y, z)
        updateTransform()
    }

    /**
     * Toggles or sets selection state.
     */
    open fun setSelected(selected: Boolean) {
        state = if (selected) VehicleState.SELECTED else VehicleState.PARKED
        if (selected) {
            bounceAnimationTime = 0f
        } else {
            position.y = basePosY
            updateTransform()
        }
    }

    /**
     * Per-frame logic update (e.g. selection bounce or movement).
     */
    open fun update(delta: Float) {
        if (state == VehicleState.SELECTED) {
            bounceAnimationTime += delta * 6f
            val bounceOffset = kotlin.math.max(0f, kotlin.math.sin(bounceAnimationTime) * 0.16f)
            position.y = basePosY + bounceOffset
            updateTransform()
        }
    }

    /**
     * Tests raycast intersection from screen touch to vehicle's bounding box.
     */
    fun checkRayIntersection(ray: Ray): Boolean {
        return Intersector.intersectRayBoundsFast(ray, boundingBox)
    }

    /**
     * Renders the 3D vehicle model with environment lighting.
     */
    open fun render(batch: ModelBatch, environment: Environment) {
        modelInstance?.let { instance ->
            batch.render(instance, environment)
        }
    }

    override fun dispose() {
        model?.dispose()
    }
}
