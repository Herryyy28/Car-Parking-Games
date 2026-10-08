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

    private val testObjectBounds = BoundingBox()
    private val testObjectCenter = Vector3()
    private var isSelected = false
    private var bounceAnimation = 0f

    init {
        setupCamera()
        setupLighting()
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

    private fun createTest3DObject() {
        val modelBuilder = ModelBuilder()
        // Create a stylized 3D vehicle/block test object
        testModel = modelBuilder.createBox(
            1.8f, 1.2f, 3.2f,
            Material(ColorAttribute.createDiffuse(Color(0.18f, 0.45f, 0.95f, 1.0f))),
            (Usage.Position or Usage.Normal).toLong()
        )

        testInstance = ModelInstance(testModel).apply {
            transform.setToTranslation(0f, 0.6f, 0f)
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
                val bounceY = 0.6f + kotlin.math.sin(bounceAnimation) * 0.15f
                instance.transform.setToTranslation(0f, bounceY, 0f)
            } else {
                instance.transform.setToTranslation(0f, 0.6f, 0f)
            }
        }

        camera.update()

        modelBatch.begin(camera)
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
    }
}
