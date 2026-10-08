import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Direction, GameState, GameStatus, PassengerState, VehicleColor, VehicleState, VehicleStateType, COLOR_MAP } from '../logic/types.ts';
import { sounds } from '../utils/soundEffects.ts';

interface BusMadnessArenaProps {
  gameState: GameState;
  onVehicleTapRequest: (vehicleId: string) => void;
  onVehicleArrivedAtDock: (vehicleId: string, dockIndex: number) => void;
  onDockUnlockClicked: () => void;
  activeHintId: string | null;
  isCompleted?: boolean;
  onConfettiComplete?: () => void;
}

const DOCK_X_POSITIONS = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
const DOCK_Z = -6.8;
const CELL_SIZE = 2.2;
const GRID_OFFSET_Z = 4.5;

function gridToWorld(row: number, col: number, length: number, direction: Direction): { x: number; z: number } {
  const isHorizontal = direction === Direction.LEFT || direction === Direction.RIGHT;
  if (isHorizontal) {
    const centerCol = col + (length - 1) / 2;
    return {
      x: (centerCol - 3) * CELL_SIZE,
      z: (row - 3) * CELL_SIZE + GRID_OFFSET_Z,
    };
  } else {
    const centerRow = row + (length - 1) / 2;
    return {
      x: (col - 3) * CELL_SIZE,
      z: (centerRow - 3) * CELL_SIZE + GRID_OFFSET_Z,
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

export const BusMadnessArena: React.FC<BusMadnessArenaProps> = ({
  gameState,
  onVehicleTapRequest,
  onVehicleArrivedAtDock,
  onDockUnlockClicked,
  activeHintId,
  isCompleted = false,
  onConfettiComplete,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

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
  const hintBeaconRef = useRef<THREE.Group | null>(null);
  const blockerFlashRef = useRef<{ id: string; until: number } | null>(null);

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
    scene.background = new THREE.Color(0xdce7f6);
    scene.fog = new THREE.FogExp2(0xdce7f6, 0.015);

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.5, 160);
    camera.position.set(0, 25, 20);
    camera.lookAt(0, 0, 1.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffef0, 1.4);
    sunLight.position.set(16, 32, 16);
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

    const skyFill = new THREE.DirectionalLight(0xbcd7f8, 0.5);
    skyFill.position.set(-14, 14, -12);
    scene.add(skyFill);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(70, 70);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    // Terminal Station Facade
    const stationGroup = new THREE.Group();
    stationGroup.position.set(0, 0, -11.5);

    const buildingGeo = new THREE.BoxGeometry(24, 4.5, 4);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.set(0, 2.25, -2);
    building.castShadow = true;
    stationGroup.add(building);

    const roofEave = new THREE.Mesh(
      new THREE.BoxGeometry(24.4, 0.5, 4.6),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
    );
    roofEave.position.set(0, 4.6, -1.9);
    stationGroup.add(roofEave);

    const sidewalkGeo = new THREE.BoxGeometry(24, 0.3, 3.2);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(0, 0.15, 1.6);
    sidewalk.receiveShadow = true;
    stationGroup.add(sidewalk);
    scene.add(stationGroup);

    // Waiting Docks Road
    const roadStrip = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.18, 5.8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    roadStrip.position.set(0, 0.09, DOCK_Z);
    roadStrip.receiveShadow = true;
    scene.add(roadStrip);

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

    // Main Parking Grid Asphalt Pad
    const puzzlePad = new THREE.Mesh(
      new THREE.BoxGeometry(19, 0.18, 19),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 })
    );
    puzzlePad.position.set(0, 0.09, GRID_OFFSET_Z);
    puzzlePad.receiveShadow = true;
    scene.add(puzzlePad);

    // Grid Floor Markings (Grid Lines)
    const gridHelper = new THREE.GridHelper(15.4, 7, 0x64748b, 0x334155);
    gridHelper.position.set(0, 0.19, GRID_OFFSET_Z);
    scene.add(gridHelper);

    // Passengers Group
    const passengersGroup = new THREE.Group();
    passengersGroupRef.current = passengersGroup;
    scene.add(passengersGroup);

    // Hint Spotlight Beam
    const hintGroup = new THREE.Group();
    hintBeaconRef.current = hintGroup;
    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.6, 7, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
    );
    beaconBeam.position.y = 3.5;
    hintGroup.add(beaconBeam);
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

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check click on unlocked bay lock icon
      DOCK_X_POSITIONS.forEach((dx, idx) => {
        if (idx >= gameStateRef.current.unlockedDocksCount) {
          const lockObj = scene.getObjectByName(`dock_lock_${idx}`);
          if (lockObj) {
            const hits = raycaster.intersectObjects(lockObj.children, true);
            if (hits.length > 0) {
              onDockUnlockClicked();
              return;
            }
          }
        }
      });

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
          onVehicleTapRequest(vid);
        }
      }
    };

    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });

    // Camera Orbit Drag
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let spherical = { radius: 32, theta: 0, phi: Math.PI / 4.2 };

    const onMouseDownDrag = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMoveDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = (e.clientX - prevMousePos.x) * 0.004;
      const dy = (e.clientY - prevMousePos.y) * 0.004;
      prevMousePos = { x: e.clientX, y: e.clientY };

      spherical.theta = Math.max(-0.4, Math.min(0.4, spherical.theta - dx));
      spherical.phi = Math.max(0.45, Math.min(Math.PI / 2.4, spherical.phi - dy));

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = 1.2 + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0, 1.2);
    };

    const onMouseUpDrag = () => {
      isDragging = false;
    };

    container.addEventListener('mousemove', onMouseMoveDrag);
    window.addEventListener('mouseup', onMouseUpDrag);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Stickman idle bobbing
      if (passengersGroupRef.current) {
        passengersGroupRef.current.children.forEach((child, idx) => {
          const bob = Math.abs(Math.sin(elapsed * 4 + idx * 0.6)) * 0.12;
          child.position.y = 0.35 + bob;
        });
      }

      // Hint beacon
      if (hintBeaconRef.current && hintRef.current) {
        const mesh = vehicleMeshesRef.current.get(hintRef.current);
        if (mesh && mesh.visible) {
          hintBeaconRef.current.visible = true;
          hintBeaconRef.current.position.set(mesh.position.x, 0.2, mesh.position.z);
          hintBeaconRef.current.rotation.y += delta * 2;
        } else {
          hintBeaconRef.current.visible = false;
        }
      } else if (hintBeaconRef.current) {
        hintBeaconRef.current.visible = false;
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

      // Active vehicle driving animations
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
          } else if (anim.progress < 1.0) {
            const t = (anim.progress - 0.35) / 0.65;
            group.position.x = anim.startPos.x + anim.forwardDir.x * 0.45 * (1 - t);
            group.position.z = anim.startPos.z + anim.forwardDir.z * 0.45 * (1 - t);
          } else {
            group.position.copy(anim.startPos);
            delete activeAnimRef.current[vid];
          }
        } else if (anim.type === 'drive_to_dock') {
          const t = Math.min(anim.progress, 1);
          const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

          if (anim.waypoints && anim.waypoints.length > 0) {
            const totalSegments = anim.waypoints.length;
            const segmentT = easeT * totalSegments;
            const segIdx = Math.min(Math.floor(segmentT), totalSegments - 1);
            const subT = segmentT - segIdx;

            const p0 = segIdx === 0 ? anim.startPos : anim.waypoints[segIdx - 1];
            const p1 = anim.waypoints[segIdx];

            group.position.lerpVectors(p0, p1, subT);

            const moveDelta = new THREE.Vector3().subVectors(p1, p0).normalize();
            if (moveDelta.lengthSq() > 0.01) {
              const targetYaw = Math.atan2(moveDelta.x, -moveDelta.z);
              group.rotation.y = targetYaw;
            }
          }

          if (anim.progress >= 1.0) {
            const finalPos = anim.waypoints ? anim.waypoints[anim.waypoints.length - 1] : anim.startPos;
            group.position.copy(finalPos);
            group.rotation.y = 0; // Parked bus faces North
            delete activeAnimRef.current[vid];
            if (anim.dockIdx !== undefined) {
              onVehicleArrivedAtDock(vid, anim.dockIdx);
            }
          }
        }
      });

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
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handlePointerDown);
      container.removeEventListener('touchstart', handlePointerDown);
      container.removeEventListener('mousemove', onMouseMoveDrag);
      window.removeEventListener('mouseup', onMouseUpDrag);

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

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update/rebuild vehicles when gameState.vehicles changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    vehicleMeshesRef.current.forEach((g) => scene.remove(g));
    vehicleMeshesRef.current.clear();

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    gameState.vehicles.forEach((v) => {
      if (v.state === VehicleStateType.EXITED) return;

      const vGroup = new THREE.Group();
      const length3D = v.length * 1.05;
      const width3D = 1.6;
      const height3D = v.type === 'BUS' ? 1.35 : 1.0;

      // Position
      if (v.state === VehicleStateType.DOCKED && v.dockIndex !== undefined) {
        const dockX = DOCK_X_POSITIONS[v.dockIndex];
        vGroup.position.set(dockX, 0.72, DOCK_Z);
        vGroup.rotation.y = 0;
      } else {
        const worldPos = gridToWorld(v.gridPosition.row, v.gridPosition.col, v.length, v.direction);
        vGroup.position.set(worldPos.x, 0.72, worldPos.z);
        vGroup.rotation.y = directionToAngle(v.direction);
      }

      vGroup.userData = { vehicleId: v.id };

      const hex = COLOR_MAP[v.color].hex;

      // Body
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.28,
        metalness: 0.25,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(width3D, height3D * 0.75, length3D), bodyMat);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData = { vehicleId: v.id, originalColor: hex };
      vGroup.add(body);

      // Cabin Roof
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.15,
        metalness: 0.35,
      });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width3D * 0.88, height3D * 0.55, length3D * 0.82), cabinMat);
      cabin.position.set(0, height3D * 0.45, -0.05);
      cabin.castShadow = true;
      cabin.userData = { vehicleId: v.id };
      vGroup.add(cabin);

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

      // Passenger Capacity Spheres on Roof
      if (v.loadedPassengers > 0) {
        const pSphereMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex) });
        for (let pIdx = 0; pIdx < v.loadedPassengers; pIdx++) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), pSphereMat);
          const zOff = -length3D * 0.25 + pIdx * (length3D * 0.25);
          sphere.position.set(0, height3D * 0.88, zOff);
          sphere.castShadow = true;
          vGroup.add(sphere);
        }
      }

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 12);
      const wx = width3D * 0.52;
      const wz = length3D * 0.32;
      [
        [wx, -height3D * 0.25, wz],
        [-wx, -height3D * 0.25, wz],
        [wx, -height3D * 0.25, -wz],
        [-wx, -height3D * 0.25, -wz],
      ].forEach(([x, y, z]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, y, z);
        w.castShadow = true;
        vGroup.add(w);
      });

      scene.add(vGroup);
      vehicleMeshesRef.current.set(v.id, vGroup);
    });
  }, [gameState.vehicles]);

  // Update Stickmen queue
  useEffect(() => {
    const pGroup = passengersGroupRef.current;
    if (!pGroup) return;

    while (pGroup.children.length > 0) {
      pGroup.remove(pGroup.children[0]);
    }

    const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const bodyGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.5, 10);

    const waiting = gameState.passengers.filter((p) => p.state === 'WAITING');

    waiting.slice(0, 12).forEach((p, idx) => {
      const person = new THREE.Group();
      person.position.set(-6.5 + idx * 1.1, 0.35, -10.0);

      const hex = COLOR_MAP[p.color].hex;
      const pMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.35 });

      const b = new THREE.Mesh(bodyGeo, pMat);
      b.position.y = 0.25;
      b.castShadow = true;

      const h = new THREE.Mesh(headGeo, pMat);
      h.position.y = 0.65;
      h.castShadow = true;

      person.add(b, h);
      pGroup.add(person);
    });
  }, [gameState.passengers]);

  // Trigger Bump Animation externally
  const triggerBump = (vid: string, blockerId: string | null) => {
    const mesh = vehicleMeshesRef.current.get(vid);
    if (!mesh) return;

    sounds.playBlocked();

    // Flash blocker vehicle in bright red
    if (blockerId) {
      const blkMesh = vehicleMeshesRef.current.get(blockerId);
      if (blkMesh) {
        blkMesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.color.set(0xff2222);
          }
        });
        blockerFlashRef.current = { id: blockerId, until: Date.now() + 600 };
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
    const dockTarget = new THREE.Vector3(dockX, 0.72, DOCK_Z);
    const waypoints: THREE.Vector3[] = [];

    if (v.direction === Direction.UP) {
      waypoints.push(new THREE.Vector3(dockX, 0.72, -4.5));
      waypoints.push(dockTarget);
    } else if (v.direction === Direction.RIGHT) {
      waypoints.push(new THREE.Vector3(12.5, 0.72, mesh.position.z));
      waypoints.push(new THREE.Vector3(12.5, 0.72, -4.5));
      waypoints.push(new THREE.Vector3(dockX, 0.72, -4.5));
      waypoints.push(dockTarget);
    } else if (v.direction === Direction.LEFT) {
      waypoints.push(new THREE.Vector3(-12.5, 0.72, mesh.position.z));
      waypoints.push(new THREE.Vector3(-12.5, 0.72, -4.5));
      waypoints.push(new THREE.Vector3(dockX, 0.72, -4.5));
      waypoints.push(dockTarget);
    } else {
      // DOWN
      const sideX = mesh.position.x >= 0 ? 12.5 : -12.5;
      waypoints.push(new THREE.Vector3(mesh.position.x, 0.72, 14.5));
      waypoints.push(new THREE.Vector3(sideX, 0.72, 14.5));
      waypoints.push(new THREE.Vector3(sideX, 0.72, -4.5));
      waypoints.push(new THREE.Vector3(dockX, 0.72, -4.5));
      waypoints.push(dockTarget);
    }

    activeAnimRef.current[vid] = {
      type: 'drive_to_dock',
      progress: 0,
      duration: 0.85,
      startPos: mesh.position.clone(),
      waypoints,
      forwardDir: new THREE.Vector3(0, 0, -1),
      dockIdx,
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
  });

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-3xl bg-gradient-to-b from-sky-100 via-blue-50 to-indigo-100">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
