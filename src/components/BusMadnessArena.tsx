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
}

const DOCK_X_POSITIONS = [-7.5, -5.0, -2.5, 0, 2.5, 5.0, 7.5];
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

  // Soft Ground Contact Shadow
  const shadowGeo = new THREE.CircleGeometry(0.32, 12);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  // Hips Pivot
  const hips = new THREE.Group();
  hips.position.y = 0.42;
  root.add(hips);

  // Torso / Jacket in passenger team color (Golden shimmer for VIPs)
  const torsoColor = isVip ? 0xfacc15 : new THREE.Color(colorHex);
  const torsoMat = new THREE.MeshStandardMaterial({
    color: torsoColor,
    roughness: isVip ? 0.15 : 0.35,
    metalness: isVip ? 0.85 : 0.15,
    emissive: isVip ? 0xf59e0b : 0x000000,
    emissiveIntensity: isVip ? 0.4 : 0,
  });
  const torsoGeo = new THREE.BoxGeometry(0.38, 0.46, 0.28);
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.23;
  torso.castShadow = true;
  hips.add(torso);

  // Commuter Backpack on rear (+Z is back)
  const backpackMat = new THREE.MeshStandardMaterial({
    color: isVip ? 0xb45309 : 0x1e293b,
    roughness: 0.6,
  });
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.16), backpackMat);
  backpack.position.set(0, 0.22, 0.20);
  backpack.castShadow = true;
  hips.add(backpack);

  // Head Group (Neck / Head / Cap / Face)
  const head = new THREE.Group();
  head.position.set(0, 0.52, 0);

  // Stylized Face
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.4 });
  const headGeo = new THREE.SphereGeometry(0.22, 16, 14);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Sporty Baseball Cap / Crown for VIP
  const capMat = new THREE.MeshStandardMaterial({
    color: isVip ? 0xfef08a : 0x0f172a,
    metalness: isVip ? 0.9 : 0,
    roughness: isVip ? 0.1 : 0.5,
  });
  const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.1, 14), capMat);
  capCrown.position.y = 0.12;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.18), capMat);
  visor.position.set(0, 0.09, -0.22);
  head.add(capCrown, visor);

  // Floating Golden Crown for VIP Passengers
  if (isVip) {
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.8,
      metalness: 0.95,
      roughness: 0.08,
    });
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 5), crownMat);
    crown.position.set(0, 0.36, 0);
    crown.rotation.x = Math.PI;
    head.add(crown);
  }

  // Expressive Chibi Eyes with highlights
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-0.08, 0.08].forEach((xEye) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeWhiteMat);
    eyeWhite.position.set(xEye, 0.02, -0.20);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), pupilMat);
    pupil.position.set(xEye, 0.02, -0.23);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), shineMat);
    shine.position.set(xEye + 0.012, 0.032, -0.245);
    head.add(eyeWhite, pupil, shine);
  });

  // Cheerful Smile
  const smileGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 8, Math.PI);
  const smileMat = new THREE.MeshBasicMaterial({ color: 0xbe123c });
  const smile = new THREE.Mesh(smileGeo, smileMat);
  smile.rotation.x = Math.PI;
  smile.position.set(0, -0.08, -0.21);
  head.add(smile);

  hips.add(head);

  // Arms with Shoulders (pivot at x: ±0.24, y: 0.38)
  const armGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.34, 8);
  const handGeo = new THREE.SphereGeometry(0.06, 8, 8);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.24, 0.38, 0);
  const lArmMesh = new THREE.Mesh(armGeo, torsoMat);
  lArmMesh.position.y = -0.17;
  const lHand = new THREE.Mesh(handGeo, skinMat);
  lHand.position.y = -0.34;
  leftArm.add(lArmMesh, lHand);
  hips.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.24, 0.38, 0);
  const rArmMesh = new THREE.Mesh(armGeo, torsoMat);
  rArmMesh.position.y = -0.17;
  const rHand = new THREE.Mesh(handGeo, skinMat);
  rHand.position.y = -0.34;
  rightArm.add(rArmMesh, rHand);
  hips.add(rightArm);

  // Legs with Hips & Shoes
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const soleMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.3 });
  const legGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.36, 8);
  const shoeGeo = new THREE.BoxGeometry(0.14, 0.09, 0.22);
  const soleGeo = new THREE.BoxGeometry(0.15, 0.03, 0.23);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.11, 0, 0);
  const lLegMesh = new THREE.Mesh(legGeo, pantsMat);
  lLegMesh.position.y = -0.18;
  const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
  lShoe.position.set(0, -0.34, -0.04);
  const lSole = new THREE.Mesh(soleGeo, soleMat);
  lSole.position.set(0, -0.39, -0.04);
  leftLeg.add(lLegMesh, lShoe, lSole);
  hips.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.11, 0, 0);
  const rLegMesh = new THREE.Mesh(legGeo, pantsMat);
  rLegMesh.position.y = -0.18;
  const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rShoe.position.set(0, -0.34, -0.04);
  const rSole = new THREE.Mesh(soleGeo, soleMat);
  rSole.position.set(0, -0.39, -0.04);
  rightLeg.add(rLegMesh, rShoe, rSole);
  hips.add(rightLeg);

  return { root, hips, torso, head, leftArm, rightArm, leftLeg, rightLeg, shadow, colorHex };
}

function createParkingBayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 512);

  // Dashed white border lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.setLineDash([26, 18]);
  ctx.lineCap = 'round';
  ctx.strokeRect(16, 16, 224, 480);

  // Bold clean white 'P' in center
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 140px Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', 128, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function updateBusStopSignTexture(count: number, canvas: HTMLCanvasElement, texture: THREE.CanvasTexture) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Outer glossy blue frame
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 22);
  ctx.fill();

  // White inner display panel
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(18, 18, canvas.width - 36, canvas.height - 36, 14);
  ctx.fill();

  // Blue person icon on left
  ctx.fillStyle = '#0284c7';
  // Head
  ctx.beginPath();
  ctx.arc(75, 68, 24, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.beginPath();
  ctx.ellipse(75, 144, 38, 30, 0, Math.PI, 0, false);
  ctx.fill();

  // Bold black count text on right
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 96px Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${count}`, 215, 105);

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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [parkingToast, setParkingToast] = useState<{ grade: string; message: string } | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('EXPLORATION');
  const [isAutoDirector, setIsAutoDirector] = useState(false);
  const [showCamControls, setShowCamControls] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('SUNNY');
  const [showWeatherControls, setShowWeatherControls] = useState(false);

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

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a101d);
    // Linear fog: only softens distant background horizons (75 to 160 units),
    // keeping the entire puzzle arena, vehicles, and road 100% crystal-clear with zero fog washout
    scene.fog = new THREE.Fog(0x0a101d, 75, 160);

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
    renderer.setPixelRatio(isHighQuality ? Math.min(window.devicePixelRatio, 2.5) : Math.min(window.devicePixelRatio, 1.5));
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

    // High-End Modern Transit Terminal Hub Facade
    const stationGroup = new THREE.Group();
    stationGroup.position.set(0, 0, -11.5);

    // Main Architectural Concourse Building
    const buildingGeo = new THREE.BoxGeometry(26, 5.2, 4.4);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.28, metalness: 0.2 });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.set(0, 2.6, -2.2);
    building.castShadow = true;
    stationGroup.add(building);

    // Concourse Floor-to-Ceiling Tinted Glass Panels
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.85,
    });
    [-8, -4, 0, 4, 8].forEach((gx) => {
      const glassPane = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 0.1), glassMat);
      glassPane.position.set(gx, 2.0, -0.02);
      stationGroup.add(glassPane);
    });

    // Cantilevered Architectural Glass Canopy over Platform
    const canopyGlassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.75,
    });
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(26.4, 0.2, 5.2), canopyGlassMat);
    canopyRoof.position.set(0, 5.2, 0.4);
    stationGroup.add(canopyRoof);

    // Steel Space-Frame Canopy Support Trusses & Pillars
    const trussMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.7 });
    [-11, -5.5, 0, 5.5, 11].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 5.2, 12), trussMat);
      pillar.position.set(px, 2.6, 2.8);
      pillar.castShadow = true;
      stationGroup.add(pillar);
    });

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

    // Platform Number Signs 1..6 over each bay
    DOCK_X_POSITIONS.forEach((dx, idx) => {
      const baySignGroup = new THREE.Group();
      baySignGroup.position.set(dx, 4.8, 3.2);

      const signDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 1.4,
        })
      );
      signDisc.rotation.x = Math.PI / 2;
      baySignGroup.add(signDisc);
      stationGroup.add(baySignGroup);
    });

    // Polished Passenger Platform Sidewalk with Tactile Paving Edge
    const sidewalkGeo = new THREE.BoxGeometry(26, 0.32, 4.2);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55 });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(0, 0.16, 2.1);
    sidewalk.receiveShadow = true;
    stationGroup.add(sidewalk);

    // Tactile Safety Yellow Paving Strip along platform edge
    const tactileStrip = new THREE.Mesh(
      new THREE.BoxGeometry(25.8, 0.04, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.4 })
    );
    tactileStrip.position.set(0, 0.33, 4.0);
    stationGroup.add(tactileStrip);

    // Illuminated Safety Bollards along platform edge
    const bollardGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.85, 12);
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const bollardCapMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.6,
    });
    [-12, -8, -4, 0, 4, 8, 12].forEach((bx) => {
      const bollard = new THREE.Group();
      bollard.position.set(bx, 0.42, 4.15);
      const bPost = new THREE.Mesh(bollardGeo, bollardMat);
      bPost.castShadow = true;
      const bCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 12), bollardCapMat);
      bCap.position.y = 0.42;
      bollard.add(bPost, bCap);
      stationGroup.add(bollard);
    });

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

    // 1. Organic asphalt main parking ground with rich deep tone and crisp bevel
    const asphaltPadGeo = new THREE.BoxGeometry(padWidth, 0.18, padDepth);
    const asphaltPadMat = new THREE.MeshStandardMaterial({
      color: 0x1a2333, // rich dark slate asphalt
      roughness: 0.82,
      metalness: 0.12,
    });
    const puzzlePad = new THREE.Mesh(asphaltPadGeo, asphaltPadMat);
    puzzlePad.position.set(0, 0.08, GRID_OFFSET_Z);
    puzzlePad.receiveShadow = true;
    naturalRoadGroup.add(puzzlePad);

    // Beveled Concrete Outer Curb Perimeter framing the game board like a miniature diorama
    const curbBorderGeo = new THREE.BoxGeometry(padWidth + 0.5, 0.22, padDepth + 0.5);
    const curbBorderMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // crisp light concrete curb
      roughness: 0.65,
      metalness: 0.1,
    });
    const curbBorder = new THREE.Mesh(curbBorderGeo, curbBorderMat);
    curbBorder.position.set(0, 0.04, GRID_OFFSET_Z);
    curbBorder.receiveShadow = true;
    naturalRoadGroup.add(curbBorder);

    // Subtle Natural Environmental Details: Metallic Manhole Covers & Drainage Storm Grates
    const manholeGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16);
    const manholeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.65 });
    const manhole1 = new THREE.Mesh(manholeGeo, manholeMat);
    manhole1.position.set(-8.5, 0.17, 3.5);
    const manhole2 = new THREE.Mesh(manholeGeo, manholeMat);
    manhole2.position.set(8.5, 0.17, 8.5);
    naturalRoadGroup.add(manhole1, manhole2);

    const grateGeo = new THREE.BoxGeometry(0.7, 0.03, 1.2);
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.7 });
    const grate1 = new THREE.Mesh(grateGeo, grateMat);
    grate1.position.set(-9.8, 0.17, -1.2);
    const grate2 = new THREE.Mesh(grateGeo, grateMat);
    grate2.position.set(9.8, 0.17, -1.2);
    naturalRoadGroup.add(grate1, grate2);

    // Crisp Painted Parking Stalls and Bay Lines
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.05,
    });
    const yellowLineMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.35,
    });
    const stallPatchMat = new THREE.MeshStandardMaterial({
      color: 0x141c2b, // subtle recessed dark stall asphalt
      roughness: 0.88,
    });

    const stallGroup = new THREE.Group();
    stallGroup.position.set(0, 0.175, GRID_OFFSET_Z);

    const totalGridW = initialCols * CELL_SIZE;
    const totalGridD = initialRows * CELL_SIZE;

    // Draw individual parking slot bays with crisp white lane divider borders
    for (let r = 0; r < initialRows; r++) {
      for (let c = 0; c < initialCols; c++) {
        const cellCenterX = (c - (initialCols - 1) / 2) * CELL_SIZE;
        const cellCenterZ = (r - (initialRows - 1) / 2) * CELL_SIZE;

        // Darker textured parking slot patch
        const patch = new THREE.Mesh(
          new THREE.BoxGeometry(CELL_SIZE - 0.22, 0.01, CELL_SIZE - 0.22),
          stallPatchMat
        );
        patch.position.set(cellCenterX, 0, cellCenterZ);
        patch.receiveShadow = true;
        stallGroup.add(patch);
      }
    }

    // Grid divider lines: Horizontal and Vertical crisp painted lines
    for (let r = 0; r <= initialRows; r++) {
      const zLine = (r - initialRows / 2) * CELL_SIZE;
      const isBoundary = r === 0 || r === initialRows;
      const hLine = new THREE.Mesh(
        new THREE.BoxGeometry(totalGridW + 0.1, 0.015, isBoundary ? 0.14 : 0.07),
        isBoundary ? yellowLineMat : lineMat
      );
      hLine.position.set(0, 0.005, zLine);
      stallGroup.add(hLine);
    }

    for (let c = 0; c <= initialCols; c++) {
      const xLine = (c - initialCols / 2) * CELL_SIZE;
      const isBoundary = c === 0 || c === initialCols;
      const vLine = new THREE.Mesh(
        new THREE.BoxGeometry(isBoundary ? 0.14 : 0.07, 0.015, totalGridD + 0.1),
        isBoundary ? yellowLineMat : lineMat
      );
      vLine.position.set(xLine, 0.005, 0);
      stallGroup.add(vLine);
    }
    naturalRoadGroup.add(stallGroup);
    scene.add(naturalRoadGroup);

    // Waiting Docks Road
    const roadStrip = mainArterialRoad;

    // Docks Bay Markings with Angled Slanted Parking Spaces & Crisp 'P' Markings (Matching Reference Screenshots)
    const bayMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const bayTexture = createParkingBayTexture();
    const bayPlaneGeo = new THREE.PlaneGeometry(2.1, 4.2);
    const bayPlaneMat = new THREE.MeshStandardMaterial({
      map: bayTexture,
      transparent: true,
      opacity: 0.95,
      roughness: 0.35,
      metalness: 0.05,
      depthWrite: false,
    });

    DOCK_X_POSITIONS.forEach((dx, idx) => {
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

      // Locked Bay Indicator (Golden Padlock with + symbol)
      const lockLabel = new THREE.Group();
      lockLabel.name = `dock_lock_${idx}`;
      const circleGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 18);
      const circleMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.6,
      });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.position.y = 0.08;
      lockLabel.add(circle);

      const plusH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.14), bayMat);
      plusH.position.y = 0.13;
      const plusV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.5), bayMat);
      plusV.position.y = 0.13;
      lockLabel.add(plusH, plusV);
      bayGroup.add(lockLabel);

      scene.add(bayGroup);
    });

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
      road: roadStrip,
      puzzlePad,
      terminalBuilding: building,
      terminalRoof: canopyRoof,
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
      roadMaterial: roadStrip.material as THREE.MeshStandardMaterial,
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
            group.position.x = anim.startPos.x + anim.forwardDir.x * 0.45 * t;
            group.position.z = anim.startPos.z + anim.forwardDir.z * 0.45 * t;
            // Small chassis squat on sudden bump
            group.rotation.x = 0.05 * Math.sin(t * Math.PI);
          } else if (anim.progress < 1.0) {
            const t = (anim.progress - 0.35) / 0.65;
            group.position.x = anim.startPos.x + anim.forwardDir.x * 0.45 * (1 - t);
            group.position.z = anim.startPos.z + anim.forwardDir.z * 0.45 * (1 - t);
            group.rotation.x = -0.03 * Math.sin((1 - t) * Math.PI);
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
                const targetDockX = DOCK_X_POSITIONS[anim.dockIdx];
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
          const easeT = t * t * 1.5;
          group.position.x = anim.startPos.x + anim.forwardDir.x * 26 * easeT;
          group.position.z = anim.startPos.z + anim.forwardDir.z * 26 * easeT;

          if (group.userData?.wheelTires) {
            group.userData.wheelTires.forEach((tire: THREE.Mesh) => {
              tire.rotation.x += delta * 26;
            });
          }
          group.rotation.x = -0.06 * Math.sin(t * Math.PI);

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
      renderer.setPixelRatio(isHQ ? Math.min(window.devicePixelRatio, 2.5) : Math.min(window.devicePixelRatio, 1.5));
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
        liveryConfig: v.type === 'BUS' ? activeLiveryCfg : undefined,
        underglowConfig: v.type === 'BUS' ? activeUnderglowCfg : undefined,
        rimConfig: v.type === 'BUS' ? activeRimCfg : undefined,
      });

      const vGroup = rig.group;

      // Position
      if (v.state === VehicleStateType.DOCKED && v.dockIndex !== undefined) {
        const dockX = DOCK_X_POSITIONS[v.dockIndex];
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
  }, [gameState.vehicles]);

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
          const dockX = DOCK_X_POSITIONS[targetBus.dockIndex];
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

    const dockX = DOCK_X_POSITIONS[dockIdx];

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
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
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
            <span className="text-base">{parkingToast.grade === 'PERFECT' ? '🌟' : '👍'}</span>
            <span>{parkingToast.message}</span>
          </div>
        </div>
      )}

      {/* Floating In-Game Side Action Rail (Deluxe 3D Arcade Dock on Right Side) */}
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
                  ✕
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
                        ✓
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
                  {isAutoDirector ? '⚡ AUTO' : '🎮 MANUAL'}
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowCamControls(false);
                  }}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
                  title="Close"
                >
                  ✕
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
                        {m === 'EXPLORATION' && '360° Free orbit & inspect'}
                        {m === 'VEHICLE_FOLLOW' && 'Dynamic bus chase view'}
                        {m === 'TURN_CAM' && 'Cornering drift perspective'}
                        {m === 'PARKING_CAM' && 'Top dock alignment view'}
                        {m === 'COMPLETION' && 'Dramatic victory orbit'}
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm">
                        ✓
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
                  ✕
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
                        ✓
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
              {WEATHER_CONDITIONS[currentWeather]?.icon || '⛅'}
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
    </div>
  );
};
