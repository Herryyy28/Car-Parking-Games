import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Direction, GameState, GameStatus, PassengerState, VehicleColor, VehicleState, VehicleStateType, COLOR_MAP } from '../logic/types.ts';
import { sounds } from '../utils/soundEffects.ts';
import { BackgroundEnvironmentManager } from '../logic/backgroundManager.ts';
import { getWorldIdForLevel } from '../logic/worldThemes.ts';
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
import { PlayerProgress } from '../logic/playerProgress.ts';
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
}

const DOCK_X_POSITIONS = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
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

export const BusMadnessArena: React.FC<BusMadnessArenaProps> = ({
  gameState,
  onVehicleTapRequest,
  onVehicleArrivedAtDock,
  onDockUnlockClicked,
  activeHintId,
  isCompleted = false,
  onConfettiComplete,
  onParkingEvaluated,
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [parkingToast, setParkingToast] = useState<{ grade: string; message: string } | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('CINEMATIC_INTRO');
  const [isAutoDirector, setIsAutoDirector] = useState(true);
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
    scene.fog = new THREE.FogExp2(0x0a101d, 0.012);

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.5, 160);
    camera.position.set(0, 36, 32);
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
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8db, 2.0);
    sunLight.position.set(16, 34, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 65;
    sunLight.shadow.camera.left = -18;
    sunLight.shadow.camera.right = 18;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -18;
    sunLight.shadow.bias = -0.0008;
    scene.add(sunLight);

    const skyFill = new THREE.DirectionalLight(0x38bdf8, 0.9);
    skyFill.position.set(-14, 16, -12);
    scene.add(skyFill);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(75, 75);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0b1329, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    // Decorative Street Lamps with soft glow
    const lampPositions = [
      [-12, 0, -4],
      [12, 0, -4],
      [-12, 0, 14],
      [12, 0, 14],
    ];
    lampPositions.forEach(([lx, ly, lz]) => {
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

      lampGroup.add(pole, bulb);
      scene.add(lampGroup);
    });

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

    // Organic asphalt main parking ground
    const asphaltPadGeo = new THREE.BoxGeometry(padWidth, 0.16, padDepth);
    const asphaltPadMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.92,
      metalness: 0.08,
    });
    const puzzlePad = new THREE.Mesh(asphaltPadGeo, asphaltPadMat);
    puzzlePad.position.set(0, 0.08, GRID_OFFSET_Z);
    puzzlePad.receiveShadow = true;
    naturalRoadGroup.add(puzzlePad);

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

    // Natural Painted Parking Space T-Markings dynamically spaced
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const stallGroup = new THREE.Group();
    stallGroup.position.set(0, 0.17, GRID_OFFSET_Z);

    for (let r = 0; r <= initialRows; r++) {
      for (let c = 0; c <= initialCols; c++) {
        // Subtle dotted intersection crosses
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.06), lineMat);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.24), lineMat);
        const cross = new THREE.Group();
        cross.position.set((c - initialCols / 2) * CELL_SIZE, 0, (r - initialRows / 2) * CELL_SIZE);
        cross.add(crossH, crossV);
        stallGroup.add(cross);
      }
    }
    naturalRoadGroup.add(stallGroup);
    scene.add(naturalRoadGroup);

    // Waiting Docks Road
    const roadStrip = mainArterialRoad;

    // Docks Bay Markings
    const bayMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    DOCK_X_POSITIONS.forEach((dx, idx) => {
      const bayGroup = new THREE.Group();
      bayGroup.position.set(dx, 0.2, DOCK_Z);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 0.02, 4.2)),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
      );
      bayGroup.add(outline);

      const lockLabel = new THREE.Group();
      lockLabel.name = `dock_lock_${idx}`;
      const circleGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16);
      const circleMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.position.y = 0.05;
      lockLabel.add(circle);

      const plusH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.12), bayMat);
      plusH.position.y = 0.09;
      const plusV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.5), bayMat);
      plusV.position.y = 0.09;
      lockLabel.add(plusH, plusV);
      bayGroup.add(lockLabel);

      scene.add(bayGroup);
    });

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
    const initialWorldId = gameStateRef.current.worldId || getWorldIdForLevel(gameStateRef.current.levelId);
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
            // Update natural physics state
            const reachedDestination = NaturalVehiclePhysics.update(anim.physics, delta, elapsed);

            // Apply position with natural suspension bounce
            const baseY = group.userData?.baseY ?? 0.72;
            group.position.x = anim.physics.position.x;
            group.position.y = baseY + anim.physics.suspensionOffset;
            group.position.z = anim.physics.position.z;

            // Apply heading orientation, steering roll, and pitch
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
              group.rotation.set(0, 0, 0); // Parked bus faces North

              // Advanced Parking Evaluator: calculate alignment, clearance & orientation
              if (anim.dockIdx !== undefined) {
                const targetDockX = DOCK_X_POSITIONS[anim.dockIdx];
                const grade = AdvancedParkingEvaluator.evaluateDocking(
                  finalPos,
                  targetDockX,
                  DOCK_Z,
                  anim.physics.headingAngle,
                  anim.physics.steeringAngle
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
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      dynamicCamera.setBoardDimensions(
        gameStateRef.current.gridRows || 7,
        gameStateRef.current.gridCols || 7,
        camera.aspect
      );
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
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

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Dynamically update World environmental props, 3D road markings, weather & camera when worldId, levelId or grid dimensions change
  useEffect(() => {
    const targetWorldId = gameState.worldId || getWorldIdForLevel(gameState.levelId);
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

      const vGroup = new THREE.Group();
      const length3D = v.length * 1.05;
      const width3D = 1.6;
      let height3D = 0.95; // Sleek Car baseline
      if (v.type === 'BUS') {
        height3D = 1.38;
      } else if (v.type === 'TRUCK') {
        height3D = 1.42;
      } else if (v.type === 'VAN') {
        height3D = 1.25;
      }
      const isBus = v.type === 'BUS';

      // Position
      if (v.state === VehicleStateType.DOCKED && v.dockIndex !== undefined) {
        const dockX = DOCK_X_POSITIONS[v.dockIndex];
        vGroup.position.set(dockX, 0.72, DOCK_Z);
        vGroup.rotation.y = 0;
      } else {
        const worldPos = gridToWorld(
          v.gridPosition.row,
          v.gridPosition.col,
          v.length,
          v.direction,
          gameState.gridRows || 7,
          gameState.gridCols || 7
        );
        vGroup.position.set(worldPos.x, 0.72, worldPos.z);
        vGroup.rotation.y = directionToAngle(v.direction);
      }

      vGroup.userData = { vehicleId: v.id };

      const hex = COLOR_MAP[v.color].hex;

      // Soft Ground Drop Shadow under Vehicle
      const shadowGeo = new THREE.PlaneGeometry(width3D * 1.08, length3D * 1.05);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -0.68;
      vGroup.add(shadowMesh);

      // Custom Finish from Active Livery
      const bodyRoughness = isBus ? activeLiveryCfg.roughness : 0.28;
      const bodyMetalness = isBus ? activeLiveryCfg.metalness : 0.25;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: bodyRoughness,
        metalness: bodyMetalness,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(width3D, height3D * 0.75, length3D), bodyMat);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData = { vehicleId: v.id, originalColor: hex };
      vGroup.add(body);

      // Cabin Roof
      const cabinColor = isBus && activeLiveryCfg.id === 'LONDON_RED' ? 0xffffff : 0x1e293b;
      const cabinMat = new THREE.MeshStandardMaterial({
        color: cabinColor,
        roughness: 0.15,
        metalness: 0.35,
      });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width3D * 0.88, height3D * 0.55, length3D * 0.82), cabinMat);
      cabin.position.set(0, height3D * 0.45, -0.05);
      cabin.castShadow = true;
      cabin.userData = { vehicleId: v.id };
      vGroup.add(cabin);

      // Tinted Glass Windshield & Windows
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.7,
        transparent: true,
        opacity: 0.85,
      });

      // Front Windshield Glass
      const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(width3D * 0.82, height3D * 0.38, 0.05),
        glassMat
      );
      windshield.position.set(0, height3D * 0.44, -length3D * 0.42);
      windshield.rotation.x = -0.15;
      vGroup.add(windshield);

      // Rear Window Glass
      const rearWindow = new THREE.Mesh(
        new THREE.BoxGeometry(width3D * 0.80, height3D * 0.32, 0.05),
        glassMat
      );
      rearWindow.position.set(0, height3D * 0.44, length3D * 0.38);
      rearWindow.rotation.x = 0.15;
      vGroup.add(rearWindow);

      // Side Windows / Passenger Panoramic Glass strips
      [-width3D * 0.45, width3D * 0.45].forEach((xSide) => {
        const sideWin = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, height3D * 0.32, length3D * 0.65),
          glassMat
        );
        sideWin.position.set(xSide, height3D * 0.44, -0.02);
        vGroup.add(sideWin);
      });

      // Side Mirrors (Aerodynamic wing mirrors on left & right)
      const mirrorMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.5,
      });
      [-width3D * 0.52, width3D * 0.52].forEach((xMirror) => {
        const mirrorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.18), mirrorMat);
        mirrorMesh.position.set(xMirror, height3D * 0.28, -length3D * 0.28);
        vGroup.add(mirrorMesh);
      });

      // Front Lower Bumper
      const bumperMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.7,
        metalness: 0.3,
      });
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(width3D * 0.96, 0.16, 0.18), bumperMat);
      bumper.position.set(0, -height3D * 0.25, -length3D * 0.51);
      vGroup.add(bumper);

      // Visual selection highlight feedback when selected
      if (v.state === VehicleStateType.SELECTED) {
        const selectRing = new THREE.Mesh(
          new THREE.RingGeometry(width3D * 0.65, width3D * 0.85, 24),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          })
        );
        selectRing.rotation.x = -Math.PI / 2;
        selectRing.position.y = -0.66;
        vGroup.add(selectRing);
      }

      // Custom Livery Decals for Buses
      if (isBus) {
        if (activeLiveryCfg.patternType === 'racing_stripes') {
          // Dual white/red GT racing stripes on hood & roof
          [-0.32, 0.32].forEach((xOff) => {
            const stripeGeo = new THREE.BoxGeometry(0.18, 0.02, length3D * 0.85);
            const stripeMat = new THREE.MeshBasicMaterial({ color: activeLiveryCfg.stripeColor });
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(xOff, height3D * 0.74, 0);
            vGroup.add(stripe);
          });
        } else if (activeLiveryCfg.patternType === 'cyber_circuit') {
          // Glowing circuit line accents along sides
          [-width3D * 0.51, width3D * 0.51].forEach((xSide) => {
            const lineGeo = new THREE.BoxGeometry(0.02, 0.08, length3D * 0.75);
            const lineMat = new THREE.MeshBasicMaterial({ color: activeLiveryCfg.stripeColor });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(xSide, height3D * 0.25, 0);
            vGroup.add(line);
          });
        } else if (activeLiveryCfg.patternType === 'school_bus') {
          // Classic black protective rub rails
          [-width3D * 0.51, width3D * 0.51].forEach((xSide) => {
            const railGeo = new THREE.BoxGeometry(0.04, 0.08, length3D * 0.8);
            const railMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.position.set(xSide, 0.05, 0);
            vGroup.add(rail);
          });
        } else if (activeLiveryCfg.patternType === 'gold_chrome') {
          // Gold metallic emblem on roof
          const goldCrownGeo = new THREE.BoxGeometry(0.35, 0.08, length3D * 0.3);
          const goldCrownMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.95, roughness: 0.08 });
          const goldCrown = new THREE.Mesh(goldCrownGeo, goldCrownMat);
          goldCrown.position.set(0, height3D * 0.78, 0);
          vGroup.add(goldCrown);
        }

        // Underglow Neon Lighting for Bus fleet
        if (activeUnderglowCfg.intensity > 0) {
          const ugLight = new THREE.PointLight(activeUnderglowCfg.colorHex, activeUnderglowCfg.intensity * 1.5, 3.8);
          ugLight.position.set(0, -height3D * 0.28, 0);
          vGroup.add(ugLight);

          const ugPlateGeo = new THREE.PlaneGeometry(width3D * 0.9, length3D * 0.85);
          const ugPlateMat = new THREE.MeshBasicMaterial({
            color: activeUnderglowCfg.colorHex,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
          });
          const ugPlate = new THREE.Mesh(ugPlateGeo, ugPlateMat);
          ugPlate.rotation.x = -Math.PI / 2;
          ugPlate.position.y = -height3D * 0.32;
          vGroup.add(ugPlate);
        }
      }

      // White Direction Arrow on Roof
      const arrowGroup = new THREE.Group();
      arrowGroup.position.set(0, height3D * 0.76, 0);

      const aShaft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, length3D * 0.35), arrowMat);
      aShaft.position.z = length3D * 0.05;
      const aHead = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.6, 3), arrowMat);
      aHead.rotation.x = Math.PI / 2;
      aHead.position.z = -length3D * 0.22;
      arrowGroup.add(aShaft, aHead);
      vGroup.add(arrowGroup);

      // Passenger Capacity Slots & Loaded Indicators on Roof
      const totalCapacity = v.capacity || (isBus ? 4 : 3);
      const slotMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.5,
        metalness: 0.2,
      });
      const pSphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.25,
        emissive: new THREE.Color(hex),
        emissiveIntensity: 0.25,
      });

      for (let sIdx = 0; sIdx < totalCapacity; sIdx++) {
        const zOff = -length3D * 0.28 + (sIdx / (totalCapacity - 1 || 1)) * (length3D * 0.56);
        const seatRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), slotMat);
        seatRing.position.set(0, height3D * 0.74, zOff);
        vGroup.add(seatRing);

        if (sIdx < v.loadedPassengers) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), pSphereMat);
          sphere.position.set(0, height3D * 0.90, zOff);
          sphere.castShadow = true;
          vGroup.add(sphere);
        }
      }

      // Headlights (Front: -length3D / 2)
      const headlightMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfef08a,
        emissiveIntensity: 1.6,
      });
      const hlLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), headlightMat);
      hlLeft.rotation.x = Math.PI / 2;
      hlLeft.position.set(-width3D * 0.32, -height3D * 0.1, -length3D * 0.5 - 0.02);
      const hlRight = hlLeft.clone();
      hlRight.position.x = width3D * 0.32;
      vGroup.add(hlLeft, hlRight);

      // Taillights (Rear: +length3D / 2) - Dynamic Brake Lights
      const taillightMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xef4444,
        emissiveIntensity: 1.2,
      });
      const tlLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), taillightMat);
      tlLeft.rotation.x = Math.PI / 2;
      tlLeft.position.set(-width3D * 0.32, -height3D * 0.1, length3D * 0.5 + 0.02);
      const tlRight = tlLeft.clone();
      tlRight.position.x = width3D * 0.32;
      tlLeft.name = 'brake_light_left';
      tlRight.name = 'brake_light_right';
      vGroup.add(tlLeft, tlRight);

      // Turn Indicators (Amber lights on corners)
      const indicatorMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.2,
      });
      const indFrontL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), indicatorMat);
      indFrontL.position.set(-width3D * 0.44, -height3D * 0.05, -length3D * 0.48);
      indFrontL.name = 'indicator_fl';
      const indFrontR = indFrontL.clone();
      indFrontR.position.x = width3D * 0.44;
      indFrontR.name = 'indicator_fr';
      vGroup.add(indFrontL, indFrontR);

      // Wheels with Custom Rims from Garage
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
      const rimMat = new THREE.MeshStandardMaterial({
        color: isBus ? activeRimCfg.colorHex : 0xe2e8f0,
        roughness: isBus ? activeRimCfg.roughness : 0.25,
        metalness: isBus ? activeRimCfg.metalness : 0.7,
      });
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 14);
      const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.23, 14);

      const wx = width3D * 0.52;
      const wz = length3D * 0.32;
      const frontWheels: THREE.Group[] = [];
      const allWheelTires: THREE.Mesh[] = [];

      [
        { pos: [wx, -height3D * 0.25, -wz], isFront: true },
        { pos: [-wx, -height3D * 0.25, -wz], isFront: true },
        { pos: [wx, -height3D * 0.25, wz], isFront: false },
        { pos: [-wx, -height3D * 0.25, wz], isFront: false },
      ].forEach(({ pos: [x, y, z], isFront }) => {
        const wGroup = new THREE.Group();
        wGroup.position.set(x, y, z);

        const tire = new THREE.Mesh(wheelGeo, wheelMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;

        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.z = Math.PI / 2;

        wGroup.add(tire, rim);
        vGroup.add(wGroup);

        allWheelTires.push(tire);
        if (isFront) {
          frontWheels.push(wGroup);
        }
      });

      // Save physics rigging handles
      vGroup.userData = {
        vehicleId: v.id,
        isBus: v.type === 'BUS',
        frontWheels,
        wheelTires: allWheelTires,
        brakeLightMat: taillightMat,
        indicatorMat,
        baseY: 0.72,
      };

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

    // Render fully articulated 3D chibi commuters in the waiting line
    currentWaiting.slice(0, 10).forEach((p, idx) => {
      const rig = createArticulatedHumanoid(COLOR_MAP[p.color].hex, 0.85, p.isVip);
      rig.root.position.set(-6.5 + idx * 1.05, 0.35, -10.0);
      rig.root.rotation.y = Math.PI / 2; // Facing towards terminal bays
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
    dynamicCameraRef.current?.addShake(0.25);

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

    // Initialize physical motion simulation state with vehicle type personality
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

      {/* Dynamic 3D Parking Precision Feedback Badge */}
      {parkingToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2 rounded-2xl shadow-xl font-black text-xs sm:text-sm tracking-wide border flex items-center gap-2 backdrop-blur-md ${
              parkingToast.grade === 'PERFECT'
                ? 'bg-amber-500/90 border-yellow-300 text-slate-950 ring-4 ring-amber-400/40 animate-pulse'
                : parkingToast.grade === 'GOOD'
                ? 'bg-emerald-600/90 border-emerald-300 text-white ring-4 ring-emerald-500/30'
                : 'bg-slate-800/90 border-slate-600 text-slate-200'
            }`}
          >
            <span>{parkingToast.message}</span>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar (Camera + Weather Controls) */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
        {/* Expanded Weather Selector Menu */}
        {showWeatherControls && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1 text-xs w-52 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
              <span className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                Weather Manager
              </span>
              <button
                onClick={() => {
                  const targetWorldId = gameState.worldId || getWorldIdForLevel(gameState.levelId);
                  const def = getDefaultWeatherForWorld(targetWorldId);
                  weatherSystemRef.current?.setWeather(def);
                  setCurrentWeather(def);
                }}
                className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                title="Reset to world theme default"
              >
                THEME SYNC
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
              {(Object.keys(WEATHER_CONDITIONS) as WeatherType[]).map((wKey) => {
                const cond = WEATHER_CONDITIONS[wKey];
                const isActive = currentWeather === wKey;
                return (
                  <button
                    key={wKey}
                    onClick={() => {
                      weatherSystemRef.current?.setWeather(wKey);
                      setCurrentWeather(wKey);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all font-medium ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{cond.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold leading-none truncate text-[11px]">{cond.name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {cond.particleType !== 'none' ? `${cond.particleType.replace('_', ' ')} particles` : 'clear skies'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Expanded Camera Preset Angles Menu */}
        {showCamControls && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 text-xs w-44 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1 mb-0.5">
              <span>Dynamic Camera</span>
              <button
                onClick={() => {
                  const next = !isAutoDirector;
                  setIsAutoDirector(next);
                  dynamicCameraRef.current?.setAutoDirector(next);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-colors ${
                  isAutoDirector
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isAutoDirector ? 'DIRECTOR ON' : 'MANUAL'}
              </button>
            </div>

            {(['EXPLORATION', 'VEHICLE_FOLLOW', 'TURN_CAM', 'PARKING_CAM', 'COMPLETION'] as CameraMode[]).map((m) => {
              const meta = CAMERA_MODE_METADATA[m];
              const isActive = cameraMode === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setIsAutoDirector(false);
                    dynamicCameraRef.current?.setAutoDirector(false);
                    dynamicCameraRef.current?.setMode(m);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all font-medium ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold leading-none">{meta.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Compact Floating Camera & Weather Bar */}
        <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-full px-2 py-1 shadow-lg text-slate-200">
          {/* Weather Manager Toggle Pill */}
          <button
            onClick={() => {
              setShowWeatherControls(!showWeatherControls);
              if (showCamControls) setShowCamControls(false);
            }}
            title="Weather Conditions: Rain, Snow, Fog, Sun"
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold text-sky-300 hover:bg-slate-800/80 transition-colors"
          >
            <span>{WEATHER_CONDITIONS[currentWeather]?.icon || '⛅'}</span>
            <span className="hidden sm:inline text-[11px] font-semibold text-sky-200">
              {WEATHER_CONDITIONS[currentWeather]?.name.split(' ')[0] || currentWeather}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

          {/* Active Camera Mode Pill Indicator */}
          <button
            onClick={() => {
              setShowCamControls(!showCamControls);
              if (showWeatherControls) setShowWeatherControls(false);
            }}
            title="Toggle dynamic camera angles menu"
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold text-amber-300 hover:bg-slate-800/80 transition-colors"
          >
            <span>{CAMERA_MODE_METADATA[cameraMode]?.icon || '🎥'}</span>
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-200">
              {CAMERA_MODE_METADATA[cameraMode]?.label || cameraMode}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

          {/* Reset View Button */}
          <button
            onClick={() => dynamicCameraRef.current?.resetView()}
            title="Reset isometric view"
            aria-label="Reset isometric view"
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In Button */}
          <button
            onClick={() => dynamicCameraRef.current?.onZoom(-3.5)}
            title="Zoom in"
            aria-label="Zoom in"
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out Button */}
          <button
            onClick={() => dynamicCameraRef.current?.onZoom(3.5)}
            title="Zoom out"
            aria-label="Zoom out"
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Camera Menu Toggle */}
          <button
            onClick={() => {
              setShowCamControls(!showCamControls);
              if (showWeatherControls) setShowWeatherControls(false);
            }}
            title="Camera modes"
            aria-label="Camera modes"
            className={`p-1.5 rounded-full transition-colors ${
              showCamControls ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
