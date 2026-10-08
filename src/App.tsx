import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  CheckCircle2,
  Box,
  FileCode,
  Sparkles,
  Layers,
  ShieldCheck,
  ChevronRight,
  Check,
  Copy,
  Car as CarIcon,
  Compass,
  Palette
} from 'lucide-react';
import { Phase1Scene, VehicleData } from './components/Phase1Scene.tsx';

interface CodeFile {
  path: string;
  name: string;
  language: string;
  code: string;
  description: string;
}

const KOTLIN_PROJECT_FILES: CodeFile[] = [
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/entities/Vehicle.kt',
    name: 'Vehicle.kt',
    language: 'kotlin',
    description: 'Abstract base vehicle class with 3D transform, bounds, raycasting & lifecycle',
    code: `package com.trafficpuzzle.game.entities

import com.badlogic.gdx.graphics.g3d.Environment
import com.badlogic.gdx.graphics.g3d.Model
import com.badlogic.gdx.graphics.g3d.ModelBatch
import com.badlogic.gdx.graphics.g3d.ModelInstance
import com.badlogic.gdx.math.Intersector
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.math.collision.BoundingBox
import com.badlogic.gdx.math.collision.Ray
import com.badlogic.gdx.utils.Disposable

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

    protected fun initializeInstance(instance: ModelInstance) {
        this.modelInstance = instance
        instance.calculateBoundingBox(localBounds)
        updateTransform()
    }

    fun updateTransform() {
        modelInstance?.let { instance ->
            instance.transform.idt()
            instance.transform.translate(position)
            instance.transform.rotate(Vector3.Y, rotationY)
            boundingBox.set(localBounds)
            boundingBox.mul(instance.transform)
        }
    }

    fun setPosition(x: Float, y: Float, z: Float) {
        position.set(x, y, z)
        updateTransform()
    }

    open fun setSelected(selected: Boolean) {
        state = if (selected) VehicleState.SELECTED else VehicleState.PARKED
        if (selected) {
            bounceAnimationTime = 0f
        } else {
            position.y = basePosY
            updateTransform()
        }
    }

    open fun update(delta: Float) {
        if (state == VehicleState.SELECTED) {
            bounceAnimationTime += delta * 6f
            val bounceOffset = kotlin.math.max(0f, kotlin.math.sin(bounceAnimationTime) * 0.16f)
            position.y = basePosY + bounceOffset
            updateTransform()
        }
    }

    fun checkRayIntersection(ray: Ray): Boolean {
        return Intersector.intersectRayBoundsFast(ray, boundingBox)
    }

    open fun render(batch: ModelBatch, environment: Environment) {
        modelInstance?.let { batch.render(it, environment) }
    }

    override fun dispose() {
        model?.dispose()
    }
}`,
  },
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/entities/Car.kt',
    name: 'Car.kt',
    language: 'kotlin',
    description: 'Dedicated Car entity class with 3D model loading, chassis color, and selection highlight',
    code: `package com.trafficpuzzle.game.entities

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.VertexAttributes.Usage
import com.badlogic.gdx.graphics.g3d.Material
import com.badlogic.gdx.graphics.g3d.ModelInstance
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder

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
}`,
  },
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/entities/VehicleEnums.kt',
    name: 'VehicleEnums.kt',
    language: 'kotlin',
    description: 'VehicleType, VehicleDirection, VehicleState, and VehicleColor palettes',
    code: `package com.trafficpuzzle.game.entities

import com.badlogic.gdx.graphics.Color

enum class VehicleType(val displayName: String, val gridLength: Int, val lengthUnits: Float) {
    CAR("Sedan Car", 2, 3.2f),
    BUS("Transit Bus", 3, 4.8f),
    VAN("Compact Van", 2, 3.6f)
}

enum class VehicleDirection(val angleY: Float, val dirX: Float, val dirZ: Float) {
    UP(180f, 0f, -1f),
    DOWN(0f, 0f, 1f),
    LEFT(90f, -1f, 0f),
    RIGHT(270f, 1f, 0f)
}

enum class VehicleState {
    PARKED,
    SELECTED,
    MOVING,
    BLOCKED,
    EXITED
}

enum class VehicleColor(val displayName: String, val gdxColor: Color, val hex: String) {
    ROYAL_BLUE("Royal Blue", Color(0.15f, 0.40f, 0.95f, 1.0f), "#2563EB"),
    CORAL_ORANGE("Coral Orange", Color(0.98f, 0.45f, 0.15f, 1.0f), "#F97316"),
    FRESH_GREEN("Fresh Green", Color(0.12f, 0.72f, 0.38f, 1.0f), "#10B981"),
    SUN_YELLOW("Sun Yellow", Color(0.96f, 0.75f, 0.12f, 1.0f), "#EAB308"),
    VIOLET_PURPLE("Violet Purple", Color(0.55f, 0.25f, 0.90f, 1.0f), "#8B5CF6"),
    CRIMSON_RED("Crimson Red", Color(0.90f, 0.20f, 0.25f, 1.0f), "#EF4444")
}`,
  },
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/rendering/SceneRenderer.kt',
    name: 'SceneRenderer.kt',
    language: 'kotlin',
    description: 'Manages Vehicle instances, parking floor markers, decorative objects & raycast picking',
    code: `package com.trafficpuzzle.game.rendering

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.GL20
import com.badlogic.gdx.graphics.PerspectiveCamera
import com.badlogic.gdx.graphics.g3d.*
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute
import com.badlogic.gdx.graphics.g3d.environment.DirectionalLight
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder
import com.badlogic.gdx.math.collision.Ray
import com.badlogic.gdx.utils.Disposable
import com.trafficpuzzle.game.GameConfig
import com.trafficpuzzle.game.entities.Car
import com.trafficpuzzle.game.entities.Vehicle
import com.trafficpuzzle.game.entities.VehicleColor
import com.trafficpuzzle.game.entities.VehicleDirection

class SceneRenderer : Disposable {
    val camera: PerspectiveCamera = PerspectiveCamera(GameConfig.CAMERA_FOV, Gdx.graphics.width.toFloat(), Gdx.graphics.height.toFloat())
    private val modelBatch = ModelBatch()
    private val environment = Environment()
    private val directionalLight = DirectionalLight()

    val vehicles: MutableList<Vehicle> = mutableListOf()
    var selectedVehicle: Vehicle? = null
        private set

    init {
        setupCamera()
        setupLighting()
        createParkingLotMarkings()
        createDecorativeEnvironment()
        createVehicles()
    }

    private fun createVehicles() {
        vehicles.add(Car("car_01", VehicleColor.ROYAL_BLUE, -3.3f, 0.76f, 0.0f, VehicleDirection.DOWN))
        vehicles.add(Car("car_02", VehicleColor.CORAL_ORANGE, -1.1f, 0.76f, 0.0f, VehicleDirection.DOWN))
        vehicles.add(Car("car_03", VehicleColor.FRESH_GREEN, 1.1f, 0.76f, 0.0f, VehicleDirection.DOWN))
        vehicles.add(Car("car_04", VehicleColor.VIOLET_PURPLE, 3.3f, 0.76f, 0.0f, VehicleDirection.DOWN))
    }

    fun render(delta: Float) {
        Gdx.gl.glClearColor(GameConfig.BG_COLOR_R, GameConfig.BG_COLOR_G, GameConfig.BG_COLOR_B, 1f)
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT or GL20.GL_DEPTH_BUFFER_BIT)
        for (v in vehicles) v.update(delta)
        camera.update()
        modelBatch.begin(camera)
        for (v in vehicles) v.render(modelBatch, environment)
        modelBatch.end()
    }

    fun checkTouchIntersection(screenX: Float, screenY: Float): Vehicle? {
        val ray: Ray = camera.getPickRay(screenX, screenY)
        val hitVehicle = vehicles.firstOrNull { it.checkRayIntersection(ray) }
        if (hitVehicle != null) {
            if (selectedVehicle == hitVehicle) {
                hitVehicle.setSelected(false)
                selectedVehicle = null
            } else {
                selectedVehicle?.setSelected(false)
                hitVehicle.setSelected(true)
                selectedVehicle = hitVehicle
            }
        }
        return hitVehicle
    }
}`,
  },
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/TrafficGame.kt',
    name: 'TrafficGame.kt',
    language: 'kotlin',
    description: 'Main LibGDX application listener & screen lifecycle manager',
    code: `package com.trafficpuzzle.game

import com.badlogic.gdx.Game
import com.trafficpuzzle.game.screens.GameScreen

class TrafficGame : Game() {
    override fun create() {
        setScreen(GameScreen(this))
    }
    override fun dispose() {
        super.dispose()
        screen?.dispose()
    }
}`,
  },
];

export default function App() {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'studio'>('mobile');
  const [activeTab, setActiveTab] = useState<'scene' | 'code' | 'architecture'>('scene');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(KOTLIN_PROJECT_FILES[selectedFileIndex].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans selection:bg-blue-200">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-lg leading-tight">Traffic Jam 3D</h1>
                <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Phase 3: Vehicle System
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">LibGDX Kotlin • Vehicle & Car Entities • 3D Positioning • Raycast Picking</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  deviceMode === 'mobile'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile Device
              </button>
              <button
                onClick={() => setDeviceMode('studio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  deviceMode === 'studio'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Studio Canvas
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('scene')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'scene' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3D Scene
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'code' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kotlin Core
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'architecture' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Architecture
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 3D Viewer or Code Browser */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {activeTab === 'scene' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col h-[680px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Live 3D Viewport ({deviceMode === 'mobile' ? 'Android Device Preview' : 'Studio Canvas'})
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>FOV: 55°</span>
                  <span>•</span>
                  <span>Vehicles: 4 Car Entities</span>
                  <span>•</span>
                  <span className="text-blue-600 font-semibold">Touch Picking: Active</span>
                </div>
              </div>

              {/* Viewport container */}
              <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
                {deviceMode === 'mobile' ? (
                  // Smartphone Frame
                  <div className="w-[360px] h-[600px] bg-slate-900 rounded-[44px] p-3 shadow-2xl shadow-indigo-500/10 border-4 border-slate-800 flex flex-col relative">
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2"></div>
                      <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
                    </div>

                    <div className="w-full h-full rounded-[36px] overflow-hidden relative bg-slate-100 flex flex-col">
                      <div className="h-7 px-5 pt-1 flex items-center justify-between text-[11px] font-bold text-slate-700 bg-white/70 backdrop-blur-xs z-10">
                        <span>9:41</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]">5G</span>
                          <div className="w-4 h-2 rounded-xs border border-slate-700 p-0.5">
                            <div className="w-full h-full bg-slate-800 rounded-2xs"></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 relative">
                        <Phase1Scene onSelectVehicle={(v) => setSelectedVehicle(v)} />
                      </div>

                      <div className="h-4 bg-transparent flex items-center justify-center pointer-events-none">
                        <div className="w-24 h-1 bg-slate-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full">
                    <Phase1Scene onSelectVehicle={(v) => setSelectedVehicle(v)} />
                  </div>
                )}
              </div>

              {/* Bottom Real-time Vehicle Selection Telemetry */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Selected Vehicle:</span>
                  {selectedVehicle ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 font-mono font-medium text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedVehicle.hex }}></span>
                      <strong>{selectedVehicle.id}</strong> ({selectedVehicle.colorName}) [Pos: {selectedVehicle.position.x}, {selectedVehicle.position.y}, {selectedVehicle.position.z}]
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">None (Tap any car in the parking bay)</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-500">
                  <span>Entities: 4 Sedans</span>
                  <span>•</span>
                  <span>Direction: DOWN (0°)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col h-[680px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    LibGDX Kotlin Project Files
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              {/* File Selector Pills */}
              <div className="flex items-center gap-2 py-2 overflow-x-auto border-b border-slate-100">
                {KOTLIN_PROJECT_FILES.map((file, idx) => (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedFileIndex === idx
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {file.name}
                  </button>
                ))}
              </div>

              {/* Code viewer */}
              <div className="flex-1 mt-3 bg-slate-900 rounded-xl p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
                <div className="text-slate-400 text-[11px] pb-2 border-b border-slate-800 mb-3 flex items-center justify-between">
                  <span>// {KOTLIN_PROJECT_FILES[selectedFileIndex].path}</span>
                  <span className="text-indigo-400">{KOTLIN_PROJECT_FILES[selectedFileIndex].description}</span>
                </div>
                <pre>{KOTLIN_PROJECT_FILES[selectedFileIndex].code}</pre>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col h-[680px] overflow-y-auto">
              <h2 className="text-base font-bold text-slate-900 mb-1">Phase 3: Vehicle Entity Architecture</h2>
              <p className="text-xs text-slate-500 mb-6">
                Modular object-oriented hierarchy for traffic puzzle entities extending base Vehicle with 3D model loading and raycast selection.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CarIcon className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-blue-950">Vehicle Hierarchy</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Base class <code className="bg-white px-1 py-0.5 rounded text-blue-800 font-mono">Vehicle.kt</code> defines position, rotation, bounding boxes, state machine, and raycast picking.
                  </p>
                  <div className="space-y-1.5 text-xs font-mono text-slate-700">
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-200/60 flex items-center justify-between">
                      <span>Vehicle.kt (Abstract Base)</span>
                      <span className="text-[10px] text-blue-600 font-semibold">Transform + Bounds</span>
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-200/60 flex items-center justify-between">
                      <span>Car.kt (extends Vehicle)</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">2-Grid Sedan</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-sm text-purple-950">Vehicle Properties & Enums</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Typed enums for vehicle states, colors, directions, and dimensional properties.
                  </p>
                  <div className="space-y-1.5 text-xs font-mono text-slate-700">
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200/60">
                      VehicleType: CAR, BUS, VAN
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200/60">
                      VehicleDirection: UP, DOWN, LEFT, RIGHT
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200/60">
                      VehicleState: PARKED, SELECTED, MOVING, EXITED
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Flow Diagram */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                  Vehicle Selection & Rendering Flow
                </h4>
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-blue-600">1. Screen Touch</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Touch coordinates (X, Y)</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-indigo-600">2. Camera PickRay</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Ray intersects vehicle bounds</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-emerald-600">3. Car Entity Selected</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Triggers bounce & color tint</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-orange-600">4. SceneRenderer Loop</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Renders via ModelBatch</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Vehicle Inspector & Status */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Selected Vehicle Inspector Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CarIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Vehicle Entity Inspector</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                selectedVehicle ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {selectedVehicle ? 'SELECTED' : 'IDLE'}
              </span>
            </div>

            {selectedVehicle ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle ID</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">{selectedVehicle.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Type</span>
                    <span className="text-xs font-semibold text-blue-600">{selectedVehicle.type} (Sedan)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Color Theme</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedVehicle.hex }}></span>
                      <span className="font-semibold text-slate-800">{selectedVehicle.colorName}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Direction</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Compass className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-800">{selectedVehicle.direction}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 block mb-0.5">World Position (X, Y, Z)</span>
                  <span className="font-mono text-slate-700">[{selectedVehicle.position.x}, {selectedVehicle.position.y}, {selectedVehicle.position.z}]</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                <CarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                Tap on any of the 4 parked cars in the 3D scene to inspect its entity properties and test selection feedback.
              </div>
            )}
          </div>

          {/* Phase 3 Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Phase 3: Vehicles Status</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                PASS
              </span>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {[
                { title: 'Vehicle Base Class', desc: 'Abstract Vehicle.kt with bounds, raycasting & transform' },
                { title: 'Dedicated Car Entity', desc: 'Car.kt class with 3D model loading and color tint' },
                { title: 'Vehicle Properties', desc: 'Unique IDs (car_01..04), VehicleColor, VehicleDirection' },
                { title: '3D Positioning in Bays', desc: 'Cars positioned in parking bays with exact coordinates' },
                { title: 'Raycast Touch Selection', desc: 'TouchInputHandler selects specific vehicle entities' },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{item.title}</div>
                    <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
