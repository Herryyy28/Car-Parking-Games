package com.trafficpuzzle.game.rendering

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.GL20
import com.badlogic.gdx.graphics.PerspectiveCamera
import com.badlogic.gdx.graphics.VertexAttributes.Usage
import com.badlogic.gdx.graphics.g3d.*
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute
import com.badlogic.gdx.graphics.g3d.environment.DirectionalLight
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder
import com.badlogic.gdx.math.Intersector
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.math.collision.BoundingBox
import com.badlogic.gdx.math.collision.Ray
import com.badlogic.gdx.utils.Disposable
import com.trafficpuzzle.game.GameConfig

/**
 * Handles 3D camera setup, lighting, model batching, and rendering of 3D scene objects.
 */
class SceneRenderer : Disposable {

    val camera: PerspectiveCamera = PerspectiveCamera(
        GameConfig.CAMERA_FOV,
        Gdx.graphics.width.toFloat(),
        Gdx.graphics.height.toFloat()
    )

    private val modelBatch: ModelBatch = ModelBatch()
    private val environment: Environment = Environment()
    private val directionalLight: DirectionalLight = DirectionalLight()

    // Test 3D Object
    private var testModel: Model? = null
    var testInstance: ModelInstance? = null
        private set

    // Static 3D Parking Grid & Floor Markings
    private var parkingFloorModel: Model? = null
    private var parkingMarkingModel: Model? = null
    private var parkingBorderModel: Model? = null
    private val parkingFloorInstances: MutableList<ModelInstance> = mutableListOf()

    private val testObjectBounds = BoundingBox()
    private val testObjectCenter = Vector3()
    private var isSelected = false
    private var bounceAnimation = 0f

    init {
        setupCamera()
        setupLighting()
        createParkingLotMarkings()
        createTest3DObject()
    }

    private fun setupCamera() {
        camera.position.set(
            GameConfig.CAMERA_INITIAL_X,
            GameConfig.CAMERA_INITIAL_Y,
            GameConfig.CAMERA_INITIAL_Z
        )
        camera.lookAt(0f, 0.5f, 0f)
        camera.near = GameConfig.CAMERA_NEAR
        camera.far = GameConfig.CAMERA_FAR
        camera.update()
    }

    private fun setupLighting() {
        environment.set(
            ColorAttribute(
                ColorAttribute.AmbientLight,
                GameConfig.AMBIENT_LIGHT_R,
                GameConfig.AMBIENT_LIGHT_G,
                GameConfig.AMBIENT_LIGHT_B,
                GameConfig.AMBIENT_LIGHT_A
            )
        )

        directionalLight.set(
            GameConfig.DIR_LIGHT_R,
            GameConfig.DIR_LIGHT_G,
            GameConfig.DIR_LIGHT_B,
            GameConfig.DIR_LIGHT_DIR_X,
            GameConfig.DIR_LIGHT_DIR_Y,
            GameConfig.DIR_LIGHT_DIR_Z
        )
        environment.add(directionalLight)
    }

    private fun createParkingLotMarkings() {
        val modelBuilder = ModelBuilder()
        val attributes = (Usage.Position or Usage.Normal).toLong()

        // 1. Asphalt parking pad (12x12 area)
        parkingFloorModel = modelBuilder.createBox(
            12.0f, 0.15f, 12.0f,
            Material(ColorAttribute.createDiffuse(Color(0.25f, 0.29f, 0.36f, 1.0f))),
            attributes
        )
        val padInstance = ModelInstance(parkingFloorModel).apply {
            transform.setToTranslation(0f, 0.075f, 0f)
        }
        parkingFloorInstances.add(padInstance)

        // 2. Parking Lot Markings (White painted stripes defining slots)
        // Horizontal slot divider stripe model (width 0.12f, height 0.02f, length 3.6f)
        parkingMarkingModel = modelBuilder.createBox(
            0.12f, 0.02f, 3.6f,
            Material(ColorAttribute.createDiffuse(Color(0.95f, 0.96f, 0.98f, 1.0f))),
            attributes
        )

        // Create 4 parallel parking slots (x = -3.3f, -1.1f, 1.1f, 3.3f)
        val dividerPositionsX = floatArrayOf(-4.4f, -2.2f, 0.0f, 2.2f, 4.4f)
        for (xPos in dividerPositionsX) {
            val dividerInstance = ModelInstance(parkingMarkingModel).apply {
                transform.setToTranslation(xPos, 0.16f, 0f)
            }
            parkingFloorInstances.add(dividerInstance)
        }

        // 3. Yellow Exit Demarcation and Back Curb Line
        parkingBorderModel = modelBuilder.createBox(
            8.92f, 0.02f, 0.14f,
            Material(ColorAttribute.createDiffuse(Color(0.98f, 0.75f, 0.15f, 1.0f))),
            attributes
        )
        // Back bumper line
        val backBumperInstance = ModelInstance(parkingBorderModel).apply {
            transform.setToTranslation(0f, 0.16f, -1.8f)
        }
        parkingFloorInstances.add(backBumperInstance)

        // Front exit threshold line (dashed / open look)
        val frontThresholdInstance = ModelInstance(parkingBorderModel).apply {
            transform.setToTranslation(0f, 0.16f, 1.8f)
        }
        parkingFloorInstances.add(frontThresholdInstance)
    }

    private fun createTest3DObject() {
        val modelBuilder = ModelBuilder()
        // Create a stylized 3D vehicle/block test object
        testModel = modelBuilder.createBox(
            1.8f, 1.2f, 3.2f,
            Material(ColorAttribute.createDiffuse(Color(0.18f, 0.45f, 0.95f, 1.0f))),
            (Usage.Position or Usage.Normal).toLong()
        )

        testInstance = ModelInstance(testModel).apply {
            // Position vehicle inside parking slot 2 (x = -1.1f)
            transform.setToTranslation(-1.1f, 0.76f, 0f)
            calculateBoundingBox(testObjectBounds)
            testObjectBounds.mul(transform)
            testObjectBounds.getCenter(testObjectCenter)
        }
    }

    fun resize(width: Int, height: Int) {
        camera.viewportWidth = width.toFloat()
        camera.viewportHeight = height.toFloat()
        camera.update()
    }

    fun render(delta: Float) {
        // Clear background with soft bright color
        Gdx.gl.glViewport(0, 0, Gdx.graphics.width, Gdx.graphics.height)
        Gdx.gl.glClearColor(
            GameConfig.BG_COLOR_R,
            GameConfig.BG_COLOR_G,
            GameConfig.BG_COLOR_B,
            GameConfig.BG_COLOR_A
        )
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT or GL20.GL_DEPTH_BUFFER_BIT)

        // Animate selection bounce if selected
        testInstance?.let { instance ->
            if (isSelected) {
                bounceAnimation += delta * 6f
                val bounceY = 0.76f + kotlin.math.sin(bounceAnimation) * 0.15f
                instance.transform.setToTranslation(-1.1f, bounceY, 0f)
            } else {
                instance.transform.setToTranslation(-1.1f, 0.76f, 0f)
            }
        }

        camera.update()

        modelBatch.begin(camera)
        // Render static parking lot floor and grid markers
        for (floorInstance in parkingFloorInstances) {
            modelBatch.render(floorInstance, environment)
        }
        // Render test vehicle
        testInstance?.let { instance ->
            modelBatch.render(instance, environment)
        }
        modelBatch.end()
    }

    /**
     * Raycasts from screen coordinates to check touch collision with the test 3D object.
     */
    fun checkTouchIntersection(screenX: Float, screenY: Float): Boolean {
        val ray: Ray = camera.getPickRay(screenX, screenY)
        val hit = Intersector.intersectRayBoundsFast(ray, testObjectBounds)

        if (hit) {
            isSelected = !isSelected
            bounceAnimation = 0f
            // Toggle material color for visual feedback
            testInstance?.let { instance ->
                val material = instance.materials.first()
                val colorAttr = material.get(ColorAttribute.Diffuse) as? ColorAttribute
                if (colorAttr != null) {
                    if (isSelected) {
                        colorAttr.color.set(0.98f, 0.45f, 0.15f, 1.0f) // Highlight Coral Orange
                    } else {
                        colorAttr.color.set(0.18f, 0.45f, 0.95f, 1.0f) // Royal Blue
                    }
                }
            }
        }
        return hit
    }

    override fun dispose() {
        modelBatch.dispose()
        testModel?.dispose()
        parkingFloorModel?.dispose()
        parkingMarkingModel?.dispose()
        parkingBorderModel?.dispose()
    }
}
