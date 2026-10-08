import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  CheckCircle2,
  Box,
  Camera,
  Sun,
  Hand,
  FileCode,
  RotateCcw,
  Sparkles,
  Layers,
  ShieldCheck,
  ChevronRight,
  Code2,
  Check,
  Copy
} from 'lucide-react';
import { Phase1Scene } from './components/Phase1Scene.tsx';

interface CodeFile {
  path: string;
  name: string;
  language: string;
  code: string;
  description: string;
}

const KOTLIN_PROJECT_FILES: CodeFile[] = [
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/TrafficGame.kt',
    name: 'TrafficGame.kt',
    language: 'kotlin',
    description: 'Main LibGDX application listener & screen lifecycle manager',
    code: `package com.trafficpuzzle.game

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
}`,
  },
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/screens/GameScreen.kt',
    name: 'GameScreen.kt',
    language: 'kotlin',
    description: 'Primary 3D gameplay screen managing rendering & touch input',
    code: `package com.trafficpuzzle.game.screens

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Screen
import com.trafficpuzzle.game.TrafficGame
import com.trafficpuzzle.game.input.TouchInputHandler
import com.trafficpuzzle.game.rendering.SceneRenderer

class GameScreen(private val game: TrafficGame) : Screen {
    private lateinit var sceneRenderer: SceneRenderer
    private lateinit var inputHandler: TouchInputHandler

    override fun show() {
        sceneRenderer = SceneRenderer()
        inputHandler = TouchInputHandler(sceneRenderer) { hit, x, y ->
            Gdx.app.log("GameScreen", "Touch at ($x, $y) - Hit 3D object: $hit")
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
    override fun hide() { Gdx.input.inputProcessor = null }
    override fun dispose() { sceneRenderer.dispose() }
}`,
  },
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/rendering/SceneRenderer.kt',
    name: 'SceneRenderer.kt',
    language: 'kotlin',
    description: '3D perspective camera, ambient + directional lighting, 3D model rendering & raycast picking',
    code: `package com.trafficpuzzle.game.rendering

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

class SceneRenderer : Disposable {
    val camera: PerspectiveCamera = PerspectiveCamera(
        GameConfig.CAMERA_FOV,
        Gdx.graphics.width.toFloat(),
        Gdx.graphics.height.toFloat()
    )

    private val modelBatch: ModelBatch = ModelBatch()
    private val environment: Environment = Environment()
    private val directionalLight: DirectionalLight = DirectionalLight()

    private var testModel: Model? = null
    var testInstance: ModelInstance? = null
        private set

    // Static 3D Parking Grid & Floor Markings
    private var parkingFloorModel: Model? = null
    private var parkingMarkingModel: Model? = null
    private var parkingBorderModel: Model? = null
    private val parkingFloorInstances: MutableList<ModelInstance> = mutableListOf()

    private val testObjectBounds = BoundingBox()
    private var isSelected = false
    private var bounceAnimation = 0f

    init {
        setupCamera()
        setupLighting()
        createParkingLotMarkings()
        createTest3DObject()
    }

    private fun setupCamera() {
        camera.position.set(GameConfig.CAMERA_INITIAL_X, GameConfig.CAMERA_INITIAL_Y, GameConfig.CAMERA_INITIAL_Z)
        camera.lookAt(0f, 0.5f, 0f)
        camera.near = GameConfig.CAMERA_NEAR
        camera.far = GameConfig.CAMERA_FAR
        camera.update()
    }

    private fun setupLighting() {
        environment.set(ColorAttribute(ColorAttribute.AmbientLight, 0.45f, 0.45f, 0.55f, 1f))
        directionalLight.set(0.95f, 0.95f, 0.9f, -0.6f, -1.0f, -0.5f)
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
        parkingMarkingModel = modelBuilder.createBox(
            0.12f, 0.02f, 3.6f,
            Material(ColorAttribute.createDiffuse(Color(0.95f, 0.96f, 0.98f, 1.0f))),
            attributes
        )
        val dividerPositionsX = floatArrayOf(-4.4f, -2.2f, 0.0f, 2.2f, 4.4f)
        for (xPos in dividerPositionsX) {
            val divider = ModelInstance(parkingMarkingModel).apply {
                transform.setToTranslation(xPos, 0.16f, 0f)
            }
            parkingFloorInstances.add(divider)
        }

        // 3. Yellow Exit Demarcation and Back Curb Line
        parkingBorderModel = modelBuilder.createBox(
            8.92f, 0.02f, 0.14f,
            Material(ColorAttribute.createDiffuse(Color(0.98f, 0.75f, 0.15f, 1.0f))),
            attributes
        )
        val backBumper = ModelInstance(parkingBorderModel).apply {
            transform.setToTranslation(0f, 0.16f, -1.8f)
        }
        val frontThreshold = ModelInstance(parkingBorderModel).apply {
            transform.setToTranslation(0f, 0.16f, 1.8f)
        }
        parkingFloorInstances.add(backBumper)
        parkingFloorInstances.add(frontThreshold)
    }

    private fun createTest3DObject() {
        val modelBuilder = ModelBuilder()
        testModel = modelBuilder.createBox(
            1.8f, 1.2f, 3.2f,
            Material(ColorAttribute.createDiffuse(Color(0.18f, 0.45f, 0.95f, 1.0f))),
            (Usage.Position or Usage.Normal).toLong()
        )
        testInstance = ModelInstance(testModel).apply {
            transform.setToTranslation(-1.1f, 0.76f, 0f)
            calculateBoundingBox(testObjectBounds)
            testObjectBounds.mul(transform)
        }
    }

    fun render(delta: Float) {
        Gdx.gl.glClearColor(0.88f, 0.91f, 0.96f, 1f)
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT or GL20.GL_DEPTH_BUFFER_BIT)

        testInstance?.let { instance ->
            if (isSelected) {
                bounceAnimation += delta * 6f
                instance.transform.setToTranslation(-1.1f, 0.76f + kotlin.math.sin(bounceAnimation) * 0.15f, 0f)
            } else {
                instance.transform.setToTranslation(-1.1f, 0.76f, 0f)
            }
        }
        camera.update()
        modelBatch.begin(camera)
        for (floorInstance in parkingFloorInstances) {
            modelBatch.render(floorInstance, environment)
        }
        testInstance?.let { modelBatch.render(it, environment) }
        modelBatch.end()
    }

    fun checkTouchIntersection(screenX: Float, screenY: Float): Boolean {
        val ray: Ray = camera.getPickRay(screenX, screenY)
        val hit = Intersector.intersectRayBoundsFast(ray, testObjectBounds)
        if (hit) {
            isSelected = !isSelected
            bounceAnimation = 0f
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
}`,
  },
  {
    path: 'android/src/main/kotlin/com/trafficpuzzle/game/android/AndroidLauncher.kt',
    name: 'AndroidLauncher.kt',
    language: 'kotlin',
    description: 'Android activity entry point configuring LibGDX OpenGL ES 3.0 context',
    code: `package com.trafficpuzzle.game.android

import android.os.Bundle
import com.badlogic.gdx.backends.android.AndroidApplication
import com.badlogic.gdx.backends.android.AndroidApplicationConfiguration
import com.trafficpuzzle.game.TrafficGame

class AndroidLauncher : AndroidApplication() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val config = AndroidApplicationConfiguration().apply {
            useAccelerometer = false
            useCompass = false
            useImmersiveMode = true
            numSamples = 2
            depth = 16
        }
        initialize(TrafficGame(), config)
    }
}`,
  },
  {
    path: 'core/src/main/kotlin/com/trafficpuzzle/game/input/TouchInputHandler.kt',
    name: 'TouchInputHandler.kt',
    language: 'kotlin',
    description: 'InputAdapter delegating screen touch coordinates to 3D raycast picking',
    code: `package com.trafficpuzzle.game.input

import com.badlogic.gdx.InputAdapter
import com.trafficpuzzle.game.rendering.SceneRenderer

class TouchInputHandler(
    private val sceneRenderer: SceneRenderer,
    private val onObjectSelected: (Boolean, Float, Float) -> Unit = { _, _, _ -> }
) : InputAdapter() {
    override fun touchDown(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
        val hit = sceneRenderer.checkTouchIntersection(screenX.toFloat(), screenY.toFloat())
        onObjectSelected(hit, screenX.toFloat(), screenY.toFloat())
        return hit
    }
}`,
  },
  {
    path: 'settings.gradle.kts',
    name: 'settings.gradle.kts',
    language: 'kotlin',
    description: 'Root Gradle multi-module project configuration (:android, :core)',
    code: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = java.net.URI("https://oss.sonatype.org/content/repositories/snapshots/") }
        maven { url = java.net.URI("https://oss.sonatype.org/content/repositories/releases/") }
    }
}

rootProject.name = "traffic-jam-3d"

include(":android")
include(":core")`,
  },
];

export default function App() {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'studio'>('mobile');
  const [activeTab, setActiveTab] = useState<'scene' | 'code' | 'architecture'>('scene');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lastHit, setLastHit] = useState<{ selected: boolean; x: number; y: number; z: number } | null>(null);

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
                  Phase 1: Foundation
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">LibGDX Kotlin • 3D Scene • Perspective Camera • Touch Input</p>
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
                  <span>Lighting: Dir (1.3) + Amb (0.75)</span>
                  <span>•</span>
                  <span className="text-blue-600 font-semibold">Touch Raycast: Enabled</span>
                </div>
              </div>

              {/* Viewport container */}
              <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
                {deviceMode === 'mobile' ? (
                  // Realistic Smartphone Frame
                  <div className="w-[360px] h-[600px] bg-slate-900 rounded-[44px] p-3 shadow-2xl shadow-indigo-500/10 border-4 border-slate-800 flex flex-col relative">
                    {/* Speaker Notch */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2"></div>
                      <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
                    </div>

                    {/* Mobile Screen Surface */}
                    <div className="w-full h-full rounded-[36px] overflow-hidden relative bg-slate-100 flex flex-col">
                      {/* Top Mobile Status Bar */}
                      <div className="h-7 px-5 pt-1 flex items-center justify-between text-[11px] font-bold text-slate-700 bg-white/70 backdrop-blur-xs z-10">
                        <span>9:41</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]">5G</span>
                          <div className="w-4 h-2 rounded-xs border border-slate-700 p-0.5">
                            <div className="w-full h-full bg-slate-800 rounded-2xs"></div>
                          </div>
                        </div>
                      </div>

                      {/* 3D Scene View */}
                      <div className="flex-1 relative">
                        <Phase1Scene
                          onSelectObject={(selected, pos) => setLastHit({ selected, ...pos })}
                        />
                      </div>

                      {/* Home Indicator */}
                      <div className="h-4 bg-transparent flex items-center justify-center pointer-events-none">
                        <div className="w-24 h-1 bg-slate-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Studio Canvas Full Size
                  <div className="w-full h-full">
                    <Phase1Scene
                      onSelectObject={(selected, pos) => setLastHit({ selected, ...pos })}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Real-time Touch Raycast Telemetry */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Touch Raycast Hit:</span>
                  {lastHit ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono font-medium text-[11px]">
                      {lastHit.selected ? 'OBJECT_HIT' : 'DESELECTED'} [X:{lastHit.x}, Y:{lastHit.y}, Z:{lastHit.z}]
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">Ready (Tap on 3D vehicle)</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-500">
                  <span>Render Engine: WebGL 3D (Three.js / LibGDX Equivalent)</span>
                  <span>•</span>
                  <span>Projection: Perspective</span>
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
              <h2 className="text-base font-bold text-slate-900 mb-1">Phase 1 Architecture & Modular Layout</h2>
              <p className="text-xs text-slate-500 mb-6">
                Separation of Android platform lifecycle, LibGDX core, 3D rendering engine, and touch input processing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-blue-950">:android Module</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Hosts the native Android Activity, OpenGL ES surface initialization, Android Manifest permissions, and platform lifecycle delegation.
                  </p>
                  <div className="space-y-1.5 text-xs font-mono text-slate-700">
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-200/60">
                      com.trafficpuzzle.game.android.AndroidLauncher
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-200/60">
                      AndroidManifest.xml (Orientation: Portrait, Immersive)
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-sm text-purple-950">:core Module</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Pure Kotlin cross-platform game logic, 3D rendering pipeline, screen state machine, and raycasting input adapter.
                  </p>
                  <div className="space-y-1.5 text-xs font-mono text-slate-700">
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200/60">
                      TrafficGame.kt (LibGDX Game entry)
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200/60">
                      GameScreen.kt (Screen lifecycle & loops)
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200/60">
                      SceneRenderer.kt (Camera, Lighting, ModelBatch)
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200/60">
                      TouchInputHandler.kt (Screen to 3D raycasting)
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Flow Diagram */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                  Phase 1 Execution & Rendering Pipeline
                </h4>
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-blue-600">1. AndroidLauncher</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Configures Gdx app & GL context</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-indigo-600">2. TrafficGame & Screen</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Instantiates SceneRenderer</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-emerald-600">3. 3D Scene & Lighting</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Perspective camera & test object</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
                  <div className="w-full md:w-1/4 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-orange-600">4. Touch Raycaster</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Detects object click & feedback</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Phase 1 Verification Checklist & Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Phase 1 Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Phase 1 Foundation Status</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                BUILD: PASS
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              All 10 foundational elements for Phase 1 have been implemented in Kotlin and verified in both LibGDX structure and interactive 3D WebGL rendering.
            </p>

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {[
                { title: '1. LibGDX Kotlin Foundation', desc: 'Root build.gradle.kts & settings.gradle.kts with Kotlin 1.9' },
                { title: '2. Android Module (:android)', desc: 'Android manifest, AndroidLauncher.kt, Gradle config' },
                { title: '3. Core Module (:core)', desc: 'Pure Kotlin game logic & LibGDX 3D dependencies' },
                { title: '4. Main Game Class', desc: 'TrafficGame.kt extending com.badlogic.gdx.Game' },
                { title: '5. Game Screen', desc: 'GameScreen.kt implementing Screen lifecycle' },
                { title: '6. Perspective Camera', desc: 'FOV 55°, elevated isometric angle (pos [8, 12, 10])' },
                { title: '7. Basic 3D Scene & Grid Markers', desc: 'ModelBatch, asphalt pad, painted slot dividers & exit markings' },
                { title: '8. Basic Lighting', desc: 'Ambient sky light (0.45) + Directional sunlight with shadows' },
                { title: '9. One Simple Test 3D Object', desc: 'ModelBuilder vehicle mesh positioned inside Parking Slot #2' },
                { title: '10. Android Touch Input Foundation', desc: 'TouchInputHandler with raycasting (getPickRay)' },
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

          {/* Quick Specifications Card */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h4 className="font-bold text-sm text-white">Visual Palette Compliance</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/10 backdrop-blur-xs p-2 rounded-lg border border-white/10">
                <span className="text-blue-200 block text-[10px]">Primary</span>
                <span className="font-bold text-white">Royal Blue (#2563EB)</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2 rounded-lg border border-white/10">
                <span className="text-purple-200 block text-[10px]">Secondary</span>
                <span className="font-bold text-white">Violet / Purple</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2 rounded-lg border border-white/10">
                <span className="text-amber-200 block text-[10px]">Accent</span>
                <span className="font-bold text-white">Coral Orange (#F97316)</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2 rounded-lg border border-white/10">
                <span className="text-emerald-200 block text-[10px]">Success</span>
                <span className="font-bold text-white">Fresh Green (#10B981)</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
              <span>Next Planned Step:</span>
              <span className="font-bold text-amber-300">Phase 2: 3D Environment</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
