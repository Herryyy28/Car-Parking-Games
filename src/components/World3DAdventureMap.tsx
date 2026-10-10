import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Lock,
  Star,
  Compass,
  Crosshair,
  Layers,
  Sparkles,
  CheckCircle2,
  Trophy,
  ZoomIn,
  ZoomOut,
  Gift,
  Route,
  Globe,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { WORLD_THEMES, getWorldConfig, getChapterInfo } from '../logic/worldThemes.ts';
import { LevelRepository, LevelData } from '../logic/levelRepository.ts';
import { sounds } from '../utils/soundEffects.ts';
import {
  Difficulty,
  GameMode,
  DIFFICULTY_CONFIGS,
  GAME_MODE_CONFIGS,
} from '../logic/types.ts';

interface World3DAdventureMapProps {
  currentLevelId: number;
  unlockedLevelId: number;
  progressStars: Record<number, number>;
  coins: number;
  selectedDifficulty: Difficulty;
  selectedGameMode: GameMode;
  onSelectLevel: (levelId: number, diffOverride?: Difficulty, modeOverride?: GameMode) => void;
  onBackToHome: () => void;
  initialWorldId?: number;
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

// Generates 25 station positions along a natural winding S-curve road through the diorama
function getRoadWaypoints(): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  // 25 station coordinates along an undulating landscape
  for (let i = 0; i < 25; i++) {
    const t = i / 24; // 0 to 1
    // Zig-zag / serpentine curve along Z and X
    const z = -32 + t * 64; // from -32 to +32
    // S-curve oscillation with gentle secondary frequency
    const x = Math.sin(t * Math.PI * 3.2) * 16.0 + Math.cos(t * Math.PI * 1.5) * 3.0;
    // Gentle rolling hills height
    const y = Math.sin(t * Math.PI * 2.0) * 1.5 + 0.3;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export const World3DAdventureMap: React.FC<World3DAdventureMapProps> = ({
  currentLevelId,
  unlockedLevelId,
  progressStars,
  coins,
  selectedDifficulty,
  selectedGameMode,
  onSelectLevel,
  onBackToHome,
  initialWorldId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active World and Chapter selection
  const initialWorld = initialWorldId || getChapterInfo(currentLevelId).worldId || 1;
  const initialChapter = getChapterInfo(currentLevelId).chapterIndex || 1;

  const [activeWorldId, setActiveWorldId] = useState<number>(initialWorld);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(initialChapter);
  const [selectedStationLevelId, setSelectedStationLevelId] = useState<number>(currentLevelId);
  const [sideTab, setSideTab] = useState<'road' | 'worlds'>('road');
  const [isSideRailExpanded, setIsSideRailExpanded] = useState<boolean>(true);

  // Selected level details
  const selectedLevelData: LevelData = useMemo(() => {
    return LevelRepository.getLevel(selectedStationLevelId, selectedDifficulty);
  }, [selectedStationLevelId, selectedDifficulty]);

  const worldConfig = useMemo(() => {
    return getWorldConfig(activeWorldId);
  }, [activeWorldId]);

  // Levels for current Chapter (25 levels per chapter)
  const chapterLevels: LevelData[] = useMemo(() => {
    return LevelRepository.getLevelsForChapter(activeWorldId, activeChapterIndex, selectedDifficulty);
  }, [activeWorldId, activeChapterIndex, selectedDifficulty]);

  // Reference hooks to control 3D camera from React buttons
  const focusOnLevelRef = useRef<((levelId: number) => void) | null>(null);
  const resetOverviewCameraRef = useRef<(() => void) | null>(null);
  const zoomCameraRef = useRef<((delta: number) => void) | null>(null);

  // Initialize Three.js 3D World Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.name = 'World3DAdventureScene';

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.2, 250);
    camera.position.set(22, 28, 42);
    const cameraTarget = new THREE.Vector3(0, 1.5, 0);
    camera.lookAt(cameraTarget);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // Apply World Theme Environment Colors
    scene.background = new THREE.Color(worldConfig.skyColor);
    scene.fog = new THREE.FogExp2(worldConfig.fogColor, worldConfig.fogDensity * 0.9);

    // Dynamic Lighting System
    const ambientLight = new THREE.AmbientLight(worldConfig.ambientLightColor, worldConfig.ambientIntensity * 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      worldConfig.hemiSkyColor,
      worldConfig.hemiGroundColor,
      0.75
    );
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(worldConfig.sunLightColor, worldConfig.sunIntensity);
    sunLight.position.set(28, 45, 32);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -38;
    sunLight.shadow.camera.right = 38;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xa5f3fc, 0.85);
    rimLight.position.set(-30, 25, -28);
    scene.add(rimLight);

    // Build Continuous Diorama Terrain & Hills
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // MASSIVE 4D WORLD: Extend to the horizon (360 degrees)
    const worldSize = 1200;
    const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize, 200, 200);
    groundGeo.rotateX(-Math.PI / 2); // Lay flat
    
    // Displace vertices to create massive rolling hills and distant mountains
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const distFromCenter = Math.sqrt(x*x + z*z);
      
      // Keep center relatively flat for the road
      let elevation = 0;
      if (distFromCenter > 25) {
        const distFactor = Math.min(1.0, (distFromCenter - 25) / 100);
        // Huge distant mountains and rolling hills using sine waves
        elevation = (Math.sin(x * 0.02) * Math.cos(z * 0.03) * 20 +
                     Math.sin(x * 0.008 + z * 0.012) * 35 +
                     Math.cos(z * 0.06) * 5) * distFactor;
      } else {
        // Subtle rolling terrain near the road
        elevation = Math.sin(x * 0.12) * Math.cos(z * 0.08) * 1.2 + Math.sin(z * 0.15) * 0.8;
      }
      
      posAttr.setY(i, elevation);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: worldConfig.groundColor,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, -1.8, 0);
    groundMesh.receiveShadow = true;
    terrainGroup.add(groundMesh);

    // Endless Surrounding Ocean / Base Pedestal
    const oceanGeo = new THREE.PlaneGeometry(worldSize * 1.2, worldSize * 1.2);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9, // Bright ocean color
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.set(0, -4.5, 0);
    terrainGroup.add(oceanMesh);

    // Dynamic Clouds in the sky (InstancedMesh)
    const cloudGeo = new THREE.SphereGeometry(1, 8, 8);
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true, transparent: true, opacity: 0.8 });
    const cloudCount = 100;
    const cloudInstanced = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
    const cloudDummy = new THREE.Object3D();
    for(let i=0; i<cloudCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 400;
      const cy = 40 + Math.random() * 60;
      cloudDummy.position.set(Math.cos(a)*r, cy, Math.sin(a)*r);
      cloudDummy.scale.set(10 + Math.random()*20, 5 + Math.random()*8, 10 + Math.random()*20);
      cloudDummy.rotation.y = Math.random() * Math.PI;
      cloudDummy.updateMatrix();
      cloudInstanced.setMatrixAt(i, cloudDummy.matrix);
    }
    scene.add(cloudInstanced);

    // Generate Catmull-Rom Spline Curve for the Winding Road
    const roadWaypoints = getRoadWaypoints();
    const roadSpline = new THREE.CatmullRomCurve3(roadWaypoints, false, 'catmullrom', 0.5);

    // Build the extruded 3D Road Ribbon along the spline with Raised Curbs
    const roadShape = new THREE.Shape();
    // Raised Concrete Curb (Left)
    roadShape.moveTo(-2.8, 0);
    roadShape.lineTo(-2.8, 0.32);
    roadShape.lineTo(-2.4, 0.26);
    // Smooth Asphalt Deck
    roadShape.lineTo(-2.4, 0.18);
    roadShape.lineTo(2.4, 0.18);
    // Raised Concrete Curb (Right)
    roadShape.lineTo(2.4, 0.26);
    roadShape.lineTo(2.8, 0.32);
    roadShape.lineTo(2.8, 0);
    roadShape.closePath();

    const roadExtrudeGeo = new THREE.ExtrudeGeometry(roadShape, {
      steps: 140,
      extrudePath: roadSpline,
      bevelEnabled: false,
    });
    const roadMat = new THREE.MeshStandardMaterial({
      color: worldConfig.roadColor,
      roughness: 0.62,
      metalness: 0.18,
    });
    const roadMesh = new THREE.Mesh(roadExtrudeGeo, roadMat);
    roadMesh.position.y += 0.05;
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Continuous Shoulder Edge Lines (Glowing Cyan/White borders)
    const shoulderMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd });
    const shoulderGroup = new THREE.Group();
    scene.add(shoulderGroup);

    for (let i = 0; i < 90; i++) {
      const t = i / 90;
      const pt = roadSpline.getPoint(t);
      const tangent = roadSpline.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftGeo = new THREE.BoxGeometry(0.14, 0.02, 0.6);
      const leftMesh = new THREE.Mesh(leftGeo, shoulderMat);
      leftMesh.position.set(pt.x - normal.x * 2.25, pt.y + 0.25, pt.z - normal.z * 2.25);
      leftMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      shoulderGroup.add(leftMesh);

      const rightGeo = new THREE.BoxGeometry(0.14, 0.02, 0.6);
      const rightMesh = new THREE.Mesh(rightGeo, shoulderMat);
      rightMesh.position.set(pt.x + normal.x * 2.25, pt.y + 0.25, pt.z + normal.z * 2.25);
      rightMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      shoulderGroup.add(rightMesh);
    }

    // Decorative Road Markings (Dashed Centerline)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const dashGroup = new THREE.Group();
    scene.add(dashGroup);

    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const pt = roadSpline.getPoint(t);
      const tangent = roadSpline.getTangent(t);
      const dashGeo = new THREE.BoxGeometry(0.24, 0.02, 0.65);
      const dashMesh = new THREE.Mesh(dashGeo, lineMat);
      dashMesh.position.set(pt.x, pt.y + 0.25, pt.z);
      dashMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dashGroup.add(dashMesh);
    }

    // Roadside Streetlamps with Glowing Light Orbs
    const streetLampGroup = new THREE.Group();
    scene.add(streetLampGroup);
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8);
    const lampArmGeo = new THREE.BoxGeometry(0.8, 0.08, 0.08);
    const lampBulbGeo = new THREE.SphereGeometry(0.22, 12, 12);

    for (let i = 2; i < 24; i += 3) {
      const t = i / 24;
      const pt = roadSpline.getPoint(t);
      const tangent = roadSpline.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const side = (i % 2 === 0 ? 1 : -1);

      const lamp = new THREE.Group();
      lamp.position.set(pt.x + normal.x * 3.4 * side, pt.y + 0.1, pt.z + normal.z * 3.4 * side);

      const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      pole.position.y = 1.6;
      pole.castShadow = true;
      lamp.add(pole);

      const arm = new THREE.Mesh(lampArmGeo, lampPoleMat);
      arm.position.set(-side * 0.35, 3.1, 0);
      lamp.add(arm);

      const bulb = new THREE.Mesh(lampBulbGeo, lampBulbMat);
      bulb.position.set(-side * 0.7, 3.0, 0);
      lamp.add(bulb);

      streetLampGroup.add(lamp);
    }

    // MASSIVE WORLD TREES: InstancedMesh for performance
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: worldConfig.treeFoliageColor, roughness: 0.7, flatShading: true });
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: worldConfig.treeTrunkColor, roughness: 0.85 });
    const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 1.8, 6);
    const treeFoliageGeo = new THREE.ConeGeometry(1.6, 3.5, 7);

    const treeCount = 2000;
    const trunkInstanced = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, treeCount);
    const foliageInstanced = new THREE.InstancedMesh(treeFoliageGeo, treeFoliageMat, treeCount);
    trunkInstanced.castShadow = true;
    foliageInstanced.castShadow = true;
    scene.add(trunkInstanced);
    scene.add(foliageInstanced);

    const dummy = new THREE.Object3D();
    const upVector = new THREE.Vector3(0, 1, 0);
    
    // Scatter trees across the massive landscape, avoiding the center road area
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 500;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;

      const distFromCenter = Math.sqrt(tx*tx + tz*tz);
      let elevation = 0;
      if (distFromCenter > 25) {
        const distFactor = Math.min(1.0, (distFromCenter - 25) / 100);
        elevation = (Math.sin(tx * 0.02) * Math.cos(tz * 0.03) * 20 + Math.sin(tx * 0.008 + tz * 0.012) * 35 + Math.cos(tz * 0.06) * 5) * distFactor;
      } else {
        elevation = Math.sin(tx * 0.12) * Math.cos(tz * 0.08) * 1.2 + Math.sin(tz * 0.15) * 0.8;
      }

      const scale = 0.5 + Math.random() * 1.0;
      const yPos = elevation - 1.8;

      if (yPos < -2.0) continue; // Don't place in deep water

      dummy.position.set(tx, yPos + 0.9 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      
      // Give trees slight random tilt
      dummy.rotation.x = (Math.random() - 0.5) * 0.2;
      dummy.rotation.z = (Math.random() - 0.5) * 0.2;
      
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, yPos + 2.7 * scale, tz);
      dummy.updateMatrix();
      foliageInstanced.setMatrixAt(i, dummy.matrix);
    }
    trunkInstanced.instanceMatrix.needsUpdate = true;
    foliageInstanced.instanceMatrix.needsUpdate = true;

    // Interactive 3D Bus Stations (25 level destinations)
    const stationGroup = new THREE.Group();
    scene.add(stationGroup);

    const stationInteractableMeshes: THREE.Mesh[] = [];
    const stationTransforms: Array<{ levelId: number; pos: THREE.Vector3; obj: THREE.Group }> = [];
    const starMeshesToAnimate: Array<{ mesh: THREE.Mesh; baseY: number; phase: number }> = [];
    let beaconToAnimate: THREE.Mesh | null = null;
    let beaconRingToAnimate: THREE.Mesh | null = null;

    // Build stations for each of the 25 levels in current chapter
    chapterLevels.forEach((lvl, idx) => {
      const stationPos = roadWaypoints[idx];
      const stationLevelId = lvl.id;
      const isCompleted = stationLevelId < unlockedLevelId;
      const isCurrent = stationLevelId === unlockedLevelId;
      const isLocked = stationLevelId > unlockedLevelId;
      const starsEarned = progressStars[stationLevelId] || 0;
      const isMilestone = idx === 4 || idx === 9 || idx === 14 || idx === 19 || idx === 24;

      const stationNode = new THREE.Group();
      // Offset slightly to the roadside
      const roadsideOffset = idx % 2 === 0 ? 3.0 : -3.0;
      stationNode.position.set(stationPos.x + roadsideOffset, stationPos.y, stationPos.z);

      // Access Ramp & Zebra Crosswalk connecting Road to Station Platform
      const rampGeo = new THREE.BoxGeometry(Math.abs(roadsideOffset), 0.22, 1.8);
      const rampMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.7,
      });
      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.position.set(-roadsideOffset * 0.5, 0.1, 0);
      rampMesh.receiveShadow = true;
      stationNode.add(rampMesh);

      // Zebra Crossing Stripes on the Access Ramp
      const zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let zOffset = -0.6; zOffset <= 0.6; zOffset += 0.35) {
        const zebraGeo = new THREE.BoxGeometry(Math.abs(roadsideOffset) * 0.75, 0.02, 0.14);
        const zebraMesh = new THREE.Mesh(zebraGeo, zebraMat);
        zebraMesh.position.set(-roadsideOffset * 0.5, 0.22, zOffset);
        stationNode.add(zebraMesh);
      }

      // Station Concrete Platform Base with Curb
      const platGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.35, 16);
      const platMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0xfef08a : isCompleted ? 0xa7f3d0 : 0x334155,
        roughness: 0.6,
        metalness: isCurrent ? 0.3 : 0.1,
      });
      const platformMesh = new THREE.Mesh(platGeo, platMat);
      platformMesh.position.y = 0.18;
      platformMesh.receiveShadow = true;
      platformMesh.castShadow = true;
      platformMesh.userData = { levelId: stationLevelId };
      stationNode.add(platformMesh);
      stationInteractableMeshes.push(platformMesh);

      // Platform Outer Neon Road Ring
      const ringGeo = new THREE.RingGeometry(2.2, 2.5, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isCurrent ? 0xf59e0b : isCompleted ? 0x10b981 : 0x475569,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.2;
      stationNode.add(ringMesh);

      // Bus Shelter Canopy & Pillars
      const shelterPillarsGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
      const shelterPillarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 });
      const p1 = new THREE.Mesh(shelterPillarsGeo, shelterPillarMat);
      p1.position.set(-0.9, 0.98, -0.6);
      const p2 = new THREE.Mesh(shelterPillarsGeo, shelterPillarMat);
      p2.position.set(0.9, 0.98, -0.6);
      stationNode.add(p1, p2);

      // Curved Canopy Roof
      const roofGeo = new THREE.BoxGeometry(2.3, 0.18, 1.5);
      const roofMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0xfbbf24 : isCompleted ? 0x10b981 : 0x1e293b,
        roughness: 0.3,
        metalness: 0.2,
      });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(0, 1.8, -0.2);
      roofMesh.castShadow = true;
      stationNode.add(roofMesh);

      // Station Signpost / Billboard with 3D Level Indicator
      const signPoleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8);
      const signPole = new THREE.Mesh(signPoleGeo, shelterPillarMat);
      signPole.position.set(1.1, 1.2, 0.8);
      stationNode.add(signPole);

      // Badge Cube on pole
      const badgeGeo = new THREE.BoxGeometry(0.8, 0.8, 0.25);
      const badgeMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0xf59e0b : isCompleted ? 0x059669 : 0x0f172a,
        roughness: 0.4,
      });
      const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
      badgeMesh.position.set(1.1, 2.3, 0.8);
      badgeMesh.castShadow = true;
      badgeMesh.userData = { levelId: stationLevelId };
      stationNode.add(badgeMesh);
      stationInteractableMeshes.push(badgeMesh);

      // Visual Status Details:
      if (isCompleted) {
        // Floating Gold Stars above shelter
        const starCount = Math.max(1, Math.min(3, starsEarned || 1));
        const starGeo = new THREE.OctahedronGeometry(0.24, 0);
        const starMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xeab308,
          emissiveIntensity: 0.6,
          metalness: 0.8,
          roughness: 0.2,
        });

        for (let s = 0; s < starCount; s++) {
          const sMesh = new THREE.Mesh(starGeo, starMat);
          const xOffset = (s - (starCount - 1) / 2) * 0.6;
          sMesh.position.set(xOffset, 2.4, -0.2);
          stationNode.add(sMesh);
          starMeshesToAnimate.push({
            mesh: sMesh,
            baseY: 2.4,
            phase: idx * 0.4 + s * 1.2,
          });
        }
      } else if (isCurrent) {
        // Glowing vertical Beacon Cylinder rising to sky
        const beaconGeo = new THREE.CylinderGeometry(0.25, 0.65, 8.0, 16, 1, true);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.set(0, 4.3, 0);
        stationNode.add(beaconMesh);
        beaconToAnimate = beaconMesh;

        // Animated Pulsing Ground Disc
        const pulseDiscGeo = new THREE.RingGeometry(0.4, 1.8, 24);
        pulseDiscGeo.rotateX(-Math.PI / 2);
        const pulseDiscMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const pulseMesh = new THREE.Mesh(pulseDiscGeo, pulseDiscMat);
        pulseMesh.position.y = 0.22;
        stationNode.add(pulseMesh);
        beaconRingToAnimate = pulseMesh;

        // Floating "Play Here" Mini Hero Bus
        const miniBusGeo = new THREE.BoxGeometry(0.9, 0.6, 1.4);
        const miniBusMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          roughness: 0.3,
          metalness: 0.3,
        });
        const miniBus = new THREE.Mesh(miniBusGeo, miniBusMat);
        miniBus.position.set(0, 2.6, 0);
        stationNode.add(miniBus);
        starMeshesToAnimate.push({
          mesh: miniBus,
          baseY: 2.6,
          phase: 0,
        });
      } else if (isLocked) {
        // 3D Padlock geometry
        const lockBodyGeo = new THREE.BoxGeometry(0.5, 0.45, 0.22);
        const lockShackleGeo = new THREE.TorusGeometry(0.22, 0.06, 8, 12, Math.PI);
        const lockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });

        const lockBody = new THREE.Mesh(lockBodyGeo, lockMat);
        lockBody.position.set(0, 2.2, -0.2);
        const lockShackle = new THREE.Mesh(lockShackleGeo, lockMat);
        lockShackle.position.set(0, 2.45, -0.2);
        stationNode.add(lockBody, lockShackle);
      }

      // Special Milestone Badge or Golden Ribbon
      if (isMilestone) {
        const chestGeo = new THREE.BoxGeometry(0.7, 0.55, 0.55);
        const chestMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.7,
          roughness: 0.2,
        });
        const chest = new THREE.Mesh(chestGeo, chestMat);
        chest.position.set(-1.2, 0.6, 0.6);
        stationNode.add(chest);
      }

      stationGroup.add(stationNode);
      stationTransforms.push({
        levelId: stationLevelId,
        pos: stationNode.position,
        obj: stationNode,
      });
    });

    // Ambient Animated Traffic (2 stylized miniature buses driving along the road)
    const ambientBuses: Array<{
      group: THREE.Group;
      progress: number;
      speed: number;
      color: number;
    }> = [];

    const busColors = [0x3b82f6, 0xef4444];
    busColors.forEach((col, bIdx) => {
      const busGroup = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(1.2, 0.9, 2.2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.35,
        metalness: 0.2,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      body.castShadow = true;
      busGroup.add(body);

      // Glass windshield
      const glassGeo = new THREE.BoxGeometry(1.05, 0.45, 0.2);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.1,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 0.65, 1.02);
      busGroup.add(glass);

      // Small glowing headlights
      const hlGeo = new THREE.BoxGeometry(0.2, 0.15, 0.05);
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfffae5 });
      const hl1 = new THREE.Mesh(hlGeo, hlMat);
      hl1.position.set(-0.4, 0.35, 1.12);
      const hl2 = new THREE.Mesh(hlGeo, hlMat);
      hl2.position.set(0.4, 0.35, 1.12);
      busGroup.add(hl1, hl2);

      scene.add(busGroup);
      ambientBuses.push({
        group: busGroup,
        progress: bIdx * 0.48,
        speed: 0.0006 + bIdx * 0.0002,
        color: col,
      });
    });

    // Camera Navigation, Orbit, Pan, and Smooth Lerp Targets
    let targetCameraPos = new THREE.Vector3(22, 28, 42);
    let targetLookAt = new THREE.Vector3(0, 1.5, 0);
    let isUserDragging = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let spherical = new THREE.Spherical(50, Math.PI / 3.4, Math.PI / 4);

    // Function to smoothly glide camera to focus on a level station
    const focusCameraOnLevel = (levelId: number) => {
      const found = stationTransforms.find((st) => st.levelId === levelId);
      if (found) {
        targetLookAt.copy(found.pos).add(new THREE.Vector3(0, 1.5, 0));
        // Position camera in close comfortable isometric angle
        targetCameraPos.set(found.pos.x + 12, found.pos.y + 14, found.pos.z + 16);
      }
    };
    focusOnLevelRef.current = focusCameraOnLevel;

    // Reset camera to wide overview angle
    const resetOverviewCamera = () => {
      targetLookAt.set(0, 1.5, 0);
      targetCameraPos.set(22, 32, 44);
    };
    resetOverviewCameraRef.current = resetOverviewCamera;

    // Zoom camera in/out
    const zoomCamera = (delta: number) => {
      spherical.radius = Math.max(14, Math.min(280, spherical.radius + delta));
      const offset = new THREE.Vector3().setFromSpherical(spherical);
      targetCameraPos.copy(targetLookAt).add(offset);
    };
    zoomCameraRef.current = zoomCamera;

    // Center on the active level on initial mount
    if (selectedStationLevelId) {
      focusCameraOnLevel(selectedStationLevelId);
    }

    // Pointer Event Handlers (Differentiating camera drag from station tap)
    const dom = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isUserDragging = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isUserDragging) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      // Orbit camera horizontally and vertically (full 360 enabled, no vertical lock)
      spherical.theta -= dx * 0.006;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.05, spherical.phi - dy * 0.005));

      const offset = new THREE.Vector3().setFromSpherical(spherical);
      targetCameraPos.copy(targetLookAt).add(offset);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isUserDragging) return;
      isUserDragging = false;

      const totalDist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
      // If movement is very small, treat as a TAP / CLICK on a station!
      if (totalDist < 8) {
        const rect = dom.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(stationInteractableMeshes, false);

        if (intersects.length > 0) {
          const hit = intersects[0];
          const hitLevelId = hit.object.userData?.levelId;
          if (hitLevelId) {
            sounds.playClick();
            setSelectedStationLevelId(hitLevelId);
            focusCameraOnLevel(hitLevelId);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.08;
      spherical.radius = Math.max(14, Math.min(280, spherical.radius + zoomDelta));
      const offset = new THREE.Vector3().setFromSpherical(spherical);
      targetCameraPos.copy(targetLookAt).add(offset);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Main 60FPS Render & Animation Loop
    let animFrameId: number;
    let clockTime = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      clockTime += 0.016;

      // 1. Smooth Camera Lerp
      camera.position.lerp(targetCameraPos, 0.08);
      cameraTarget.lerp(targetLookAt, 0.08);
      camera.lookAt(cameraTarget);

      // 2. Animate Stars and mini hero bus hovering
      starMeshesToAnimate.forEach(({ mesh, baseY, phase }) => {
        mesh.position.y = baseY + Math.sin(clockTime * 2.5 + phase) * 0.15;
        mesh.rotation.y += 0.02;
      });

      // 3. Animate Beacon Cylinder & Pulsing Ring
      if (beaconToAnimate) {
        beaconToAnimate.rotation.y += 0.015;
      }
      if (beaconRingToAnimate) {
        const pulseScale = 1.0 + Math.sin(clockTime * 3.0) * 0.25;
        beaconRingToAnimate.scale.set(pulseScale, pulseScale, 1.0);
      }

      // 4. Animate Ambient Buses along the winding road
      const zAxis = new THREE.Vector3(0, 0, 1);
      ambientBuses.forEach((b) => {
        b.progress = (b.progress + b.speed) % 1.0;
        const pt = roadSpline.getPoint(b.progress);
        const tangent = roadSpline.getTangent(b.progress);

        b.group.position.set(pt.x, pt.y + 0.12, pt.z);
        b.group.quaternion.setFromUnitVectors(zAxis, tangent);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Clean up on component unmount
    return () => {
      cancelAnimationFrame(animFrameId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);

      disposeHierarchy(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeWorldId, activeChapterIndex, worldConfig, chapterLevels, unlockedLevelId, progressStars]);

  // Handlers for switching worlds and chapters
  const handleSelectWorld = (worldId: number) => {
    sounds.playClick();
    setActiveWorldId(worldId);
    setActiveChapterIndex(1);
    const firstLevelInWorld = (worldId - 1) * 125 + 1;
    setSelectedStationLevelId(firstLevelInWorld);
    focusOnLevelRef.current?.(firstLevelInWorld);
  };

  const handleSelectChapter = (chapterIdx: number) => {
    sounds.playClick();
    setActiveChapterIndex(chapterIdx);
    const firstLevelInChapter = (activeWorldId - 1) * 125 + (chapterIdx - 1) * 25 + 1;
    setSelectedStationLevelId(firstLevelInChapter);
    focusOnLevelRef.current?.(firstLevelInChapter);
  };

  const minChapterLevel = (activeWorldId - 1) * 125 + (activeChapterIndex - 1) * 25 + 1;
  const maxChapterLevel = minChapterLevel + 24;

  const handlePrevStation = () => {
    if (selectedStationLevelId > minChapterLevel) {
      sounds.playClick();
      const prev = selectedStationLevelId - 1;
      setSelectedStationLevelId(prev);
      focusOnLevelRef.current?.(prev);
    }
  };

  const handleNextStation = () => {
    if (selectedStationLevelId < maxChapterLevel) {
      sounds.playClick();
      const next = selectedStationLevelId + 1;
      setSelectedStationLevelId(next);
      focusOnLevelRef.current?.(next);
    }
  };

  const getWorldStars = (worldId: number) => {
    const start = (worldId - 1) * 125 + 1;
    const end = worldId * 125;
    let s = 0;
    for (let l = start; l <= end; l++) {
      s += progressStars[l] || 0;
    }
    return s;
  };

  const chapterCompletedCount = useMemo(() => {
    return chapterLevels.filter((lvl) => lvl.id < unlockedLevelId).length;
  }, [chapterLevels, unlockedLevelId]);

  const totalStars = Object.values(progressStars).reduce((a, b) => a + b, 0);
  const isLevelUnlocked = selectedStationLevelId <= unlockedLevelId;
  const selectedLevelStars = progressStars[selectedStationLevelId] || 0;
  const isSelectedLevelCompleted = selectedStationLevelId < unlockedLevelId;

  return (
    <div className="relative w-full h-full overflow-hidden select-none touch-none bg-slate-950 font-['Fredoka',sans-serif]">
      {/* 1. Full-Viewport 3D Three.js Adventure World Canvas */}
      <div ref={containerRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* 2. Top Sleek Game Navigation Header (Clean single row) */}
      <div className="absolute top-0 inset-x-0 z-20 p-2.5 sm:p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none">
        <div className="flex items-center justify-between gap-2 max-w-6xl mx-auto w-full">
          {/* Back to Home Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onBackToHome();
            }}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-black text-xs shadow-xl active:scale-95 transition-all"
            title="Back to Depot"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">Depot</span>
          </button>

          {/* Active District & Chapter Floating Badge */}
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 sm:px-4 py-1.5 rounded-2xl shadow-xl">
            <span className="text-base sm:text-lg animate-bounce">{worldConfig.icon}</span>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  DISTRICT {activeWorldId}
                </span>
                <span className="text-slate-500 text-[10px]">â€¢</span>
                <span className="text-[10px] font-bold text-amber-400">
                  CH {activeChapterIndex}/5
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-white leading-tight">
                {worldConfig.name} <span className="text-slate-400 font-normal hidden sm:inline">â€” {worldConfig.chapters[activeChapterIndex - 1]}</span>
              </div>
            </div>
          </div>

          {/* Currency & Stars Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {/* Stars Pill */}
            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-2xl shadow-xl">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-black text-amber-300">
                {totalStars}
              </span>
            </div>

            {/* Coins Pill */}
            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-2xl shadow-xl">
              <span className="text-xs">ðŸª™</span>
              <span className="text-xs font-black text-amber-200">
                {coins.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Soft-Type Left Side Road & District Progression Dock */}
      <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-auto flex flex-col items-start select-none">
        {!isSideRailExpanded ? (
          /* Minimized Floating Road Pill */
          <button
            onClick={() => {
              sounds.playClick();
              setIsSideRailExpanded(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-2xl border-2 border-white/20 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-all group"
            title="Expand Roadmap"
          >
            <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md animate-bounce">
              ðŸ›£ï¸
            </div>
            <div className="text-left pr-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-sky-400 block">
                ROAD TRACK
              </span>
              <span className="text-xs font-black text-white">
                Lvl {selectedStationLevelId} â–¶
              </span>
            </div>
          </button>
        ) : (
          /* Expanded Soft Deluxe Road Progression Panel */
          <div className="w-64 sm:w-72 max-h-[82vh] bg-slate-900/90 backdrop-blur-2xl border-2 border-white/20 rounded-3xl p-3 shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Dock Header with Soft Tabs & Minimize Chevron */}
            <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-2xl border border-white/10">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setSideTab('road');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                    sideTab === 'road'
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>ROAD</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setSideTab('worlds');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                    sideTab === 'worlds'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>WORLDS</span>
                </button>
              </div>

              {/* Minimize Collapse Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsSideRailExpanded(false);
                }}
                className="w-7 h-7 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center font-bold text-xs active:scale-95 transition-colors"
                title="Minimize Roadmap"
              >
                â—€
              </button>
            </div>

            {/* TAB 1: ROAD PROGRESSION TRACK */}
            {sideTab === 'road' && (
              <div className="flex flex-col gap-2">
                {/* Chapter Road Progress Metric */}
                <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-black mb-1">
                    <span className="text-sky-300 truncate">
                      {worldConfig.icon} {worldConfig.name} â€¢ Ch {activeChapterIndex}
                    </span>
                    <span className="text-amber-400 font-mono text-[10px]">
                      {chapterCompletedCount}/25
                    </span>
                  </div>
                  {/* Soft Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${(chapterCompletedCount / 25) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Vertical Scrollable Station Road Ribbon */}
                <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                  {chapterLevels.map((lvl, idx) => {
                    const stId = lvl.id;
                    const isStCompleted = stId < unlockedLevelId;
                    const isStCurrent = stId === unlockedLevelId;
                    const isStSelected = stId === selectedStationLevelId;
                    const isStLocked = stId > unlockedLevelId;
                    const stStars = progressStars[stId] || 0;
                    const isMilestone = (idx + 1) % 5 === 0;

                    return (
                      <button
                        key={stId}
                        onClick={() => {
                          sounds.playClick();
                          setSelectedStationLevelId(stId);
                          focusOnLevelRef.current?.(stId);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-2xl border transition-all text-left active:scale-95 ${
                          isStSelected
                            ? 'bg-gradient-to-r from-sky-500/30 to-blue-500/20 border-sky-400/80 shadow-md ring-2 ring-sky-400/30'
                            : isStCurrent
                            ? 'bg-amber-500/20 border-amber-400/60 shadow-sm'
                            : isStCompleted
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-slate-950/40 border-white/5 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Station Bubble */}
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                              isStCurrent
                                ? 'bg-amber-400 text-slate-950 border-white shadow-md animate-pulse'
                                : isStCompleted
                                ? 'bg-emerald-500 text-white border-emerald-300'
                                : 'bg-slate-800 text-slate-400 border-white/10'
                            }`}
                          >
                            {isStCurrent ? 'ðŸšŒ' : isStCompleted ? 'âœ“' : stId}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white truncate">
                                Level {stId}
                              </span>
                              {isMilestone && (
                                <span className="text-[10px] text-amber-300" title="Milestone Reward">
                                  ðŸŽ
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {lvl.name}
                            </span>
                          </div>
                        </div>

                        {/* Right Stars / Lock Pill */}
                        <div className="shrink-0 flex items-center gap-0.5 ml-1">
                          {isStCompleted ? (
                            <div className="flex items-center gap-0.5 text-[10px] font-black text-amber-300">
                              <span>â­</span>
                              <span>{stStars || 3}</span>
                            </div>
                          ) : isStLocked ? (
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400/30 text-amber-300 border border-amber-400/40">
                              PLAY
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: WORLDS LIST */}
            {sideTab === 'worlds' && (
              <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                {Object.values(WORLD_THEMES).map((w) => {
                  const isWActive = activeWorldId === w.id;
                  const isWUnlocked = unlockedLevelId >= w.unlockRequirementLevel;
                  const wStars = getWorldStars(w.id);

                  return (
                    <button
                      key={w.id}
                      onClick={() => handleSelectWorld(w.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-2xl border transition-all text-left active:scale-95 ${
                        isWActive
                          ? 'bg-gradient-to-r from-sky-500/30 to-blue-500/20 border-sky-400/80 shadow-md ring-2 ring-sky-400/30'
                          : isWUnlocked
                          ? 'bg-slate-950/60 border-white/10 hover:bg-slate-800'
                          : 'bg-slate-950/30 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{w.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-sky-400">
                              District {w.id}
                            </span>
                            {!isWUnlocked && (
                              <span className="text-[9px] text-amber-400 font-bold bg-amber-500/20 px-1 rounded">
                                Lvl {w.unlockRequirementLevel}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-white block truncate">
                            {w.name}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right ml-1">
                        <span className="text-[10px] font-black text-amber-300 block">
                          â­ {wStars}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Chapter Stepper */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                disabled={activeChapterIndex <= 1}
                onClick={() => handleSelectChapter(activeChapterIndex - 1)}
                className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-white/10 text-white flex items-center justify-center active:scale-95 text-xs font-bold transition-colors"
                title="Previous Chapter"
              >
                â€¹
              </button>
              <div className="text-center">
                <span className="text-[11px] font-black text-amber-300 block leading-tight">
                  Chapter {activeChapterIndex} of 5
                </span>
                <span className="text-[9px] text-slate-400 block leading-tight truncate max-w-[140px]">
                  {worldConfig.chapters[activeChapterIndex - 1]}
                </span>
              </div>
              <button
                disabled={activeChapterIndex >= 5}
                onClick={() => handleSelectChapter(activeChapterIndex + 1)}
                className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-white/10 text-white flex items-center justify-center active:scale-95 text-xs font-bold transition-colors"
                title="Next Chapter"
              >
                â€º
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Soft-Type Right Side Tactical Camera Dock */}
      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-auto flex flex-col items-center select-none">
        <div className="bg-slate-900/85 backdrop-blur-2xl border-2 border-white/20 rounded-full p-1.5 sm:p-2 shadow-[0_12px_36px_rgba(0,0,0,0.5)] flex flex-col items-center gap-2">
          {/* Focus Active Station */}
          <div className="relative group">
            <button
              onClick={() => {
                sounds.playClick();
                setSelectedStationLevelId(unlockedLevelId);
                focusOnLevelRef.current?.(unlockedLevelId);
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/80 hover:bg-slate-750 text-amber-400 border border-white/10 hover:border-amber-400/40 flex items-center justify-center active:scale-90 shadow-md transition-all duration-200"
              title="Focus on Active Level"
            >
              <Crosshair className="w-4 h-4 text-amber-400" />
            </button>
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl px-3 py-1.5 shadow-2xl whitespace-nowrap z-30 pointer-events-none text-xs font-bold text-amber-300">
              Focus Active Station
            </div>
          </div>

          {/* Overview Angle */}
          <div className="relative group">
            <button
              onClick={() => {
                sounds.playClick();
                resetOverviewCameraRef.current?.();
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/80 hover:bg-slate-750 text-sky-400 border border-white/10 hover:border-sky-400/40 flex items-center justify-center active:scale-90 shadow-md transition-all duration-200"
              title="Overview Angle"
            >
              <Compass className="w-4 h-4 text-sky-400" />
            </button>
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl px-3 py-1.5 shadow-2xl whitespace-nowrap z-30 pointer-events-none text-xs font-bold text-sky-300">
              Overview Angle
            </div>
          </div>

          {/* Zoom In */}
          <div className="relative group">
            <button
              onClick={() => {
                sounds.playClick();
                zoomCameraRef.current?.(-8);
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/80 hover:bg-slate-700 text-emerald-300 hover:text-white border border-white/10 hover:border-emerald-400/30 flex items-center justify-center active:scale-90 shadow-md transition-all duration-200"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl px-3 py-1.5 shadow-2xl whitespace-nowrap z-30 pointer-events-none text-xs font-bold text-slate-200">
              Zoom In
            </div>
          </div>

          {/* Zoom Out */}
          <div className="relative group">
            <button
              onClick={() => {
                sounds.playClick();
                zoomCameraRef.current?.(8);
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 hover:border-white/30 flex items-center justify-center active:scale-90 shadow-md transition-all duration-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl px-3 py-1.5 shadow-2xl whitespace-nowrap z-30 pointer-events-none text-xs font-bold text-slate-200">
              Zoom Out
            </div>
          </div>

          {/* Milestone Station */}
          <div className="relative group">
            <button
              onClick={() => {
                sounds.playClick();
                const milestoneLevel = minChapterLevel + 24;
                setSelectedStationLevelId(milestoneLevel);
                focusOnLevelRef.current?.(milestoneLevel);
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-2 border-white flex items-center justify-center active:scale-90 shadow-md shadow-amber-500/40 transition-all duration-200"
              title="Chapter Milestone"
            >
              <Trophy className="w-4 h-4" />
            </button>
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl px-3 py-1.5 shadow-2xl whitespace-nowrap z-30 pointer-events-none text-xs font-bold text-amber-300">
              Chapter Milestone (Lvl {minChapterLevel + 24})
            </div>
          </div>
        </div>
      </div>

      {/* 5. Floating Bottom Mission Launcher Island (Compact & Premium) */}
      <div className="absolute bottom-2.5 sm:bottom-4 inset-x-0 z-20 px-3 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-sm sm:max-w-md bg-slate-950/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] space-y-2 sm:space-y-2.5">
          {/* Header row with Station Chevrons */}
          <div className="flex items-center justify-between gap-2">
            {/* Prev Station button */}
            <button
              onClick={handlePrevStation}
              disabled={selectedStationLevelId <= minChapterLevel}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-white flex items-center justify-center active:scale-95 shadow shrink-0"
              title="Previous Station"
            >
              <ChevronLeft className="w-4 h-4 text-sky-400" />
            </button>

            {/* Station Title & Status */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl shrink-0 flex items-center justify-center font-black text-xs sm:text-sm shadow-md border ${
                  isSelectedLevelCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : isLevelUnlocked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 ring-1 ring-amber-400/30'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {isSelectedLevelCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isLevelUnlocked ? (
                  <span>{selectedStationLevelId}</span>
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>

              <div className="text-left min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate leading-tight">
                    Level {selectedStationLevelId}: {selectedLevelData.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400">
                  <span>District {activeWorldId}</span>
                  <span className="text-slate-600">â€¢</span>
                  <span className="text-amber-400">Ch {activeChapterIndex}</span>
                  <span className="text-slate-600">â€¢</span>
                  <div className="flex items-center">
                    {[1, 2, 3].map((starNum) => (
                      <Star
                        key={starNum}
                        className={`w-2.5 h-2.5 ${
                          starNum <= selectedLevelStars
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Next Station button */}
            <button
              onClick={handleNextStation}
              disabled={selectedStationLevelId >= maxChapterLevel}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-white flex items-center justify-center active:scale-95 shadow shrink-0"
              title="Next Station"
            >
              <ChevronRight className="w-4 h-4 text-sky-400" />
            </button>
          </div>

          {/* Level Objectives & Metrics Compact Bar */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl py-1 px-1.5">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">Moves</span>
              <span className="font-mono font-black text-amber-300">
                {selectedLevelData.parMoves}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl py-1 px-1.5">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">Time</span>
              <span className="font-mono font-black text-sky-300">
                {selectedLevelData.timeLimit}s
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl py-1 px-1.5">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">Reward</span>
              <span className="font-mono font-black text-emerald-300">
                +{150 + selectedStationLevelId * 25} ðŸª™
              </span>
            </div>
          </div>

          {/* Play Level Action Button */}
          {isLevelUnlocked ? (
            <button
              onClick={() => {
                sounds.playClick();
                onSelectLevel(selectedStationLevelId, selectedDifficulty, selectedGameMode);
              }}
              className="w-full py-2.5 sm:py-3 rounded-2xl game-btn game-btn-emerald text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform border border-emerald-400/40"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              <span>PLAY LEVEL {selectedStationLevelId}</span>
            </button>
          ) : (
            <button
              disabled
              className="w-full py-2.5 sm:py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>LOCKED â€¢ REACH LEVEL {unlockedLevelId}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
