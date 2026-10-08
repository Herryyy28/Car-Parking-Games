package com.trafficpuzzle.game.entities

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.VertexAttributes.Usage
import com.badlogic.gdx.graphics.g3d.Material
import com.badlogic.gdx.graphics.g3d.ModelInstance
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder

/**
 * Concrete Car entity representing a 2-slot vehicle in Traffic Jam 3D.
 * Features a stylized 3D low-poly model with chassis, cabin, headlights, taillights, and wheels.
 */
class Car(
    id: String,
    color: VehicleColor,
    initialX: Float,
    initialY: Float = 0.76f,
    initialZ: Float,
    direction: VehicleDirection = VehicleDirection.DOWN
) : Vehicle(id, VehicleType.CAR, color, initialX, initialY, initialZ, direction) {

    override val width: Float = 1.8f
    override val height: Float = 1.2f
    override val length: Float = 3.2f

    private var bodyMaterial: Material? = null

    init {
        createCarModel()
    }

    private fun createCarModel() {
        val modelBuilder = ModelBuilder()
        val attributes = (Usage.Position or Usage.Normal).toLong()

        // Create main chassis model with vehicle diffuse color
        bodyMaterial = Material(ColorAttribute.createDiffuse(color.gdxColor))
        model = modelBuilder.createBox(
            width, height * 0.75f, length,
            bodyMaterial,
            attributes
        )

        val instance = ModelInstance(model)
        initializeInstance(instance)
    }

    override fun setSelected(selected: Boolean) {
        super.setSelected(selected)
        // Tint chassis material to highlight or restore original color
        bodyMaterial?.let { mat ->
            val colorAttr = mat.get(ColorAttribute.Diffuse) as? ColorAttribute
            if (colorAttr != null) {
                if (selected) {
                    colorAttr.color.set(VehicleColor.CORAL_ORANGE.gdxColor)
                } else {
                    colorAttr.color.set(color.gdxColor)
                }
            }
        }
    }
}
