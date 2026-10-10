import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Direction, GameState, GameStatus, PassengerState, VehicleColor, VehicleState, VehicleStateType, COLOR_MAP } from '../logic/types.ts';
import { sounds } from '../utils/soundEffects.ts';
import { BackgroundEnvironmentManager } from '../logic/backgroundManager.ts';
import { getWorldIdForLevel, getWorldConfig } from '../logic/worldThemes.ts';
import { DioramaTerrainSystem } from '../logic/dioramaTerrainSystem.ts';
import { OrganicRoadSystem } from '../logic/organicRoadSystem.ts';
import { NaturalVehiclePhysics, NaturalPhysicsState } from '../logic/vehiclePhysics.ts';
import { DynamicCameraController, CameraMode, CAMERA_MODE_METADATA } from '../logic/dynamicCamera.ts';
import { SplinePathGenerator } from '../logic/splinePathGenerator.ts';
import { AmbientTrafficSystem } from '../logic/ambientTrafficSystem.ts';
import { WeatherTimeSystem, WeatherType, WEATHER_CONDITIONS, getDefaultWeatherForWorld } from '../logic/weatherTimeSystem.ts';
import { WorldRoadMarkingsSystem } from '../logic/worldRoadMarkings.ts';
import { AdvancedParkingEvaluator, ParkingGrade } from '../logic/parkingEvaluator.ts';
import { ReactivePropsSystem } from '../logic/reactivePropsSystem.ts';
import { inCabRadio, RADIO_STATIONS, RadioStation } from '../utils/radioSynthesizer.ts';
import { LIVERIES, UNDERGLOWS, RIMS, HORNS } from '../logic/garageCustomization.ts';
import { PlayerProgress, GraphicsQuality } from '../logic/playerProgress.ts';
import { buildDioramaVehicleMesh } from '../logic/vehicleModelFactory.ts';
import { ArenaLightManager } from '../logic/arenaLightManager.ts';
import { PathFollowingGroundSystem } from '../logic/pathFollowingGroundSystem.ts';
import {
  Camera,
  Compass,
  Video,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  CloudRain,
  Sun,
  Cloud,
  Snowflake,
  Radio,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Download,
  Sliders,
  Palette,
  X,
  Check,
  Disc,
} from 'lucide-react';

interface BusMadnessArenaProps {
  gameState: GameState;
  onVehicleTapRequest: (vehicleId: string) => {
    success: boolean;
    blockerId: string | null;
    dockIndex?: number;
    reason?: string;
  } | void;
  onVehicleArrivedAtDock: (vehicleId: string, dockIndex: number) => void;
  onDockUnlockClicked: () => void;
  activeHintId: string | null;
  isCompleted?: boolean;
  onConfettiComplete?: () => void;
  onParkingEvaluated?: (grade: ParkingGrade) => void;
  graphicsQuality?: GraphicsQuality;
  customizationVersion?: number;
}

function getDockPositions(count: number = 1): number[] {
  const safeCount = Math.max(1, Math.min(7, count || 1));
  const spacing = 2.8;
  const startX = -((safeCount - 1) * spacing) / 2;
  const positions: number[] = [];
  for (let i = 0; i < safeCount; i++) {
    positions.push(startX + i * spacing);
  }
  return positions;
}

function getDockX(index: number, count: number = 1): number {
  const positions = getDockPositions(count);
  return positions[Math.min(Math.max(0, index), positions.length - 1)] ?? 0;
}

const DOCK_X_POSITIONS = [-5.6, -2.8, 0, 2.8, 5.6];
const DOCK_SLANT_ANGLE = -0.42; // ~-24 deg diagonal angle matching reference screenshots
const DOCK_Z = -6.8;
const CELL_SIZE = 2.2;
const GRID_OFFSET_Z = 4.5;

function gridToWorld(
  row: number,
  col: number,
  length: number,
  direction: Direction,
  gridRows = 7,
  gridCols = 7
): { x: number; z: number } {
  const isHorizontal = direction === Direction.LEFT || direction === Direction.RIGHT;
  const halfCols = (gridCols - 1) / 2;
  const halfRows = (gridRows - 1) / 2;
  if (isHorizontal) {
    const centerCol = col + (length - 1) / 2;
    return {
      x: (centerCol - halfCols) * CELL_SIZE,
      z: (row - halfRows) * CELL_SIZE + GRID_OFFSET_Z,
    };
  } else {
    const centerRow = row + (length - 1) / 2;
    return {
      x: (col - halfCols) * CELL_SIZE,
      z: (centerRow - halfRows) * CELL_SIZE + GRID_OFFSET_Z,
    };
  }
}

function directionToAngle(direction: Direction): number {
  switch (direction) {
    case Direction.UP:
      return 0; // Local -Z
    case Direction.DOWN:
      return Math.PI; // Local +Z
    case Direction.LEFT:
      return Math.PI / 2; // Local -X
    case Direction.RIGHT:
      return -Math.PI / 2; // Local +X
  }
}

interface HumanoidRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  shadow: THREE.Mesh;
  colorHex: string;
}

interface ActiveWalker {
  id: string;
  rig: HumanoidRig;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  duration: number;
}

function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}

function createArticulatedHumanoid(colorHex: string, scale = 1.0, isVip = false): HumanoidRig {
  const root = new THREE.Group();
  root.scale.set(scale, scale, scale);

  const shadowGeo = new THREE.CircleGeometry(0.32, 12);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const hips = new THREE.Group();
  hips.position.y = 0.45;
  root.add(hips);

  // High-gloss jelly material matching reference screenshot
  const jellyMat = new THREE.MeshStandardMaterial({
    color: isVip ? 0xfacc15 : new THREE.Color(colorHex),
    roughness: 0.12,
    metalness: 0.05,
    emissive: isVip ? 0xf59e0b : 0x000000,
    emissiveIntensity: isVip ? 0.4 : 0,
  });

  // Pill-shaped body (Capsule)
  const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.3, 16, 16);
  const torso = new THREE.Mesh(bodyGeo, jellyMat);
  torso.position.y = -0.05;
  torso.castShadow = true;
  hips.add(torso);

  // Round head sphere
  const head = new THREE.Group();
  head.position.set(0, 0.38, 0);
  const headGeo = new THREE.SphereGeometry(0.26, 24, 24);
  const headMesh = new THREE.Mesh(headGeo, jellyMat);
  headMesh.castShadow = true;
  head.add(headMesh);
  hips.add(head);

  // Floating Golden Crown for VIP Passengers
  if (isVip) {
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfbbf24, emissiveIntensity: 1.8, metalness: 0.95, roughness: 0.08 });
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 5), crownMat);
    crown.position.set(0, 0.4, 0);
    crown.rotation.x = Math.PI;
    head.add(crown);
  }

  // Dummy groups to satisfy HumanoidRig interface without crashing animation loop
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  hips.add(leftArm, rightArm, leftLeg, rightLeg);

  return { root, hips, torso, head, leftArm, rightArm, leftLeg, rightLeg, shadow, colorHex };
}

function createParkingBayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 512);

  // Solid thick white parking stall outline matching reference screenshots (frame_05.jpg)
  // Stall shape: rounded top corners, solid side walls, open bottom with small corner turn-ins
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  const left = 22;
  const right = 234;
  const top = 22;
  const bottom = 490;
  const radius = 32;
  const bottomInward = 44; // inward stroke length at bottom

  ctx.beginPath();
  // Start at bottom-left inward opening
  ctx.moveTo(left + bottomInward, bottom);
  // Turn left to bottom-left corner
  ctx.arcTo(left, bottom, left, bottom - radius, radius);
  // Go up along left edge to top-left corner
  ctx.arcTo(left, top, left + radius, top, radius);
  // Go right along top edge to top-right corner
  ctx.arcTo(right, top, right, top + radius, radius);
  // Go down along right edge to bottom-right corner
  ctx.arcTo(right, bottom, right - bottomInward, bottom, radius);
  // Turn left into bottom-right inward tab
  ctx.lineTo(right - bottomInward, bottom);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function createAirportSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Left golden stars (stacked vertically like frame_05.jpg)
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 4;
  ctx.font = '900 62px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('â˜…', 140, 110);
  ctx.fillText('â˜…', 175, 160);

  // White airplane silhouette flying through
  ctx.font = '900 80px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('âœˆ', 590, 85);

  // "Airport" 3D script text in hot pink with thick white border
  ctx.font = '900 124px "Fredoka", "Arial Rounded MT Bold", cursive, sans-serif';
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('Airport', 490, 150);

  ctx.fillStyle = '#f43f5e';
  ctx.fillText('Airport', 490, 150);

  // Inner warm highlight
  ctx.fillStyle = '#fb7185';
  ctx.font = '900 116px "Fredoka", "Arial Rounded MT Bold", cursive, sans-serif';
  ctx.fillText('Airport', 490, 147);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateBusStopSignTexture(count: number, canvas: HTMLCanvasElement, texture: THREE.CanvasTexture) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Outer slate scoreboard frame with warm golden border (frame_05.jpg & frame_06.jpg)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#f59e0b'; // Warm golden border
  ctx.lineWidth = 10;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 24);
  } else {
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  }
  ctx.fill();
  ctx.stroke();

  // Subtle inner gold highlight line
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(16, 16, canvas.width - 32, canvas.height - 32, 18);
  }
  ctx.stroke();

  // Large bold white count on top
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 94px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${count}`, canvas.width / 2, 72);

  // Bottom "Left" label (Matching "60 Left" in frame_05.jpg & "34 Left" in frame_06.jpg)
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Left', canvas.width / 2, 140);

  texture.needsUpdate = true;
}

export const BusMadnessArena: React.FC<BusMadnessArenaProps> = ({
  gameState,
  onVehicleTapRequest,
  onVehicleArrivedAtDock,
  onDockUnlockClicked,
  activeHintId,
  isCompleted = false,
  onConfettiComplete,
  onParkingEvaluated,
  graphicsQuality = 'HIGH',
  customizationVersion = 0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const onParkingEvaluatedRef = useRef(onParkingEvaluated);
  onParkingEvaluatedRef.current = onParkingEvaluated;

  const hintRef = useRef(activeHintId);
  hintRef.current = activeHintId;

  const isCompletedRef = useRef(isCompleted);
  isCompletedRef.current = isCompleted;

  const onConfettiCompleteRef = useRef(onConfettiComplete);
  onConfettiCompleteRef.current = onConfettiComplete;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const vehicleMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const passengersGroupRef = useRef<THREE.Group | null>(null);
  const activeWalkersRef = useRef<ActiveWalker[]>([]);
  const prevWaitingIdsRef = useRef<string[]>([]);
  const hintBeaconRef = useRef<THREE.Group | null>(null);
  const blockerFlashRef = useRef<{ id: string; until: number } | null>(null);
  const blockerAlertRef = useRef<{ group: THREE.Group; until: number } | null>(null);
  const exhaustPuffsRef = useRef<Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }>>([]);
  const bgManagerRef = useRef<BackgroundEnvironmentManager | null>(null);
  const dynamicCameraRef = useRef<DynamicCameraController | null>(null);
  const roadMarkingsRef = useRef<WorldRoadMarkingsSystem | null>(null);
  const ambientTrafficRef = useRef<AmbientTrafficSystem | null>(null);
  const weatherSystemRef = useRef<WeatherTimeSystem | null>(null);
  const reactivePropsRef = useRef<ReactivePropsSystem | null>(null);
  const lightManagerRef = useRef<ArenaLightManager | null>(null);
  const pathFollowingGroundRef = useRef<PathFollowingGroundSystem | null>(null);
  const busStopSignCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const busStopSignTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const docksGroupRef = useRef<THREE.Group | null>(null);
  const bayTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [parkingToast, setParkingToast] = useState<{ grade: string; message: string } | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('EXPLORATION');
  const [isAutoDirector, setIsAutoDirector] = useState(false);
  const [showCamControls, setShowCamControls] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('SUNNY');
  const [showWeatherControls, setShowWeatherControls] = useState(false);
  const [showDevDock, setShowDevDock] = useState(false);

  // Live In-Cab Radio State
  const [radioStation, setRadioStation] = useState<RadioStation>(() => inCabRadio.getStation());
  const [showRadioControls, setShowRadioControls] = useState(false);
  const [radioVolume, setRadioVolume] = useState<number>(() => inCabRadio.getVolume());

  // Cinematic Photo Mode State
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [photoFilter, setPhotoFilter] = useState<'NORMAL' | 'CYBER' | 'GOLDEN' | 'NOIR' | 'VINTAGE'>('NORMAL');
  const [photoVignette, setPhotoVignette] = useState(true);
  const [photoWatermark, setPhotoWatermark] = useState(true);
  const [photoFlash, setPhotoFlash] = useState(false);

  // Confetti Particle System Reference
  const confettiSystemRef = useRef<{
    mesh: THREE.InstancedMesh;
    particles: Array<{
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      rot: THREE.Euler;
      rotVel: THREE.Vector3;
      scale: THREE.Vector3;
    }>;
    active: boolean;
    duration: number;
    elapsed: number;
  } | null>(null);

  const activeAnimRef = useRef<{
    [id: string]: {
      type: 'drive_to_dock' | 'bump' | 'depart';
      progress: number;
      duration: number;
      startPos: THREE.Vector3;
      waypoints?: THREE.Vector3[];
      curve?: THREE.CatmullRomCurve3;
      physics?: NaturalPhysicsState;
      forwardDir: THREE.Vector3;
      dockIdx?: number;
      initialHeading?: number;
      exitProgress?: number;
    };
  }>({});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth || 360;
    let height = container.clientHeight || window.innerHeight || 640;
    if (width <= 0) width = 360;
    if (height <= 0) height = 640;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xc5cedf);
    // Linear fog: matches play surface color #C5CEDF seamlessly
    scene.fog = new THREE.Fog(0xc5cedf, 85, 200);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 180);
    camera.position.set(0, 34, 30);
    camera.lookAt(0, 0, 1.2);
    cameraRef.current = camera;

    // Instantiate Dynamic Camera Controller
    const dynamicCamera = new DynamicCameraController(camera);
    dynamicCameraRef.current = dynamicCamera;
    dynamicCamera.setOnModeChange((newMode) => {
      setCameraMode(newMode);
    });
    dynamicCamera.triggerLevelEntrance();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // required for Photo Mode 4K snapshot export
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height, true);
    const isHighQuality = graphicsQuality === 'HIGH';
    renderer.setPixelRatio(isHighQuality ? Math.min(window.devicePixelRatio, 2.0) : Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = isHighQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.imageRendering = '-webkit-optimize-contrast';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // 1. Controlled Ambient Light (sculpted shadows, no flat wash-out)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambientLight);

    // 2. Hemisphere Light: Sky Blue above, dark asphalt bounce below (creates natural PBR diorama depth)
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.65);
    scene.add(hemiLight);

    // 3. Crisp Sun Key Light (casts sharp contact shadows with PCFSoft penumbra)
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    sunLight.position.set(18, 38, 18);
    sunLight.castShadow = isHighQuality;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 75;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 24;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.025;
    sunLight.shadow.radius = 1.5;
    sunLightRef.current = sunLight;
    scene.add(sunLight);

    // 4. Cool Rim / Silhouette Light from behind to sculpt and define vehicle edges
    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.75);
    rimLight.position.set(-18, 22, -18);
    scene.add(rimLight);
    const skyFill = rimLight;

    // Ground: Path-Following Geometry System (distinct curved road segments per world theme)
    const initialWorldId = gameStateRef.current.worldId || getWorldIdForLevel(gameStateRef.current.levelId);
    const pathFollowingGround = new PathFollowingGroundSystem(initialWorldId);
    pathFollowingGroundRef.current = pathFollowingGround;
    scene.add(pathFollowingGround.group);
    const ground = pathFollowingGround.terrainMesh!;

    // Arena Light Manager (manages ambient & point lights dynamically across themes: warm sunset -> cool neon cyber)
    const lampPositions: [number, number, number][] = [
      [-12, 5.1, -4],
      [12, 5.1, -4],
      [-12, 5.1, 14],
      [12, 5.1, 14],
      [-6, 4.8, -8.5],
      [6, 4.8, -8.5],
    ];
    const lightManager = new ArenaLightManager(scene, ambientLight, hemiLight, sunLight, lampPositions);
    lightManagerRef.current = lightManager;

    // Decorative Street Lamps with soft glow & bulb synchronization
    const lampPoles = [
      [-12, 0, -4],
      [12, 0, -4],
      [-12, 0, 14],
      [12, 0, 14],
    ];
    lampPoles.forEach(([lx, ly, lz]) => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(lx, ly, lz);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
      );
      pole.position.y = 2.5;
      pole.castShadow = true;

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xfef08a, emissiveIntensity: 2.2 })
      );
      bulb.position.y = 5.1;
      lightManager.registerBulbMesh(bulb);

      lampGroup.add(pole, bulb);
      scene.add(lampGroup);
    });

    // Apply active theme lights
    lightManager.updateTheme(initialWorldId);

    // Destructible & Reactive Props (Tumbling cones, auto-lifting barrier gates, spring bollards)
    const reactiveProps = new ReactivePropsSystem(scene);
    reactivePropsRef.current = reactiveProps;

    // Cheerful Sunny Airport Terminal Concourse Hub Facade (Matching Reference Screenshots 1, 2, 3)
    const stationGroup = new THREE.Group();
    stationGroup.position.set(0, 0, -11.5);

    // Main Concourse Building with Warm Sunny Walls
    const buildingGeo = new THREE.BoxGeometry(26, 5.2, 4.4);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5, // Warm sunny pastel peach/cream
      roughness: 0.35,
      metalness: 0.05,
    });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.set(0, 2.6, -2.2);
    building.castShadow = true;
    stationGroup.add(building);

    // Warm Yellow & Orange Upper Facade Border Trim
    const upperTrim = new THREE.Mesh(
      new THREE.BoxGeometry(26.2, 0.6, 4.5),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3 })
    );
    upperTrim.position.set(0, 4.9, -2.2);
    stationGroup.add(upperTrim);

    // Automatic Tinted Glass Sliding Doors & Windows
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.85,
    });
    // Center entrance doors
    const centerDoor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, 0.1), glassMat);
    centerDoor.position.set(0, 1.8, -0.02);
    const doorArch = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 0.15), doorFrameMat);
    doorArch.position.set(0, 3.6, -0.01);
    stationGroup.add(centerDoor, doorArch);

    // Tinted side windows
    [-8, 8].forEach((gx) => {
      const glassPane = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 0.1), glassMat);
      glassPane.position.set(gx, 2.0, -0.02);
      stationGroup.add(glassPane);
    });

    // Rainbow-Striped Storefront Canopy Awning (Yellow, Orange, Pink, Cyan, Lime)
    const awningStripeColors = [0xfacc15, 0xf97316, 0xf43f5e, 0x06b6d4, 0x22c55e, 0xfacc15, 0xf97316, 0xf43f5e];
    const awningGroup = new THREE.Group();
    awningGroup.position.set(0, 4.4, 0.6);
    awningGroup.rotation.x = 0.12; // Slanted forward like an arcade storefront awning!
    const stripeWidth = 26.4 / awningStripeColors.length;
    awningStripeColors.forEach((sColor, sIdx) => {
      const stripeGeo = new THREE.BoxGeometry(stripeWidth, 0.18, 3.8);
      const stripeMat = new THREE.MeshStandardMaterial({ color: sColor, roughness: 0.25 });
      const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
      stripeMesh.position.set(-13.2 + sIdx * stripeWidth + stripeWidth / 2, 0, 1.9);
      stripeMesh.castShadow = true;
      awningGroup.add(stripeMesh);
    });
    stationGroup.add(awningGroup);

    // Glowing LED Destination Marquee Banner
    const marqueeSignBg = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.9, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    marqueeSignBg.position.set(0, 4.4, 0.1);
    const marqueeLed = new THREE.Mesh(
      new THREE.BoxGeometry(17.6, 0.7, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.8,
      })
    );
    marqueeLed.position.set(0, 4.4, 0.12);
    stationGroup.add(marqueeSignBg, marqueeLed);

    // 3D Cartoon "Airport" Roof Sign with Airplane & Stars (Matching Reference Screenshots 1, 2, 3)
    const airportSignGeo = new THREE.PlaneGeometry(9.5, 2.4);
    const airportSignMat = new THREE.MeshBasicMaterial({
      map: createAirportSignTexture(),
      transparent: true,
      depthWrite: false,
    });
    const airportSignMesh = new THREE.Mesh(airportSignGeo, airportSignMat);
    airportSignMesh.position.set(0, 6.4, 0.5);
    stationGroup.add(airportSignMesh);

    // Polished Passenger Platform Sidewalk with Light Off-White Paving (Matching frame_05.jpg & frame_06.jpg)
    const sidewalkGeo = new THREE.BoxGeometry(26, 0.32, 4.2);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.45, metalness: 0.05 });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(0, 0.16, 2.1);
    sidewalk.receiveShadow = true;
    stationGroup.add(sidewalk);

    // Beveled curb edge along platform
    const platformCurb = new THREE.Mesh(
      new THREE.BoxGeometry(26.2, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.4 })
    );
    platformCurb.position.set(0, 0.1, 4.25);
    stationGroup.add(platformCurb);

    // 3D Vending Machine on sidewalk (Matching frame_05.jpg)
    const vendingGroup = new THREE.Group();
    vendingGroup.position.set(-0.6, 0.32, 1.8);
    const vmBodyMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.25 });
    const vmBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.9), vmBodyMat);
    vmBody.position.y = 1.25;
    vmBody.castShadow = true;
    const vmGlassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.1,
    });
    const vmGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.1), vmGlassMat);
    vmGlass.position.set(0, 1.55, 0.46);
    const vmTrayMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const vmTray = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.12), vmTrayMat);
    vmTray.position.set(0, 0.42, 0.46);
    vendingGroup.add(vmBody, vmGlass, vmTray);
    stationGroup.add(vendingGroup);

    // Orange vertical "P BUS" sign and green hedge on far left (Matching frame_05.jpg)
    const pBusSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.8, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 })
    );
    pBusSign.position.set(-8.8, 1.2, 1.8);
    pBusSign.castShadow = true;
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 })
    );
    shrub.position.set(-10.2, 0.85, 1.6);
    stationGroup.add(pBusSign, shrub);

    // Luggage suitcases on far right sidewalk (Matching frame_05.jpg & frame_06.jpg)
    const pinkSuitcase = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.8, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 })
    );
    pinkSuitcase.position.set(8.4, 0.72, 1.8);
    pinkSuitcase.castShadow = true;
    const orangeSuitcase = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
    );
    orangeSuitcase.position.set(9.3, 0.77, 1.9);
    orangeSuitcase.castShadow = true;
    stationGroup.add(pinkSuitcase, orangeSuitcase);

    scene.add(stationGroup);

    // Organic Curved Road System (Spline curves, smooth intersections, curbs, drainage)
    const naturalRoadGroup = new THREE.Group();
    naturalRoadGroup.name = 'NaturalRoadSystem';

    // Main East-West curved arterial boulevard connecting docks to escape route
    const mainArterialCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15, 0.08, DOCK_Z),
      new THREE.Vector3(-6, 0.08, DOCK_Z - 0.2),
      new THREE.Vector3(0, 0.08, DOCK_Z),
      new THREE.Vector3(6, 0.08, DOCK_Z + 0.1),
      new THREE.Vector3(15, 0.08, DOCK_Z),
    ]);
    const mainArterialRoad = OrganicRoadSystem.createCurvedRoadMesh(mainArterialCurve, 6.2, 32, 0x1e293b);
    const mainStripes = OrganicRoadSystem.createCurvedStripes(mainArterialCurve, 0.22, 32, 0xfacc15);
    const mainCurbNorth = OrganicRoadSystem.createRaisedCurbMesh(mainArterialCurve, -3.1, 0.4, 0.2, 32, 0x64748b);
    naturalRoadGroup.add(mainArterialRoad, mainStripes, mainCurbNorth);

    // Curved sweeping feeder road connecting south lot into the main arterial
    const feederCurveLeft = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-11, 0.08, 14.5),
      new THREE.Vector3(-12.8, 0.08, 6.0),
      new THREE.Vector3(-12.0, 0.08, -1.0),
      new THREE.Vector3(-8.5, 0.08, DOCK_Z + 1.2),
    ]);
    const feederRoadLeft = OrganicRoadSystem.createCurvedRoadMesh(feederCurveLeft, 4.4, 32, 0x1e293b);
    const feederCurbLeft = OrganicRoadSystem.createRaisedCurbMesh(feederCurveLeft, -2.2, 0.35, 0.18, 32, 0x64748b);
    naturalRoadGroup.add(feederRoadLeft, feederCurbLeft);

    const feederCurveRight = new THREE.CatmullRomCurve3([
      new THREE.Vector3(11, 0.08, 14.5),
      new THREE.Vector3(12.8, 0.08, 6.0),
      new THREE.Vector3(12.0, 0.08, -1.0),
      new THREE.Vector3(8.5, 0.08, DOCK_Z + 1.2),
    ]);
    const feederRoadRight = OrganicRoadSystem.createCurvedRoadMesh(feederCurveRight, 4.4, 32, 0x1e293b);
    const feederCurbRight = OrganicRoadSystem.createRaisedCurbMesh(feederCurveRight, 2.2, 0.35, 0.18, 32, 0x64748b);
    naturalRoadGroup.add(feederRoadRight, feederCurbRight);

    // Dynamic asphalt parking pad sized to match level board dimensions
    const initialRows = gameStateRef.current.gridRows || 7;
    const initialCols = gameStateRef.current.gridCols || 7;
    const padWidth = Math.max(initialCols, 7) * CELL_SIZE + 5.0;
    const padDepth = Math.max(initialRows, 7) * CELL_SIZE + 2.2;
    const halfPadW = padWidth / 2;
    const minPadZ = GRID_OFFSET_Z - padDepth / 2;
    const maxPadZ = GRID_OFFSET_Z + padDepth / 2;

    const parkingLotCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-halfPadW, 0.08, maxPadZ),
      new THREE.Vector3(-halfPadW, 0.08, minPadZ),
      new THREE.Vector3(0, 0.08, minPadZ - 0.6),
      new THREE.Vector3(halfPadW, 0.08, minPadZ),
      new THREE.Vector3(halfPadW, 0.08, maxPadZ),
    ]);
    const perimeterCurb = OrganicRoadSystem.createRaisedCurbMesh(parkingLotCurve, 0.2, 0.45, 0.22, 48, 0x475569);
    naturalRoadGroup.add(perimeterCurb);

    // 1. Organic light diorama puzzle ground matching frame_01.jpg & frame_05.jpg
    const asphaltPadGeo = new THREE.BoxGeometry(padWidth, 0.18, padDepth);
    const asphaltPadMat = new THREE.MeshStandardMaterial({
      color: 0xc5cedf, // smooth light slate grey diorama floor matching frame_01.jpg
      roughness: 0.65,
      metalness: 0.04,
    });
    const puzzlePad = new THREE.Mesh(asphaltPadGeo, asphaltPadMat);
    puzzlePad.position.set(0, 0.08, GRID_OFFSET_Z);
    puzzlePad.receiveShadow = true;
    naturalRoadGroup.add(puzzlePad);

    // Beveled Concrete Outer Curb Perimeter framing the game board seamlessly
    const curbBorderGeo = new THREE.BoxGeometry(padWidth + 0.5, 0.22, padDepth + 0.5);
    const curbBorderMat = new THREE.MeshStandardMaterial({
      color: 0xc5cedf, // seamless play floor matching frame_01.jpg
      roughness: 0.5,
      metalness: 0.05,
    });
    const curbBorder = new THREE.Mesh(curbBorderGeo, curbBorderMat);
    curbBorder.position.set(0, 0.04, GRID_OFFSET_Z);
    curbBorder.receiveShadow = true;
    naturalRoadGroup.add(curbBorder);

    // Dark asphalt roadway apron under the parking bays and horizontal travel lane (Matching frame_05.jpg)
    const roadApronGeo = new THREE.BoxGeometry(padWidth + 8, 0.16, 9.2);
    const roadApronMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate asphalt road
      roughness: 0.75,
      metalness: 0.1,
    });
    const roadApron = new THREE.Mesh(roadApronGeo, roadApronMat);
    roadApron.position.set(0, 0.08, -5.2);
    roadApron.receiveShadow = true;
    naturalRoadGroup.add(roadApron);

    // White horizontal dashed centerlines on the roadway (- - - - -) (Matching frame_05.jpg)
    const stripeGroup = new THREE.Group();
    stripeGroup.position.set(0, 0.17, -2.8);
    const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    for (let sx = -14; sx <= 14; sx += 1.8) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.015, 0.18), whiteStripeMat);
      dash.position.set(sx, 0, 0);
      stripeGroup.add(dash);
    }
    naturalRoadGroup.add(stripeGroup);

    // Zebra crosswalk road markings on left & right road edges (Matching frame_05.jpg)
    [-13.5, 13.5].forEach((zx) => {
      for (let i = 0; i < 4; i++) {
        const zStripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.015, 1.8), whiteStripeMat);
        zStripe.position.set(zx + (i - 1.5) * 0.7, 0.17, -2.8);
        naturalRoadGroup.add(zStripe);
      }
    });

    scene.add(naturalRoadGroup);

    // Dynamic Docks Bay Group (Matching Reference Screenshots 1 & 3: 1 bay in Level 1, 2 bays in Level 2)
    const docksGroup = new THREE.Group();
    docksGroup.name = 'docksGroup';
    docksGroupRef.current = docksGroup;
    scene.add(docksGroup);

    const bayTexture = createParkingBayTexture();
    bayTextureRef.current = bayTexture;

    // Helper to populate active bays dynamically
    const buildActiveBays = (count: number) => {
      while (docksGroup.children.length > 0) {
        const child = docksGroup.children[0];
        docksGroup.remove(child);
        disposeHierarchy(child);
      }

      const positions = getDockPositions(count);
      const bayPlaneGeo = new THREE.PlaneGeometry(2.1, 4.2);
      const bayPlaneMat = new THREE.MeshStandardMaterial({
        map: bayTexture,
        transparent: true,
        opacity: 0.95,
        roughness: 0.35,
        metalness: 0.05,
        depthWrite: false,
      });

      positions.forEach((dx) => {
        const bayGroup = new THREE.Group();
        bayGroup.position.set(dx, 0.19, DOCK_Z);
        bayGroup.rotation.y = DOCK_SLANT_ANGLE; // Rotated at ~24 deg slant!

        // Slanted bay ground marking plane (dashed lines + bold white 'P')
        const bayPlane = new THREE.Mesh(bayPlaneGeo, bayPlaneMat);
        bayPlane.rotation.x = -Math.PI / 2;
        bayPlane.position.y = 0.01;
        bayPlane.receiveShadow = true;
        bayGroup.add(bayPlane);

        // Tactile yellow front stop line
        const stopLine = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.015, 0.16),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
        );
        stopLine.position.set(0, 0.02, -1.9);
        bayGroup.add(stopLine);

        docksGroup.add(bayGroup);
      });
    };

    buildActiveBays(gameStateRef.current.unlockedDocksCount || 1);

    // 3D Blue Bus Stop Signboard on Left Sidewalk (Matching Reference Screenshots)
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 320;
    signCanvas.height = 180;
    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.colorSpace = THREE.SRGBColorSpace;
    busStopSignCanvasRef.current = signCanvas;
    busStopSignTextureRef.current = signTexture;
    const initialWaitingCount = gameStateRef.current.passengers.filter((p) => p.state === 'WAITING').length;
    updateBusStopSignTexture(initialWaitingCount, signCanvas, signTexture);

    const busStopSignGroup = new THREE.Group();
    busStopSignGroup.position.set(-10.5, 0, -9.8);

    // Two Blue Signpost Legs
    const signPostMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.5 });
    [-1.25, 1.25].forEach((px) => {
      const postMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 12), signPostMat);
      postMesh.position.set(px, 1.25, 0);
      postMesh.castShadow = true;
      busStopSignGroup.add(postMesh);
    });

    // Horizontal Signboard Box Frame
    const signBoxGeo = new THREE.BoxGeometry(2.7, 1.5, 0.16);
    const signFaceMat = new THREE.MeshStandardMaterial({
      map: signTexture,
      roughness: 0.25,
      metalness: 0.1,
    });
    const signBoxMat = [
      signPostMat, // right
      signPostMat, // left
      signPostMat, // top
      signPostMat, // bottom
      signFaceMat, // front (+Z)
      signPostMat, // back
    ];
    const signMesh = new THREE.Mesh(signBoxGeo, signBoxMat);
    signMesh.position.y = 2.05;
    signMesh.castShadow = true;
    busStopSignGroup.add(signMesh);
    scene.add(busStopSignGroup);

    // Zebra Crosswalk Road Markings on the left lane (Matching Reference Screenshots)
    const crosswalkGroup = new THREE.Group();
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    for (let i = 0; i < 6; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.015, 0.5), stripeMat);
      stripe.position.set(-13.2, 0.185, -8.6 + i * 0.72);
      stripe.receiveShadow = true;
      crosswalkGroup.add(stripe);
    }
    scene.add(crosswalkGroup);

    // Safety Railings / Stanchions along sidewalk behind parking bays
    const railingGroup = new THREE.Group();
    railingGroup.position.set(0, 0, -8.9);
    const railingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
    for (let rx = -7.5; rx <= 3.5; rx += 1.8) {
      const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), railingMat);
      rPost.position.set(rx, 0.55, 0);
      rPost.castShadow = true;
      railingGroup.add(rPost);
    }
    const rBar = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.05, 0.05), railingMat);
    rBar.position.set(-2.0, 0.85, 0);
    railingGroup.add(rBar);
    scene.add(railingGroup);

    // Initialize Dynamic Background Environment Manager
    const bgManager = new BackgroundEnvironmentManager(scene);
    bgManagerRef.current = bgManager;
    bgManager.registerArenaElements({
      ground,
      road: mainArterialRoad,
      puzzlePad,
      terminalBuilding: building,
      terminalRoof: awningGroup,
      sidewalk,
      sunLight,
      ambientLight,
      skyFill,
      cones: [],
    });

    // Apply active World theme dynamically
    bgManager.applyWorldTheme(initialWorldId);

    // Initialize 3D-Projected Themed Road Markings (Zebra crosswalks, Bus Stop bays, Chevrons)
    const roadMarkings = new WorldRoadMarkingsSystem();
    roadMarkingsRef.current = roadMarkings;
    roadMarkings.updateMarkings(initialWorldId);
    scene.add(roadMarkings.markingsGroup);

    // Initialize Advanced Ambient Traffic AI (Surrounding cars circulating perimeter bypass)
    const ambientTraffic = new AmbientTrafficSystem(scene);
    ambientTrafficRef.current = ambientTraffic;

    // Initialize Weather & Time System (Wet asphalt, rain/snow/fog particles, storm lightning, dynamic sun & ambient lighting)
    const weatherSystem = new WeatherTimeSystem(scene);
    weatherSystemRef.current = weatherSystem;
    weatherSystem.registerElements({
      roadMaterial: feederRoadRight.material as THREE.MeshStandardMaterial,
      asphaltMaterial: puzzlePad.material as THREE.MeshStandardMaterial,
      sunLight,
      ambientLight,
      skyFill,
    });
    const initialWeather = getDefaultWeatherForWorld(initialWorldId);
    weatherSystem.setWeather(initialWeather);
    setCurrentWeather(initialWeather);

    // Passengers Group
    const passengersGroup = new THREE.Group();
    passengersGroupRef.current = passengersGroup;
    scene.add(passengersGroup);

    // Hint Spotlight Beam & Holographic Arrow & Ring
    const hintGroup = new THREE.Group();
    hintGroup.visible = false;
    hintBeaconRef.current = hintGroup;

    // Glowing Holographic Beam
    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.8, 6.5, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
    );
    beaconBeam.position.y = 3.25;

    // Ground Pulsing Ring
    const hintRing = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    hintRing.rotation.x = -Math.PI / 2;
    hintRing.position.y = 0.08;
    hintRing.name = 'hint_ground_ring';

    // Floating 3D Bouncing Arrow pointing down at target
    const arrowGroup = new THREE.Group();
    arrowGroup.name = 'hint_floating_arrow';
    arrowGroup.position.y = 3.4;
    const arrowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.75, 4),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xfacc15, emissiveIntensity: 2.2 })
    );
    arrowCone.rotation.x = Math.PI; // Point down
    const arrowShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xfacc15, emissiveIntensity: 1.5 })
    );
    arrowShaft.position.y = 0.55;
    arrowGroup.add(arrowCone, arrowShaft);

    hintGroup.add(beaconBeam, hintRing, arrowGroup);
    hintGroup.visible = false;
    scene.add(hintGroup);

    // ==========================================
    // Celebratory Confetti Particle System
    // (InstancedMesh for maximum 60fps performance)
    // ==========================================
    const CONFETTI_COUNT = 180;
    const confettiGeo = new THREE.PlaneGeometry(0.35, 0.22);
    const confettiMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const confettiInstancedMesh = new THREE.InstancedMesh(confettiGeo, confettiMat, CONFETTI_COUNT);
    confettiInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Vibrant celebration palette (Gold, Emerald, Coral, Cyan, Magenta, Purple, Lime)
    const confettiColors = [
      0xfbbf24, 0xef4444, 0x3b82f6, 0x10b981, 0xa855f7, 0xf43f5e, 0x06b6d4, 0x84cc16, 0xffffff,
    ];
    const dummyColor = new THREE.Color();
    const particlesData: Array<{
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      rot: THREE.Euler;
      rotVel: THREE.Vector3;
      scale: THREE.Vector3;
    }> = [];

    const dummyMatrix = new THREE.Matrix4();
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      dummyColor.setHex(confettiColors[i % confettiColors.length]);
      confettiInstancedMesh.setColorAt(i, dummyColor);

      particlesData.push({
        pos: new THREE.Vector3(0, -50, 0),
        vel: new THREE.Vector3(0, 0, 0),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
        scale: new THREE.Vector3(0.7 + Math.random() * 0.7, 0.7 + Math.random() * 0.7, 1),
      });

      dummyMatrix.setPosition(0, -50, 0);
      confettiInstancedMesh.setMatrixAt(i, dummyMatrix);
    }
    if (confettiInstancedMesh.instanceColor) {
      confettiInstancedMesh.instanceColor.needsUpdate = true;
    }
    confettiInstancedMesh.instanceMatrix.needsUpdate = true;
    confettiInstancedMesh.visible = false;
    scene.add(confettiInstancedMesh);

    confettiSystemRef.current = {
      mesh: confettiInstancedMesh,
      particles: particlesData,
      active: false,
      duration: 3.5,
      elapsed: 0,
    };

    // Raycast handling
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Unified Smooth Pointer & Camera Orbit / Pan / Zoom Controller
    let isPointerDown = false;
    let isDraggingCamera = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerDownTime = 0;
    let isPanMode = false;

    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none';

    const onPointerDown = (event: PointerEvent) => {
      isPointerDown = true;
      isDraggingCamera = false;
      pointerDownTime = performance.now();

      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      isPanMode = event.button === 2 || event.shiftKey;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isPointerDown) return;

      const currentX = event.clientX;
      const currentY = event.clientY;

      const totalDist = Math.hypot(currentX - pointerStartX, currentY - pointerStartY);
      if (totalDist > 16) {
        isDraggingCamera = true;
      }

      if (isDraggingCamera) {
        const deltaX = currentX - lastPointerX;
        const deltaY = currentY - lastPointerY;

        if (isPanMode) {
          dynamicCamera.onPointerPan(deltaX, deltaY);
        } else {
          dynamicCamera.onPointerDrag(deltaX, deltaY);
        }
      }

      lastPointerX = currentX;
      lastPointerY = currentY;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isPointerDown) return;
      const elapsed = performance.now() - pointerDownTime;
      const wasDrag = isDraggingCamera;
      isPointerDown = false;
      isDraggingCamera = false;

      const totalDist = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
      const isQuickTap = (!wasDrag || totalDist < 20) && elapsed < 450;

      // If it was a quick tap/click (not a camera drag), handle raycast tap
      if (isQuickTap) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Check dock lock unlock tap
        let hitDockLock = false;
        DOCK_X_POSITIONS.forEach((dx, idx) => {
          if (idx >= gameStateRef.current.unlockedDocksCount) {
            const lockObj = scene.getObjectByName(`dock_lock_${idx}`);
            if (lockObj) {
              const hits = raycaster.intersectObjects(lockObj.children, true);
              if (hits.length > 0) {
                hitDockLock = true;
                onDockUnlockClicked();
              }
            }
          }
        });
        if (hitDockLock) return;

        // Check vehicle tap
        const clickable: THREE.Object3D[] = [];
        vehicleMeshesRef.current.forEach((g) => {
          clickable.push(...g.children);
        });

        const hits = raycaster.intersectObjects(clickable, true);
        if (hits.length > 0) {
          let vid: string | null = null;
          let curr: THREE.Object3D | null = hits[0].object;
          while (curr) {
            if (curr.userData?.vehicleId) {
              vid = curr.userData.vehicleId;
              break;
            }
            curr = curr.parent;
          }

          if (vid) {
            const res = onVehicleTapRequest(vid);
            if (res) {
              if (!res.success) {
                triggerBump(vid, res.blockerId);
              } else if (res.dockIndex !== undefined) {
                triggerDriveToDock(vid, res.dockIndex);
              }
            }
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dynamicCamera.onZoom(e.deltaY * 0.02);
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      const elapsed = (now - startTime) / 1000;
      lastTime = now;

      // Dynamic 3D environmental props animations (balloons, radar, windsocks, totems)
      if (bgManagerRef.current) {
        bgManagerRef.current.update(elapsed, delta);
      }

      // Advanced Ambient Traffic AI updates (Cars circulating perimeter)
      if (ambientTrafficRef.current) {
        ambientTrafficRef.current.update(delta, elapsed);
      }

      // Weather & Particle system updates (Rain, wind drift)
      if (weatherSystemRef.current) {
        weatherSystemRef.current.update(delta);
      }

      // 1. Active Walking Commuters boarding buses
      const walkers = activeWalkersRef.current;
      for (let wIdx = walkers.length - 1; wIdx >= 0; wIdx--) {
        const walker = walkers[wIdx];
        walker.progress += delta / walker.duration;
        const t = Math.min(1.0, walker.progress);

        // Interpolate along path with gentle hop curve
        const curX = THREE.MathUtils.lerp(walker.startPos.x, walker.targetPos.x, t);
        const curZ = THREE.MathUtils.lerp(walker.startPos.z, walker.targetPos.z, t);
        const walkCycle = t * walker.duration * 14;
        const hopY = Math.abs(Math.sin(walkCycle)) * 0.12;

        walker.rig.root.position.set(curX, walker.startPos.y + hopY, curZ);

        // Face travel direction
        const dx = walker.targetPos.x - walker.startPos.x;
        const dz = walker.targetPos.z - walker.startPos.z;
        walker.rig.root.rotation.y = Math.atan2(dx, dz) + Math.PI;

        // Swing arms & legs
        const armSwing = Math.sin(walkCycle) * 0.7;
        walker.rig.leftArm.rotation.x = armSwing;
        walker.rig.rightArm.rotation.x = -armSwing;
        walker.rig.leftLeg.rotation.x = -armSwing * 0.85;
        walker.rig.rightLeg.rotation.x = armSwing * 0.85;
        walker.rig.head.rotation.y = Math.sin(walkCycle * 0.5) * 0.15;

        if (walker.progress >= 1.0) {
          scene.remove(walker.rig.root);
          disposeHierarchy(walker.rig.root);
          walkers.splice(wIdx, 1);
        }
      }

      // 2. Idle breathing and cheering in passenger waiting line
      if (passengersGroupRef.current) {
        passengersGroupRef.current.children.forEach((child, idx) => {
          const bob = Math.sin(elapsed * 3.5 + idx * 0.8) * 0.04;
          child.position.y = 0.35 + bob;
          child.rotation.y = Math.PI / 2 + Math.sin(elapsed * 2 + idx) * 0.06;
        });
      }

      // 3. Hint beacon with floating 3D arrow & ground ring
      if (hintBeaconRef.current && hintRef.current) {
        const mesh = vehicleMeshesRef.current.get(hintRef.current);
        if (mesh && mesh.visible) {
          hintBeaconRef.current.visible = true;
          hintBeaconRef.current.position.set(mesh.position.x, 0.2, mesh.position.z);
          hintBeaconRef.current.rotation.y += delta * 2;

          const arrow = hintBeaconRef.current.getObjectByName('hint_floating_arrow');
          if (arrow) {
            arrow.position.y = 3.3 + Math.sin(elapsed * 6) * 0.35;
          }
          const ring = hintBeaconRef.current.getObjectByName('hint_ground_ring');
          if (ring) {
            const scale = 1.0 + Math.sin(elapsed * 5) * 0.15;
            ring.scale.set(scale, scale, scale);
          }
        } else {
          hintBeaconRef.current.visible = false;
        }
      } else if (hintBeaconRef.current) {
        hintBeaconRef.current.visible = false;
      }

      // 4. Blocker 3D Alert Sign animation & decay
      if (blockerAlertRef.current) {
        const remaining = blockerAlertRef.current.until - Date.now();
        if (remaining <= 0) {
          scene.remove(blockerAlertRef.current.group);
          disposeHierarchy(blockerAlertRef.current.group);
          blockerAlertRef.current = null;
        } else {
          const t = remaining / 850;
          blockerAlertRef.current.group.position.y = 3.2 + (1 - t) * 0.6;
          blockerAlertRef.current.group.rotation.y += delta * 4;
          const scale = Math.sin(t * Math.PI) * 1.2;
          blockerAlertRef.current.group.scale.set(scale, scale, scale);
        }
      }

      // 5. Update exhaust smoke puff particles
      const puffs = exhaustPuffsRef.current;
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life += delta;
        const progress = p.life / p.maxLife;
        if (progress >= 1.0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          puffs.splice(i, 1);
        } else {
          p.mesh.position.addScaledVector(p.vel, delta);
          p.mesh.scale.multiplyScalar(1 + delta * 2.8);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - progress);
        }
      }

      // Dock lock indicators
      DOCK_X_POSITIONS.forEach((_, idx) => {
        const lockObj = scene.getObjectByName(`dock_lock_${idx}`);
        if (lockObj) {
          lockObj.visible = idx >= gameStateRef.current.unlockedDocksCount;
        }
      });

      // Blocker flash decay
      if (blockerFlashRef.current) {
        if (Date.now() > blockerFlashRef.current.until) {
          const blkMesh = vehicleMeshesRef.current.get(blockerFlashRef.current.id);
          if (blkMesh) {
            blkMesh.traverse((child) => {
              if (child instanceof THREE.Mesh && child.userData?.originalColor) {
                child.material.color.set(child.userData.originalColor);
              }
            });
          }
          blockerFlashRef.current = null;
        }
      }

      // Active vehicle driving animations (Natural physics, spline trajectory, wheel spin, body roll, brake lights)
      let activeMovingVehicle: {
        pos: THREE.Vector3;
        speed: number;
        heading: number;
        steering: number;
        progress: number;
      } | null = null;

      Object.keys(activeAnimRef.current).forEach((vid) => {
        const anim = activeAnimRef.current[vid];
        const group = vehicleMeshesRef.current.get(vid);
        if (!group) {
          delete activeAnimRef.current[vid];
          return;
        }

        anim.progress += delta / anim.duration;

        if (anim.type === 'bump') {
          if (anim.progress < 0.35) {
            const t = anim.progress / 0.35;
            const easeT = Math.sin((t * Math.PI) / 2); // Ease out
            group.position.x = anim.startPos.x + anim.forwardDir.x * 0.45 * easeT;
            group.position.z = anim.startPos.z + anim.forwardDir.z * 0.45 * easeT;
            // Exaggerated chassis squat on bump
            group.rotation.x = 0.08 * Math.sin(t * Math.PI);
          } else if (anim.progress < 1.0) {
            const t = (anim.progress - 0.35) / 0.65;
            // Soft bounce back (jelly effect)
            const easeBack = Math.cos(t * Math.PI * 1.5) * (1 - t);
            group.position.x = anim.startPos.x + anim.forwardDir.x * 0.45 * easeBack;
            group.position.z = anim.startPos.z + anim.forwardDir.z * 0.45 * easeBack;
            group.rotation.x = -0.05 * Math.sin(t * Math.PI) * (1 - t);
          } else {
            group.position.copy(anim.startPos);
            group.rotation.x = 0;
            delete activeAnimRef.current[vid];
          }
        } else if (anim.type === 'drive_to_dock') {
          if (anim.physics && anim.curve) {
            // Update natural physics state with progressive launch acceleration and eased steering
            const reachedDestination = NaturalVehiclePhysics.update(anim.physics, delta, elapsed);

            // Track smooth launch progress during grid exit
            const exitT = Math.min(1.0, anim.physics.pathT / 0.18);
            anim.exitProgress = exitT * exitT * (3.0 - 2.0 * exitT);

            // Apply position with natural suspension bounce
            const baseY = group.userData?.baseY ?? 0.72;
            group.position.x = anim.physics.position.x;
            group.position.y = baseY + anim.physics.suspensionOffset;
            group.position.z = anim.physics.position.z;

            // Apply heading orientation, steering roll, and pitch with smooth easing
            group.rotation.y = anim.physics.headingAngle;
            group.rotation.z = anim.physics.bodyRollAngle;
            group.rotation.x = anim.physics.bodyPitchAngle;

            // Animate front wheel steering rotation
            if (group.userData?.frontWheels) {
              group.userData.frontWheels.forEach((w: THREE.Group) => {
                w.rotation.y = anim.physics!.steeringAngle;
              });
            }

            // Animate rolling tires spinning
            if (group.userData?.wheelTires) {
              group.userData.wheelTires.forEach((tire: THREE.Mesh) => {
                tire.rotation.x = anim.physics!.wheelRotation;
              });
            }

            // Dynamic brake lights illumination
            if (group.userData?.brakeLightMat) {
              const isBraking = anim.physics.motionState === 'BRAKING' || anim.physics.motionState === 'PARKING';
              group.userData.brakeLightMat.emissiveIntensity = isBraking ? 3.0 : 1.0;
            }

            // Dynamic turn indicators blinking during steering
            if (group.userData?.indicatorMat) {
              const isTurning = Math.abs(anim.physics.steeringAngle) > 0.12;
              const blink = isTurning ? (Math.sin(elapsed * 12) > 0 ? 2.5 : 0.2) : 0.2;
              group.userData.indicatorMat.emissiveIntensity = blink;
            }

            // Record active vehicle for dynamic cinematic camera tracking
            activeMovingVehicle = {
              pos: anim.physics.position,
              speed: anim.physics.velocity,
              heading: anim.physics.headingAngle,
              steering: anim.physics.steeringAngle,
              progress: anim.progress,
            };

            if (reachedDestination) {
              const finalPos = anim.curve.getPointAt(1.0);
              group.position.set(finalPos.x, baseY, finalPos.z);
              group.rotation.set(0, DOCK_SLANT_ANGLE, 0); // Parked vehicle slants into bay

              // Advanced Parking Evaluator: calculate alignment, clearance & orientation
              if (anim.dockIdx !== undefined) {
                const currentDocksCount = gameStateRef.current.unlockedDocksCount || 1;
                const targetDockX = getDockX(anim.dockIdx, currentDocksCount);
                const grade = AdvancedParkingEvaluator.evaluateDocking(
                  finalPos,
                  targetDockX,
                  DOCK_Z,
                  anim.physics.headingAngle,
                  anim.physics.steeringAngle,
                  DOCK_SLANT_ANGLE
                );

                setParkingToast({
                  grade: grade.grade,
                  message: grade.message,
                });
                setTimeout(() => setParkingToast(null), 1800);

                if (onParkingEvaluatedRef.current) {
                  onParkingEvaluatedRef.current(grade);
                }
              }

              // Reset steering, lights and suspension
              if (group.userData?.frontWheels) {
                group.userData.frontWheels.forEach((w: THREE.Group) => {
                  w.rotation.y = 0;
                });
              }
              if (group.userData?.brakeLightMat) {
                group.userData.brakeLightMat.emissiveIntensity = 1.0;
              }
              if (group.userData?.indicatorMat) {
                group.userData.indicatorMat.emissiveIntensity = 0.2;
              }

              delete activeAnimRef.current[vid];
              if (anim.dockIdx !== undefined) {
                onVehicleArrivedAtDock(vid, anim.dockIdx);
              }
            }
          } else {
            // Fallback for simple interpolation
            const t = Math.min(anim.progress, 1);
            if (anim.progress >= 1.0) {
              delete activeAnimRef.current[vid];
              if (anim.dockIdx !== undefined) {
                onVehicleArrivedAtDock(vid, anim.dockIdx);
              }
            }
          }
        } else if (anim.type === 'depart') {
          const t = Math.min(anim.progress, 1);
          // Soft ease-in cubic for departure
          const easeT = t * t * (3.0 - 2.0 * t) * 1.5; 
          group.position.x = anim.startPos.x + anim.forwardDir.x * 26 * easeT;
          group.position.z = anim.startPos.z + anim.forwardDir.z * 26 * easeT;

          if (group.userData?.wheelTires) {
            group.userData.wheelTires.forEach((tire: THREE.Mesh) => {
              tire.rotation.x += delta * 26;
            });
          }
          // Soft nose lift during rapid departure
          group.rotation.x = -0.09 * Math.sin(t * Math.PI);

          // Headlights and turn signals illumination during departure
          if (group.userData?.brakeLightMat) {
            group.userData.brakeLightMat.emissiveIntensity = 0.4;
          }
          if (group.userData?.indicatorMat) {
            group.userData.indicatorMat.emissiveIntensity = Math.sin(elapsed * 16) > 0 ? 3.0 : 0.2;
          }

          // Emit soft exhaust smoke puff particles
          if (Math.random() < 0.45 && anim.progress < 0.85) {
            const puffGeo = new THREE.SphereGeometry(0.16 + Math.random() * 0.12, 6, 6);
            const puffMat = new THREE.MeshBasicMaterial({
              color: 0x94a3b8,
              transparent: true,
              opacity: 0.55,
              depthWrite: false,
            });
            const puff = new THREE.Mesh(puffGeo, puffMat);
            puff.position.set(
              group.position.x + (Math.random() - 0.5) * 0.3,
              0.42,
              group.position.z + 1.4
            );
            scene.add(puff);
            exhaustPuffsRef.current.push({
              mesh: puff,
              vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 0.6, -1.2),
              life: 0,
              maxLife: 0.55,
            });
          }

          if (anim.progress >= 1.0) {
            scene.remove(group);
            disposeHierarchy(group);
            vehicleMeshesRef.current.delete(vid);
            delete activeAnimRef.current[vid];
          }
        }
      });

      // Update Dynamic Cinematic Camera
      if (dynamicCameraRef.current) {
        const targetVehicle = activeMovingVehicle as {
          pos: THREE.Vector3;
          speed: number;
          heading: number;
          steering: number;
          progress: number;
        } | null;
        if (targetVehicle) {
          dynamicCameraRef.current.followMovingVehicle(
            targetVehicle.pos,
            targetVehicle.speed,
            targetVehicle.heading,
            targetVehicle.steering,
            targetVehicle.progress
          );
        } else if (gameStateRef.current.status === GameStatus.COMPLETED) {
          dynamicCameraRef.current.focusCelebrationView();
        } else {
          dynamicCameraRef.current.returnToNeutralView();
        }
        dynamicCameraRef.current.update(delta, isDraggingCamera);
      }

      // Destructible & Reactive Props System (Tumbling cones, auto-lifting barrier gates, spring bollards)
      if (reactivePropsRef.current) {
        const collisionVehicles: Array<{ pos: THREE.Vector3; speed: number; heading: number }> = [];
        if (activeMovingVehicle) {
          collisionVehicles.push(activeMovingVehicle);
        }
        if (ambientTrafficRef.current) {
          collisionVehicles.push(...ambientTrafficRef.current.getVehiclesForCollision());
        }
        reactivePropsRef.current.update(delta, elapsed, collisionVehicles);
      }

      // Confetti Physics & Instanced Matrix Updates
      const confetti = confettiSystemRef.current;
      if (confetti && confetti.active) {
        confetti.elapsed += delta;
        const remaining = Math.max(0, confetti.duration - confetti.elapsed);
        const fade = Math.min(1, remaining / 0.8);
        (confetti.mesh.material as THREE.MeshBasicMaterial).opacity = fade;

        if (confetti.elapsed >= confetti.duration) {
          // Animation finished: cleanly shut down, hide mesh, and reset instance transforms
          confetti.active = false;
          confetti.mesh.visible = false;
          (confetti.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
          const offMatrix = new THREE.Matrix4().setPosition(0, -999, 0);
          for (let i = 0; i < confetti.particles.length; i++) {
            confetti.mesh.setMatrixAt(i, offMatrix);
          }
          confetti.mesh.instanceMatrix.needsUpdate = true;
          if (onConfettiCompleteRef.current) {
            onConfettiCompleteRef.current();
          }
        } else {
          const matrix = new THREE.Matrix4();
          const q = new THREE.Quaternion();

          for (let i = 0; i < confetti.particles.length; i++) {
            const p = confetti.particles[i];

            // Gravity & air resistance
            p.vel.y -= 9.8 * delta * 0.9;
            p.vel.x *= 0.985;
            p.vel.z *= 0.985;

            // Flutter turbulence
            const flutterX = Math.sin(elapsed * 12 + i) * 0.8;
            const flutterZ = Math.cos(elapsed * 10 + i * 2) * 0.8;

            p.pos.x += (p.vel.x + flutterX) * delta;
            p.pos.y += p.vel.y * delta;
            p.pos.z += (p.vel.z + flutterZ) * delta;

            // Rotation spin
            p.rot.x += p.rotVel.x * delta;
            p.rot.y += p.rotVel.y * delta;
            p.rot.z += p.rotVel.z * delta;

            q.setFromEuler(p.rot);
            matrix.compose(p.pos, q, p.scale);
            confetti.mesh.setMatrixAt(i, matrix);
          }
          confetti.mesh.instanceMatrix.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, true);
      const isHQ = graphicsQuality === 'HIGH';
      renderer.setPixelRatio(isHQ ? Math.min(window.devicePixelRatio, 2.0) : Math.min(window.devicePixelRatio, 1.25));
      dynamicCamera.setBoardDimensions(
        gameStateRef.current.gridRows || 7,
        gameStateRef.current.gridCols || 7,
        camera.aspect
      );
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);

      // Clean up celebratory confetti particle system and dispose GPU resources
      if (confettiInstancedMesh) {
        scene.remove(confettiInstancedMesh);
        confettiGeo.dispose();
        confettiMat.dispose();
        if (typeof (confettiInstancedMesh as any).dispose === 'function') {
          (confettiInstancedMesh as any).dispose();
        }
      }
      confettiSystemRef.current = null;

      // Dispose all active vehicle meshes
      vehicleMeshesRef.current.forEach((g) => {
        scene.remove(g);
        disposeHierarchy(g);
      });
      vehicleMeshesRef.current.clear();

      // Dispose passenger waiting queue
      if (passengersGroupRef.current) {
        scene.remove(passengersGroupRef.current);
        disposeHierarchy(passengersGroupRef.current);
        passengersGroupRef.current = null;
      }

      // Dispose active walker humanoid rigs
      activeWalkersRef.current.forEach((w) => {
        scene.remove(w.rig.root);
        disposeHierarchy(w.rig.root);
      });
      activeWalkersRef.current = [];

      // Dispose hint beacon
      if (hintBeaconRef.current) {
        scene.remove(hintBeaconRef.current);
        disposeHierarchy(hintBeaconRef.current);
        hintBeaconRef.current = null;
      }

      // Dispose blocker alert
      if (blockerAlertRef.current) {
        scene.remove(blockerAlertRef.current.group);
        disposeHierarchy(blockerAlertRef.current.group);
        blockerAlertRef.current = null;
      }

      // Dispose remaining exhaust puffs
      exhaustPuffsRef.current.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
      });
      exhaustPuffsRef.current = [];

      // Dispose 3D Environmental Props, Road Markings, Traffic AI, and Weather
      if (bgManagerRef.current) {
        bgManagerRef.current.dispose();
        bgManagerRef.current = null;
      }
      if (roadMarkingsRef.current) {
        roadMarkingsRef.current.dispose();
        roadMarkingsRef.current = null;
      }
      if (ambientTrafficRef.current) {
        ambientTrafficRef.current.dispose();
        ambientTrafficRef.current = null;
      }
      if (weatherSystemRef.current) {
        weatherSystemRef.current.dispose();
        weatherSystemRef.current = null;
      }
      if (reactivePropsRef.current) {
        reactivePropsRef.current.dispose();
        reactivePropsRef.current = null;
      }
      if (lightManagerRef.current) {
        lightManagerRef.current.dispose();
        lightManagerRef.current = null;
      }
      if (pathFollowingGroundRef.current) {
        pathFollowingGroundRef.current.dispose();
        pathFollowingGroundRef.current = null;
      }

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Dynamically update World environmental props, 3D road markings, weather & camera when worldId, levelId or grid dimensions change
  useEffect(() => {
    const targetWorldId = gameState.worldId || getWorldIdForLevel(gameState.levelId);
    if (lightManagerRef.current) {
      lightManagerRef.current.updateTheme(targetWorldId);
    }
    if (pathFollowingGroundRef.current) {
      pathFollowingGroundRef.current.updateWorldGround(targetWorldId);
    }
    if (bgManagerRef.current) {
      bgManagerRef.current.applyWorldTheme(targetWorldId);
    }
    if (roadMarkingsRef.current) {
      roadMarkingsRef.current.updateMarkings(targetWorldId);
    }
    if (weatherSystemRef.current) {
      const targetWeather = getDefaultWeatherForWorld(targetWorldId);
      weatherSystemRef.current.setWeather(targetWeather);
      setCurrentWeather(targetWeather);
    }
    if (dynamicCameraRef.current && cameraRef.current) {
      dynamicCameraRef.current.setBoardDimensions(
        gameState.gridRows || 7,
        gameState.gridCols || 7,
        cameraRef.current.aspect
      );
      dynamicCameraRef.current.triggerLevelEntrance();
    }
  }, [gameState.worldId, gameState.levelId, gameState.gridRows, gameState.gridCols]);

  // Dynamically rebuild parking bays when unlockedDocksCount changes
  useEffect(() => {
    if (docksGroupRef.current && bayTextureRef.current) {
      const docksGroup = docksGroupRef.current;
      const bayTexture = bayTextureRef.current;
      while (docksGroup.children.length > 0) {
        const child = docksGroup.children[0];
        docksGroup.remove(child);
        disposeHierarchy(child);
      }

      const count = gameState.unlockedDocksCount || 1;
      const positions = getDockPositions(count);
      const bayPlaneGeo = new THREE.PlaneGeometry(2.1, 4.2);
      const bayPlaneMat = new THREE.MeshStandardMaterial({
        map: bayTexture,
        transparent: true,
        opacity: 0.95,
        roughness: 0.35,
        metalness: 0.05,
        depthWrite: false,
      });

      positions.forEach((dx) => {
        const bayGroup = new THREE.Group();
        bayGroup.position.set(dx, 0.19, DOCK_Z);
        bayGroup.rotation.y = DOCK_SLANT_ANGLE;

        const bayPlane = new THREE.Mesh(bayPlaneGeo, bayPlaneMat);
        bayPlane.rotation.x = -Math.PI / 2;
        bayPlane.position.y = 0.01;
        bayPlane.receiveShadow = true;
        bayGroup.add(bayPlane);

        const stopLine = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.015, 0.16),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
        );
        stopLine.position.set(0, 0.02, -1.9);
        bayGroup.add(stopLine);

        docksGroup.add(bayGroup);
      });
    }
  }, [gameState.unlockedDocksCount, gameState.levelId]);

  // Dynamically update graphics quality & shadows (High with shadows vs Performance no shadows)
  useEffect(() => {
    const isHigh = graphicsQuality === 'HIGH';
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = isHigh;
      rendererRef.current.setPixelRatio(isHigh ? Math.min(window.devicePixelRatio, 2) : 1);
      const container = mountRef.current;
      if (container) {
        rendererRef.current.setSize(container.clientWidth, container.clientHeight);
      }
    }
    if (sunLightRef.current) {
      sunLightRef.current.castShadow = isHigh;
    }
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = isHigh;
          child.receiveShadow = isHigh;
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => (m.needsUpdate = true));
            } else {
              child.material.needsUpdate = true;
            }
          }
        }
      });
    }
  }, [graphicsQuality]);

  // Update/rebuild vehicles when gameState.vehicles changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Prune removed vehicles
    const currentVehicleIds = new Set(gameState.vehicles.map((v) => v.id));
    vehicleMeshesRef.current.forEach((g, vid) => {
      if (!currentVehicleIds.has(vid)) {
        scene.remove(g);
        disposeHierarchy(g);
        vehicleMeshesRef.current.delete(vid);
      }
    });

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const prog = PlayerProgress.get();
    const activeLiveryCfg = LIVERIES.find((l) => l.id === prog.activeLivery) || LIVERIES[0];
    const activeUnderglowCfg = UNDERGLOWS.find((u) => u.id === prog.activeUnderglow) || UNDERGLOWS[0];
    const activeRimCfg = RIMS.find((r) => r.id === prog.activeRim) || RIMS[0];

    gameState.vehicles.forEach((v) => {
      if (v.state === VehicleStateType.EXITED) {
        if (vehicleMeshesRef.current.has(v.id) && !activeAnimRef.current[v.id]) {
          triggerVehicleDepart(v.id);
        }
        return;
      }

      // If already in motion, don't interrupt active physics animation
      if (activeAnimRef.current[v.id]) {
        return;
      }

      // Cleanly replace single vehicle mesh to refresh roof passenger indicators
      const existingMesh = vehicleMeshesRef.current.get(v.id);
      if (existingMesh) {
        scene.remove(existingMesh);
        disposeHierarchy(existingMesh);
        vehicleMeshesRef.current.delete(v.id);
      }

      // Build high-fidelity diorama vehicle mesh
      const hex = COLOR_MAP[v.color].hex;
      const rig = buildDioramaVehicleMesh({
        vehicleId: v.id,
        type: v.type,
        colorHex: hex,
        length: v.length,
        state: v.state,
        loadedPassengers: v.loadedPassengers,
        capacity: v.capacity,
        liveryConfig: (v.type === 'BUS' || v.type === 'VAN') ? activeLiveryCfg : undefined,
        underglowConfig: (v.type === 'BUS' || v.type === 'VAN') ? activeUnderglowCfg : undefined,
        rimConfig: activeRimCfg,
      });

      const vGroup = rig.group;

      // Position
      if (v.state === VehicleStateType.DOCKED && v.dockIndex !== undefined) {
        const currentDocksCount = gameState.unlockedDocksCount || 1;
        const dockX = getDockX(v.dockIndex, currentDocksCount);
        vGroup.position.set(dockX, rig.baseY, DOCK_Z);
        vGroup.rotation.y = DOCK_SLANT_ANGLE;
      } else {
        const worldPos = gridToWorld(
          v.gridPosition.row,
          v.gridPosition.col,
          v.length,
          v.direction,
          gameState.gridRows || 7,
          gameState.gridCols || 7
        );
        vGroup.position.set(worldPos.x, rig.baseY, worldPos.z);
        vGroup.rotation.y = directionToAngle(v.direction);
      }

      scene.add(vGroup);
      vehicleMeshesRef.current.set(v.id, vGroup);
    });
  }, [gameState.vehicles, customizationVersion]);

  // Update Stickmen queue
  useEffect(() => {
    const pGroup = passengersGroupRef.current;
    if (!pGroup) return;

    while (pGroup.children.length > 0) {
      const child = pGroup.children[0];
      pGroup.remove(child);
      disposeHierarchy(child);
    }

    const currentWaiting = gameState.passengers.filter((p) => p.state === 'WAITING');
    const currentWaitingIds = currentWaiting.map((p) => p.id);
    const prevWaiting = prevWaitingIdsRef.current;

    // Detect if a passenger just boarded and trigger 3D walking animation to bus door
    const justBoarded = prevWaiting.filter((id) => !currentWaitingIds.includes(id));
    if (justBoarded.length > 0 && sceneRef.current) {
      const boardedId = justBoarded[0];
      const pData = gameState.passengers.find((p) => p.id === boardedId);
      if (pData) {
        // Find matching docked bus
        const targetBus = gameState.vehicles.find(
          (v) =>
            v.state === VehicleStateType.DOCKED &&
            v.dockIndex !== undefined &&
            (v.color === pData.color || pData.isVip)
        );

        if (targetBus && targetBus.dockIndex !== undefined) {
          const currentDocksCount = gameState.unlockedDocksCount || 1;
          const dockX = getDockX(targetBus.dockIndex, currentDocksCount);
          const startX = -6.5;
          const startZ = -10.0;
          const targetPos = new THREE.Vector3(dockX, 0.35, DOCK_Z + 1.2);

          const rig = createArticulatedHumanoid(COLOR_MAP[pData.color].hex, 0.9, pData.isVip);
          rig.root.position.set(startX, 0.35, startZ);
          sceneRef.current.add(rig.root);

          activeWalkersRef.current.push({
            id: boardedId,
            rig,
            startPos: new THREE.Vector3(startX, 0.35, startZ),
            targetPos,
            progress: 0,
            duration: 0.75,
          });

          // Give docked bus a gentle suspension dip bounce on passenger boarding
          const busMesh = vehicleMeshesRef.current.get(targetBus.id);
          if (busMesh) {
            busMesh.position.y = 0.65;
            setTimeout(() => {
              if (busMesh) busMesh.position.y = 0.72;
            }, 180);
          }
        }
      }
    }
    prevWaitingIdsRef.current = currentWaitingIds;

    // Update live 3D Bus Stop Signboard count
    if (busStopSignCanvasRef.current && busStopSignTextureRef.current) {
      updateBusStopSignTexture(currentWaiting.length, busStopSignCanvasRef.current, busStopSignTextureRef.current);
    }

    // Render fully articulated 3D chibi commuters in the waiting line (L-shaped queue matching screenshots)
    currentWaiting.slice(0, 16).forEach((p, idx) => {
      const rig = createArticulatedHumanoid(COLOR_MAP[p.color].hex, 0.85, p.isVip);
      let px = -5.0 + idx * 1.05;
      let pz = -9.8;
      let rotY = Math.PI / 2; // Facing towards terminal bays
      if (idx >= 8) {
        px = 2.8;
        pz = -9.8 - (idx - 7) * 0.95;
        rotY = 0; // Turn and face along pathway
      }
      rig.root.position.set(px, 0.35, pz);
      rig.root.rotation.y = rotY;
      pGroup.add(rig.root);
    });
  }, [gameState.passengers, gameState.vehicles]);

  // Trigger Bump Animation externally
  const triggerBump = (vid: string, blockerId: string | null) => {
    const mesh = vehicleMeshesRef.current.get(vid);
    if (!mesh) return;

    sounds.playBlocked();
    dynamicCameraRef.current?.addShake(0.65);

    // Flash blocker vehicle in bright red and spawn 3D Floating Warning Alert
    if (blockerId) {
      const blkMesh = vehicleMeshesRef.current.get(blockerId);
      if (blkMesh) {
        blkMesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.color.set(0xff2222);
          }
        });
        blockerFlashRef.current = { id: blockerId, until: Date.now() + 600 };

        if (sceneRef.current) {
          if (blockerAlertRef.current) {
            sceneRef.current.remove(blockerAlertRef.current.group);
            blockerAlertRef.current = null;
          }

          const alertGroup = new THREE.Group();
          alertGroup.position.set(blkMesh.position.x, 3.2, blkMesh.position.z);

          // 3D Warning Red Diamond
          const signGeo = new THREE.BoxGeometry(0.85, 0.85, 0.08);
          const signMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xdc2626,
            emissiveIntensity: 2.2,
            roughness: 0.2,
          });
          const signMesh = new THREE.Mesh(signGeo, signMat);
          signMesh.rotation.z = Math.PI / 4;

          const exclBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.38, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          exclBar.position.y = 0.08;
          const exclDot = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.12, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          exclDot.position.y = -0.22;

          alertGroup.add(signMesh, exclBar, exclDot);
          sceneRef.current.add(alertGroup);
          blockerAlertRef.current = { group: alertGroup, until: Date.now() + 850 };
        }
      }
    }

    const v = gameStateRef.current.vehicles.find((item) => item.id === vid);
    if (!v) return;

    const angle = directionToAngle(v.direction);
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

    activeAnimRef.current[vid] = {
      type: 'bump',
      progress: 0,
      duration: 0.35,
      startPos: mesh.position.clone(),
      forwardDir: forward,
    };
  };

  // Trigger Driving to Dock Animation externally
  const triggerDriveToDock = (vid: string, dockIdx: number) => {
    const mesh = vehicleMeshesRef.current.get(vid);
    if (!mesh) return;

    sounds.playEscape();

    const v = gameStateRef.current.vehicles.find((item) => item.id === vid);
    if (!v) return;

    const currentDocksCount = gameStateRef.current.unlockedDocksCount || 1;
    const dockX = getDockX(dockIdx, currentDocksCount);

    // Generate smooth, continuous Catmull-Rom spline path connecting current location to dock
    const spline = SplinePathGenerator.generatePathToDock(
      mesh.position.clone(),
      v.direction,
      dockX,
      DOCK_Z
    );

    // Initial heading angle matching vehicle orientation
    const initHeading = directionToAngle(v.direction);

    // Initialize physical motion simulation state with vehicle type personality and launch easing
    const physics = NaturalVehiclePhysics.initMotion(
      mesh.position.clone(),
      spline,
      v.type,
      initHeading
    );

    activeAnimRef.current[vid] = {
      type: 'drive_to_dock',
      progress: 0,
      duration: 1.2,
      startPos: mesh.position.clone(),
      curve: spline,
      physics,
      forwardDir: new THREE.Vector3(0, 0, -1),
      dockIdx,
      initialHeading: initHeading,
      exitProgress: 0,
    };
  };

  // Trigger Driving Departure Animation externally
  const triggerVehicleDepart = (vid: string) => {
    const mesh = vehicleMeshesRef.current.get(vid);
    if (!mesh) return;

    sounds.playEscape();
    dynamicCameraRef.current?.addShake(0.3);

    activeAnimRef.current[vid] = {
      type: 'depart',
      progress: 0,
      duration: 0.85,
      startPos: mesh.position.clone(),
      forwardDir: new THREE.Vector3(0, 0, -1),
    };
  };

  // Clean up and reset confetti particle system
  const cleanUpConfettiParticles = () => {
    const confetti = confettiSystemRef.current;
    if (!confetti) return;
    confetti.active = false;
    confetti.elapsed = 0;
    confetti.mesh.visible = false;
    (confetti.mesh.material as THREE.MeshBasicMaterial).opacity = 0;

    const offMatrix = new THREE.Matrix4().setPosition(0, -999, 0);
    for (let i = 0; i < confetti.particles.length; i++) {
      confetti.mesh.setMatrixAt(i, offMatrix);
    }
    confetti.mesh.instanceMatrix.needsUpdate = true;
  };

  // Launch Celebratory Confetti Burst
  const triggerConfettiBurst = () => {
    const confetti = confettiSystemRef.current;
    if (!confetti) return;

    confetti.active = true;
    confetti.mesh.visible = true;
    confetti.elapsed = 0;
    (confetti.mesh.material as THREE.MeshBasicMaterial).opacity = 1;

    // Launch from both left and right sides of the terminal arena towards center
    for (let i = 0; i < confetti.particles.length; i++) {
      const p = confetti.particles[i];
      const isLeftSide = i % 2 === 0;

      // Spawn near bottom left / right of camera view
      p.pos.set(
        isLeftSide ? -9 + Math.random() * 2 : 9 - Math.random() * 2,
        2.0 + Math.random() * 3.5,
        (Math.random() - 0.5) * 8 + 2
      );

      // Explosive upward & inward velocity vector
      const speed = 12 + Math.random() * 10;
      const angle = (isLeftSide ? 1 : -1) * (0.35 + Math.random() * 0.45);
      p.vel.set(
        Math.sin(angle) * speed,
        14 + Math.random() * 9,
        (Math.random() - 0.5) * 8
      );

      p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      p.rotVel.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      );
    }
  };

  // Trigger celebratory confetti effect when game status switches to COMPLETED
  const prevStatusRef = useRef<GameStatus | null>(gameState.status);

  useEffect(() => {
    const isNowCompleted = gameState.status === GameStatus.COMPLETED || isCompleted;
    const wasCompleted = prevStatusRef.current === GameStatus.COMPLETED;

    if (isNowCompleted && !wasCompleted) {
      triggerConfettiBurst();
    } else if (!isNowCompleted && wasCompleted) {
      // Clean up confetti if restarting or switching level
      cleanUpConfettiParticles();
    }
    prevStatusRef.current = gameState.status;
  }, [gameState.status, isCompleted]);

  // Expose trigger and cleanup methods to DOM element via ref
  useEffect(() => {
    const el = mountRef.current;
    if (el) {
      (el as any).__triggerBump = triggerBump;
      (el as any).__triggerDriveToDock = triggerDriveToDock;
      (el as any).__triggerConfettiBurst = triggerConfettiBurst;
      (el as any).__cleanUpConfetti = cleanUpConfettiParticles;
    }
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#bfe0f7]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Dynamic 3D Parking Precision Feedback Badge (Safely below top HUD) */}
      {parkingToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in zoom-in-95 duration-200">
          <div
            className={`px-5 py-2.5 rounded-2xl shadow-2xl font-black text-xs sm:text-sm tracking-wide border-2 flex items-center gap-2 backdrop-blur-xl ${
              parkingToast.grade === 'PERFECT'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 border-white text-slate-950 ring-4 ring-amber-400/50 shadow-amber-500/40 animate-bounce'
                : parkingToast.grade === 'GOOD'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 border-white text-white ring-4 ring-emerald-500/40 shadow-emerald-500/30'
                : 'bg-slate-900/90 border-slate-600 text-slate-200 shadow-xl'
            }`}
          >
            <span className="text-base">{parkingToast.grade === 'PERFECT' ? 'ðŸŒŸ' : 'ðŸ‘'}</span>
            <span>{parkingToast.message}</span>
          </div>
        </div>
      )}

      {/* Floating In-Game Side Action Rail (Hidden by default matching frame_05.jpg & frame_06.jpg) */}
      {showDevDock && (
        <div className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-end pointer-events-auto select-none">
        {/* Flyout Weather Selector Menu (opens softly to the left of the dock) */}
        {showWeatherControls && (
          <div className="absolute right-[62px] sm:right-[72px] top-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-2xl border-2 border-white/25 rounded-3xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col gap-2 w-64 sm:w-72 animate-in fade-in slide-in-from-right-3 zoom-in-95 duration-200 z-40">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                  <CloudRain className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Sky Atmosphere</div>
                  <div className="text-[10px] text-amber-300/80 font-medium">Weather & Mood</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    sounds.playClick();
                    const targetWorldId = gameState.worldId || getWorldIdForLevel(gameState.levelId);
                    const def = getDefaultWeatherForWorld(targetWorldId);
                    weatherSystemRef.current?.setWeather(def);
                    setCurrentWeather(def);
                  }}
                  className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/40 transition-colors"
                  title="Reset to world theme default"
                >
                  SYNC
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowWeatherControls(false);
                  }}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
                  title="Close"
                >
                  âœ•
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {(Object.keys(WEATHER_CONDITIONS) as WeatherType[]).map((wKey) => {
                const cond = WEATHER_CONDITIONS[wKey];
                const isActive = currentWeather === wKey;
                return (
                  <button
                    key={wKey}
                    onClick={() => {
                      sounds.playClick();
                      weatherSystemRef.current?.setWeather(wKey);
                      setCurrentWeather(wKey);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border-2 border-amber-400/80 shadow-md ring-1 ring-amber-400/40 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    <span className="text-xl w-7 text-center">{cond.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{cond.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {cond.particleType !== 'none' ? `${cond.particleType.replace('_', ' ')}` : 'clear skies'}
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm">
                        âœ“
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Flyout Camera Angles Menu (opens softly to the left of the dock) */}
        {showCamControls && (
          <div className="absolute right-[62px] sm:right-[72px] top-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-2xl border-2 border-white/25 rounded-3xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col gap-2 w-64 sm:w-72 animate-in fade-in slide-in-from-right-3 zoom-in-95 duration-200 z-40">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Camera View</div>
                  <div className="text-[10px] text-sky-300/80 font-medium">Angles & Director</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    sounds.playClick();
                    const next = !isAutoDirector;
                    setIsAutoDirector(next);
                    dynamicCameraRef.current?.setAutoDirector(next);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black transition-all border ${
                    isAutoDirector
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                      : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                  }`}
                >
                  {isAutoDirector ? 'âš¡ AUTO' : 'ðŸŽ® MANUAL'}
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowCamControls(false);
                  }}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
                  title="Close"
                >
                  âœ•
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {(['EXPLORATION', 'VEHICLE_FOLLOW', 'TURN_CAM', 'PARKING_CAM', 'COMPLETION'] as CameraMode[]).map((m) => {
                const meta = CAMERA_MODE_METADATA[m];
                const isActive = cameraMode === m;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      sounds.playClick();
                      setIsAutoDirector(false);
                      dynamicCameraRef.current?.setAutoDirector(false);
                      dynamicCameraRef.current?.setMode(m);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-500/25 to-blue-500/15 border-2 border-sky-400/80 shadow-md ring-1 ring-sky-400/40 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    <span className="text-lg w-7 text-center">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{meta.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {m === 'EXPLORATION' && '360Â° Free orbit & inspect'}
                        {m === 'VEHICLE_FOLLOW' && 'Dynamic bus chase view'}
                        {m === 'TURN_CAM' && 'Cornering drift perspective'}
                        {m === 'PARKING_CAM' && 'Top dock alignment view'}
                        {m === 'COMPLETION' && 'Dramatic victory orbit'}
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm">
                        âœ“
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Flyout In-Cab Transit Radio Menu */}
        {showRadioControls && (
          <div className="absolute right-[62px] sm:right-[72px] top-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-2xl border-2 border-white/25 rounded-3xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col gap-2 w-64 sm:w-72 animate-in fade-in slide-in-from-right-3 zoom-in-95 duration-200 z-40">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-fuchsia-400" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Transit Radio</div>
                  <div className="text-[10px] text-fuchsia-300/80 font-medium">In-Cab Tunes</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded-full border border-white/10">
                  <Volume2 className="w-3 h-3 text-fuchsia-300" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={radioVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setRadioVolume(v);
                      inCabRadio.setVolume(v);
                    }}
                    className="w-14 h-1 accent-fuchsia-400 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowRadioControls(false);
                  }}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
                  title="Close"
                >
                  âœ•
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {RADIO_STATIONS.map((st) => {
                const isActive = radioStation === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      sounds.playClick();
                      inCabRadio.setStation(st.id);
                      setRadioStation(st.id);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-fuchsia-500/25 to-pink-500/15 border-2 border-fuchsia-400/80 shadow-md ring-1 ring-fuchsia-400/40 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    <span className="text-xl w-7 text-center">{st.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{st.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{st.tagline}</div>
                    </div>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-fuchsia-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm">
                        âœ“
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Deluxe 3D Arcade Floating Dock */}
        <div className="flex flex-col items-center gap-2 bg-slate-900/90 backdrop-blur-2xl border-2 border-white/20 rounded-3xl p-1.5 sm:p-2 shadow-[0_20px_45px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)]">
          {/* Camera Angles Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowCamControls(!showCamControls);
              setShowWeatherControls(false);
              setShowRadioControls(false);
            }}
            className={`group relative w-11 h-12 sm:w-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:translate-y-1 active:shadow-none ${
              showCamControls
                ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 border-t-2 border-white border-x border-sky-300/60 border-b-2 border-blue-900 shadow-[0_2px_0_#0284c7] ring-2 ring-white scale-105'
                : 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 border-t-2 border-white/60 border-x border-white/20 border-b-2 border-blue-950/60 shadow-[0_4px_0_#0284c7,0_8px_16px_rgba(2,132,199,0.35)] hover:brightness-110'
            }`}
            title="Camera Angles & Director"
          >
            <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white drop-shadow" />
            <span className="text-[8px] sm:text-[9px] font-black tracking-wider text-white uppercase leading-none mt-1 drop-shadow-sm">
              VIEW
            </span>
          </button>

          {/* Atmosphere & Weather Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowWeatherControls(!showWeatherControls);
              setShowCamControls(false);
              setShowRadioControls(false);
            }}
            className={`group relative w-11 h-12 sm:w-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:translate-y-1 active:shadow-none ${
              showWeatherControls
                ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 border-t-2 border-white border-x border-amber-300/60 border-b-2 border-amber-900 shadow-[0_2px_0_#b45309] ring-2 ring-white scale-105'
                : 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 border-t-2 border-white/60 border-x border-white/20 border-b-2 border-amber-950/60 shadow-[0_4px_0_#b45309,0_8px_16px_rgba(217,119,6,0.35)] hover:brightness-110'
            }`}
            title="Atmosphere & Weather"
          >
            <span className="text-base sm:text-lg leading-none drop-shadow">
              {WEATHER_CONDITIONS[currentWeather]?.icon || 'â›…'}
            </span>
            <span className="text-[8px] sm:text-[9px] font-black tracking-wider text-white uppercase leading-none mt-0.5 drop-shadow-sm">
              SKY
            </span>
          </button>

          {/* In-Cab Transit Radio Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowRadioControls(!showRadioControls);
              setShowCamControls(false);
              setShowWeatherControls(false);
            }}
            className={`group relative w-11 h-12 sm:w-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:translate-y-1 active:shadow-none ${
              showRadioControls
                ? 'bg-gradient-to-b from-fuchsia-500 via-pink-500 to-purple-600 border-t-2 border-white border-x border-pink-300/60 border-b-2 border-purple-950 shadow-[0_2px_0_#86198f] ring-2 ring-white scale-105'
                : 'bg-gradient-to-b from-fuchsia-500 via-pink-500 to-purple-600 border-t-2 border-white/60 border-x border-white/20 border-b-2 border-purple-950/60 shadow-[0_4px_0_#86198f,0_8px_16px_rgba(217,70,239,0.35)] hover:brightness-110'
            }`}
            title="In-Cab Transit Radio"
          >
            <Radio className={`w-4 h-4 sm:w-4.5 sm:h-4.5 text-white drop-shadow ${radioStation !== 'OFF' ? 'animate-pulse' : ''}`} />
            <span className="text-[8px] sm:text-[9px] font-black tracking-wider text-white uppercase leading-none mt-1 drop-shadow-sm">
              {radioStation === 'OFF' ? 'RADIO' : 'LIVE'}
            </span>
          </button>

          {/* Reset Isometric Angle Button */}
          <button
            onClick={() => {
              sounds.playClick();
              dynamicCameraRef.current?.resetView();
            }}
            className="group relative w-11 h-12 sm:w-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:translate-y-1 active:shadow-none bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600 border-t-2 border-white/60 border-x border-white/20 border-b-2 border-teal-950/60 shadow-[0_4px_0_#047857,0_8px_14px_rgba(5,150,105,0.35)] hover:brightness-110"
            title="Reset Camera Angle"
          >
            <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white drop-shadow group-hover:rotate-[-45deg] transition-transform duration-300" />
            <span className="text-[8px] sm:text-[9px] font-black tracking-wider text-white uppercase leading-none mt-1 drop-shadow-sm">
              RESET
            </span>
          </button>

          {/* Zoom Dual Stepper Pill */}
          <div className="flex flex-col items-center bg-slate-950/80 border-2 border-white/15 rounded-2xl p-1 shadow-inner gap-1">
            <button
              onClick={() => {
                sounds.playClick();
                dynamicCameraRef.current?.onZoom(-3.5);
              }}
              className="w-9 h-8 sm:w-10 sm:h-8.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-300 hover:text-white flex items-center justify-center active:scale-90 transition-all font-black shadow-sm"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <div className="w-4 h-[1px] bg-white/20" />
            <button
              onClick={() => {
                sounds.playClick();
                dynamicCameraRef.current?.onZoom(3.5);
              }}
              className="w-9 h-8 sm:w-10 sm:h-8.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center active:scale-90 transition-all font-black shadow-sm"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
