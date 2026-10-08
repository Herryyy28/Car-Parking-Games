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
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.math.collision.Ray
import com.badlogic.gdx.utils.Disposable
import com.trafficpuzzle.game.GameConfig
import com.trafficpuzzle.game.entities.Car
import com.trafficpuzzle.game.entities.Vehicle
import com.trafficpuzzle.game.entities.VehicleColor
import com.trafficpuzzle.game.entities.VehicleDirection

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

    // Dedicated Vehicle Entities
    val vehicles: MutableList<Vehicle> = mutableListOf()
    var selectedVehicle: Vehicle? = null
        private set

    // Static 3D Parking Grid & Floor Markings
    private var parkingFloorModel: Model? = null
    private var parkingMarkingModel: Model? = null
    private var parkingBorderModel: Model? = null
    private val parkingFloorInstances: MutableList<ModelInstance> = mutableListOf()

    // Decorative 3D Low-Poly Models (Trees, Street Lamps)
    private var treeTrunkModel: Model? = null
    private var treeFoliageModel: Model? = null
    private var treeFoliageTopModel: Model? = null
    private var lampPostModel: Model? = null
    private var lampFixtureModel: Model? = null
    private val decorativeInstances: MutableList<ModelInstance> = mutableListOf()

    init {
        setupCamera()
        setupLighting()
        createParkingLotMarkings()
        createDecorativeEnvironment()
        createVehicles()
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

    private fun createDecorativeEnvironment() {
        val modelBuilder = ModelBuilder()
        val attributes = (Usage.Position or Usage.Normal).toLong()

        // 1. Low-poly Tree Models
        treeTrunkModel = modelBuilder.createCylinder(
            0.35f, 1.2f, 0.35f, 8,
            Material(ColorAttribute.createDiffuse(Color(0.42f, 0.26f, 0.14f, 1.0f))),
            attributes
        )
        treeFoliageModel = modelBuilder.createCone(
            1.8f, 2.0f, 1.8f, 7,
            Material(ColorAttribute.createDiffuse(Color(0.18f, 0.65f, 0.32f, 1.0f))),
            attributes
        )
        treeFoliageTopModel = modelBuilder.createCone(
            1.3f, 1.5f, 1.3f, 7,
            Material(ColorAttribute.createDiffuse(Color(0.25f, 0.74f, 0.38f, 1.0f))),
            attributes
        )

        // Tree Placements around the parking lot edges
        val treePositions = arrayOf(
            Vector3(-4.8f, 0f, -6.6f),
            Vector3(-1.6f, 0f, -6.8f),
            Vector3(1.6f, 0f, -6.8f),
            Vector3(4.8f, 0f, -6.6f),
            Vector3(-6.8f, 0f, 0.5f),
            Vector3(6.8f, 0f, 0.5f)
        )

        for (pos in treePositions) {
            // Trunk
            val trunk = ModelInstance(treeTrunkModel).apply {
                transform.setToTranslation(pos.x, 0.6f, pos.z)
            }
            // Foliage base tier
            val foliageBase = ModelInstance(treeFoliageModel).apply {
                transform.setToTranslation(pos.x, 1.8f, pos.z)
            }
            // Foliage top tier
            val foliageTop = ModelInstance(treeFoliageTopModel).apply {
                transform.setToTranslation(pos.x, 2.7f, pos.z)
            }
            decorativeInstances.add(trunk)
            decorativeInstances.add(foliageBase)
            decorativeInstances.add(foliageTop)
        }

        // 2. Low-poly Street Lamp Models
        lampPostModel = modelBuilder.createBox(
            0.16f, 3.0f, 0.16f,
            Material(ColorAttribute.createDiffuse(Color(0.20f, 0.24f, 0.30f, 1.0f))),
            attributes
        )
        lampFixtureModel = modelBuilder.createBox(
            0.45f, 0.22f, 0.45f,
            Material(ColorAttribute.createDiffuse(Color(0.98f, 0.88f, 0.35f, 1.0f))),
            attributes
        )

        // Street Lamp Placements (flanking left and right sides)
        val lampPositions = arrayOf(
            Vector3(-6.5f, 0f, -3.2f),
            Vector3(-6.5f, 0f, 3.8f),
            Vector3(6.5f, 0f, -3.2f),
            Vector3(6.5f, 0f, 3.8f)
        )

        for (pos in lampPositions) {
            val post = ModelInstance(lampPostModel).apply {
                transform.setToTranslation(pos.x, 1.5f, pos.z)
            }
            val fixture = ModelInstance(lampFixtureModel).apply {
                transform.setToTranslation(pos.x, 3.0f, pos.z)
            }
            decorativeInstances.add(post)
            decorativeInstances.add(fixture)
        }
    }

    private fun createVehicles() {
        // Instantiate real Car entities in the designated parking bays
        vehicles.add(Car("car_01", VehicleColor.ROYAL_BLUE, -3.3f, 0.76f, 0.0f, VehicleDirection.DOWN))
        vehicles.add(Car("car_02", VehicleColor.CORAL_ORANGE, -1.1f, 0.76f, 0.0f, VehicleDirection.DOWN))
        vehicles.add(Car("car_03", VehicleColor.FRESH_GREEN, 1.1f, 0.76f, 0.0f, VehicleDirection.DOWN))
        vehicles.add(Car("car_04", VehicleColor.VIOLET_PURPLE, 3.3f, 0.76f, 0.0f, VehicleDirection.DOWN))
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

        // Update all vehicle entities
        for (vehicle in vehicles) {
            vehicle.update(delta)
        }

        camera.update()

        modelBatch.begin(camera)
        // Render static parking lot floor and grid markers
        for (floorInstance in parkingFloorInstances) {
            modelBatch.render(floorInstance, environment)
        }
        // Render decorative 3D low-poly environment objects (trees, street lamps)
        for (decorInstance in decorativeInstances) {
            modelBatch.render(decorInstance, environment)
        }
        // Render dedicated Vehicle entities
        for (vehicle in vehicles) {
            vehicle.render(modelBatch, environment)
        }
        modelBatch.end()
    }

    /**
     * Raycasts from screen coordinates to select or deselect specific vehicle entities.
     */
    fun checkTouchIntersection(screenX: Float, screenY: Float): Vehicle? {
        val ray: Ray = camera.getPickRay(screenX, screenY)
        val hitVehicle = vehicles.firstOrNull { it.checkRayIntersection(ray) }

        if (hitVehicle != null) {
            if (selectedVehicle == hitVehicle) {
                // Deselect current
                hitVehicle.setSelected(false)
                selectedVehicle = null
            } else {
                // Deselect previous, select new
                selectedVehicle?.setSelected(false)
                hitVehicle.setSelected(true)
                selectedVehicle = hitVehicle
            }
        }
        return hitVehicle
    }

    override fun dispose() {
        modelBatch.dispose()
        for (vehicle in vehicles) {
            vehicle.dispose()
        }
        parkingFloorModel?.dispose()
        parkingMarkingModel?.dispose()
        parkingBorderModel?.dispose()
        treeTrunkModel?.dispose()
        treeFoliageModel?.dispose()
        treeFoliageTopModel?.dispose()
        lampPostModel?.dispose()
        lampFixtureModel?.dispose()
    }
}
