import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface VehicleData {
  id: string;
  type: 'CAR' | 'BUS' | 'VAN';
  colorName: string;
  hex: string;
  position: { x: number; y: number; z: number };
  direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  state: 'PARKED' | 'SELECTED' | 'MOVING' | 'EXITED';
}

interface Phase1SceneProps {
  onSelectVehicle: (vehicle: VehicleData | null) => void;
  showGrid?: boolean;
}

export const Phase1Scene: React.FC<Phase1SceneProps> = ({ onSelectVehicle }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number; text: string } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vehicleGroupsRef = useRef<Map<string, { group: THREE.Group; data: VehicleData; bodyMat: THREE.MeshStandardMaterial; ringMat: THREE.MeshBasicMaterial }>>(new Map());
  const selectedIdRef = useRef<string | null>(null);
  const bounceTimeRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xe2e8f0);
    scene.fog = new THREE.FogExp2(0xe2e8f0, 0.025);

    // 2. Perspective Camera (matching LibGDX: FOV 55, pos [8, 12, 10], looking at [0, 0.5, 0])
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 100);
    camera.position.set(8, 12, 10);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with soft shadows and antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting setup (Ambient + Directional Sunlight)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.3);
    dirLight.position.set(10, 18, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
    fillLight.position.set(-8, 6, -6);
    scene.add(fillLight);

    // 5. Ground Plane & Asphalt Parking Lot Pad
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(26, 26, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    // 5b. Static 3D Parking Lot Asphalt Pad (12 x 0.15 x 12)
    const lotPadGeo = new THREE.BoxGeometry(12, 0.15, 12);
    const lotPadMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate asphalt
      roughness: 0.8,
      metalness: 0.1,
    });
    const lotPad = new THREE.Mesh(lotPadGeo, lotPadMat);
    lotPad.position.set(0, 0.075, 0);
    lotPad.receiveShadow = true;
    lotPad.castShadow = true;
    scene.add(lotPad);

    // Concrete curb border around parking lot
    const curbGeoH = new THREE.BoxGeometry(12.3, 0.22, 0.25);
    const curbGeoV = new THREE.BoxGeometry(0.25, 0.22, 12.3);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const backCurb = new THREE.Mesh(curbGeoH, curbMat);
    backCurb.position.set(0, 0.11, -6.05);
    const leftCurb = new THREE.Mesh(curbGeoV, curbMat);
    leftCurb.position.set(-6.05, 0.11, 0);
    const rightCurb = new THREE.Mesh(curbGeoV, curbMat);
    rightCurb.position.set(6.05, 0.11, 0);
    scene.add(backCurb, leftCurb, rightCurb);

    // 5c. Static 3D Parking Grid Floor Markings (Dividers, slot boundaries, exit arrows)
    const dividerGeo = new THREE.BoxGeometry(0.12, 0.02, 3.8);
    const whiteMarkingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const yellowMarkingMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

    // 4 Parking Bay Dividers (X: -4.4, -2.2, 0.0, 2.2, 4.4)
    const slotDividersX = [-4.4, -2.2, 0.0, 2.2, 4.4];
    slotDividersX.forEach((x) => {
      const divider = new THREE.Mesh(dividerGeo, whiteMarkingMat);
      divider.position.set(x, 0.16, 0);
      divider.receiveShadow = true;
      scene.add(divider);

      const capGeo = new THREE.BoxGeometry(0.4, 0.02, 0.12);
      const capFront = new THREE.Mesh(capGeo, whiteMarkingMat);
      capFront.position.set(x, 0.16, 1.9);
      const capBack = new THREE.Mesh(capGeo, whiteMarkingMat);
      capBack.position.set(x, 0.16, -1.9);
      scene.add(capFront, capBack);
    });

    // Yellow lines
    const backLineGeo = new THREE.BoxGeometry(9.0, 0.02, 0.14);
    const backLine = new THREE.Mesh(backLineGeo, yellowMarkingMat);
    backLine.position.set(0, 0.16, -1.9);
    backLine.receiveShadow = true;
    scene.add(backLine);

    const frontLineGeo = new THREE.BoxGeometry(9.0, 0.02, 0.14);
    const frontLine = new THREE.Mesh(frontLineGeo, yellowMarkingMat);
    frontLine.position.set(0, 0.16, 1.9);
    frontLine.receiveShadow = true;
    scene.add(frontLine);

    // Exit Direction Arrow on tarmac in front of parking bays
    const arrowShaftGeo = new THREE.BoxGeometry(0.24, 0.02, 1.2);
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, yellowMarkingMat);
    arrowShaft.position.set(0, 0.16, 3.4);
    scene.add(arrowShaft);

    const arrowHeadGeo = new THREE.ConeGeometry(0.45, 0.7, 3);
    const arrowHead = new THREE.Mesh(arrowHeadGeo, yellowMarkingMat);
    arrowHead.rotation.x = -Math.PI / 2;
    arrowHead.position.set(0, 0.16, 4.2);
    scene.add(arrowHead);

    // 5d. Decorative 3D Low-Poly Trees and Street Lamps
    const treeGroup = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.2, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const foliageLowerGeo = new THREE.ConeGeometry(1.2, 1.6, 6);
    const foliageUpperGeo = new THREE.ConeGeometry(0.9, 1.4, 6);
    const foliageMatA = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6, flatShading: true });
    const foliageMatB = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, flatShading: true });

    const createTree = (x: number, z: number, scale = 1.0) => {
      const singleTree = new THREE.Group();
      singleTree.position.set(x, 0, z);
      singleTree.scale.set(scale, scale, scale);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.6;
      trunk.castShadow = true;
      singleTree.add(trunk);

      const fLower = new THREE.Mesh(foliageLowerGeo, foliageMatA);
      fLower.position.y = 1.6;
      fLower.castShadow = true;
      fLower.receiveShadow = true;
      singleTree.add(fLower);

      const fUpper = new THREE.Mesh(foliageUpperGeo, foliageMatB);
      fUpper.position.y = 2.4;
      fUpper.rotation.y = 0.5;
      fUpper.castShadow = true;
      fUpper.receiveShadow = true;
      singleTree.add(fUpper);

      treeGroup.add(singleTree);
    };

    createTree(-4.8, -6.6, 1.1);
    createTree(-1.8, -6.8, 0.95);
    createTree(1.8, -6.8, 1.05);
    createTree(4.8, -6.6, 1.15);
    createTree(-6.8, 0.5, 1.0);
    createTree(6.8, 0.5, 1.0);
    scene.add(treeGroup);

    // Street Lamps
    const lampGroup = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.8, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const armGeo = new THREE.BoxGeometry(0.1, 0.1, 0.65);
    const fixtureGeo = new THREE.BoxGeometry(0.32, 0.18, 0.32);
    const fixtureMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });

    const createLamp = (x: number, z: number, armDirX: number) => {
      const lamp = new THREE.Group();
      lamp.position.set(x, 0, z);

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.4;
      pole.castShadow = true;
      lamp.add(pole);

      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(armDirX * 0.25, 2.7, 0);
      arm.rotation.y = Math.PI / 2;
      lamp.add(arm);

      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(armDirX * 0.55, 2.6, 0);
      lamp.add(fixture);

      const localLight = new THREE.PointLight(0xfef08a, 0.6, 4.5);
      localLight.position.set(armDirX * 0.55, 2.4, 0);
      lamp.add(localLight);

      lampGroup.add(lamp);
    };

    createLamp(-6.4, -3.2, 1);
    createLamp(-6.4, 3.8, 1);
    createLamp(6.4, -3.2, -1);
    createLamp(6.4, 3.8, -1);
    scene.add(lampGroup);

    // 6. PHASE 3: DEDICATED CAR ENTITY INSTANCES
    const INITIAL_VEHICLES: VehicleData[] = [
      { id: 'car_01', type: 'CAR', colorName: 'Royal Blue', hex: '#2563EB', position: { x: -3.3, y: 0.76, z: 0.0 }, direction: 'DOWN', state: 'PARKED' },
      { id: 'car_02', type: 'CAR', colorName: 'Coral Orange', hex: '#F97316', position: { x: -1.1, y: 0.76, z: 0.0 }, direction: 'DOWN', state: 'PARKED' },
      { id: 'car_03', type: 'CAR', colorName: 'Fresh Green', hex: '#10B981', position: { x: 1.1, y: 0.76, z: 0.0 }, direction: 'DOWN', state: 'PARKED' },
      { id: 'car_04', type: 'CAR', colorName: 'Violet Purple', hex: '#8B5CF6', position: { x: 3.3, y: 0.76, z: 0.0 }, direction: 'DOWN', state: 'PARKED' },
    ];

    const bodyGeo = new THREE.BoxGeometry(1.8, 0.9, 3.0);
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.6, 1.6);
    const lightGeo = new THREE.BoxGeometry(0.35, 0.18, 0.08);
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14);
    const ringGeo = new THREE.RingGeometry(1.6, 1.85, 32);

    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.2 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    vehicleGroupsRef.current.clear();

    INITIAL_VEHICLES.forEach((vData) => {
      const carGroup = new THREE.Group();
      carGroup.position.set(vData.position.x, vData.position.y, vData.position.z);
      carGroup.userData = { vehicleId: vData.id };

      // Vehicle Chassis with unique entity color
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(vData.hex),
        roughness: 0.3,
        metalness: 0.2,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      bodyMesh.userData = { vehicleId: vData.id };
      carGroup.add(bodyMesh);

      // Cabin / Roof
      const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
      cabinMesh.position.set(0, 0.6, -0.2);
      cabinMesh.castShadow = true;
      cabinMesh.userData = { vehicleId: vData.id };
      carGroup.add(cabinMesh);

      // Headlights
      const leftLight = new THREE.Mesh(lightGeo, lightMat);
      leftLight.position.set(0.6, -0.05, 1.51);
      const rightLight = new THREE.Mesh(lightGeo, lightMat);
      rightLight.position.set(-0.6, -0.05, 1.51);
      carGroup.add(leftLight, rightLight);

      // Taillights
      const leftTail = new THREE.Mesh(lightGeo, tailMat);
      leftTail.position.set(0.6, -0.05, -1.51);
      const rightTail = new THREE.Mesh(lightGeo, tailMat);
      rightTail.position.set(-0.6, -0.05, -1.51);
      carGroup.add(leftTail, rightTail);

      // Wheels
      const wheelPositions = [
        [0.98, -0.32, 0.9],
        [-0.98, -0.32, 0.9],
        [0.98, -0.32, -0.9],
        [-0.98, -0.32, -0.9],
      ];
      wheelPositions.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, wy, wz);
        wheel.castShadow = true;
        carGroup.add(wheel);
      });

      // Selection Ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const selectionRing = new THREE.Mesh(ringGeo, ringMat);
      selectionRing.rotation.x = -Math.PI / 2;
      selectionRing.position.y = -0.58;
      selectionRing.name = 'selectionRing';
      carGroup.add(selectionRing);

      scene.add(carGroup);
      vehicleGroupsRef.current.set(vData.id, {
        group: carGroup,
        data: { ...vData },
        bodyMat,
        ringMat,
      });
    });

    // Raycaster for Touch / Click handling across all vehicles
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Collect all vehicle children meshes
      const clickableMeshes: THREE.Object3D[] = [];
      vehicleGroupsRef.current.forEach(({ group }) => {
        clickableMeshes.push(...group.children);
      });

      const intersects = raycaster.intersectObjects(clickableMeshes, true);

      if (intersects.length > 0) {
        // Find which vehicle was clicked by traversing parent or userData
        let clickedVehicleId: string | null = null;
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj) {
          if (obj.userData?.vehicleId) {
            clickedVehicleId = obj.userData.vehicleId;
            break;
          }
          obj = obj.parent;
        }

        if (clickedVehicleId) {
          const currentSelectedId = selectedIdRef.current;
          const isSame = currentSelectedId === clickedVehicleId;

          // Deselect previous vehicle
          if (currentSelectedId) {
            const prevEntry = vehicleGroupsRef.current.get(currentSelectedId);
            if (prevEntry) {
              prevEntry.ringMat.opacity = 0;
              prevEntry.group.position.y = prevEntry.data.position.y;
              prevEntry.data.state = 'PARKED';
            }
          }

          if (isSame) {
            // Deselected
            selectedIdRef.current = null;
            setSelectedVehicleId(null);
            onSelectVehicle(null);
            setTouchFeedback({
              x: clientX - rect.left,
              y: clientY - rect.top,
              text: 'Deselected',
            });
          } else {
            // Select new vehicle
            selectedIdRef.current = clickedVehicleId;
            setSelectedVehicleId(clickedVehicleId);
            bounceTimeRef.current = 0;

            const newEntry = vehicleGroupsRef.current.get(clickedVehicleId);
            if (newEntry) {
              newEntry.ringMat.opacity = 0.85;
              newEntry.data.state = 'SELECTED';
              onSelectVehicle(newEntry.data);

              setTouchFeedback({
                x: clientX - rect.left,
                y: clientY - rect.top,
                text: `${newEntry.data.id} Selected!`,
              });
            }
          }
          setTimeout(() => setTouchFeedback(null), 1200);
        }
      }
    };

    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });

    // Camera orbit drag
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let spherical = { radius: 17.5, theta: Math.PI / 4, phi: Math.PI / 3.8 };

    const onMouseDownDrag = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMoveDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = (e.clientX - prevMousePos.x) * 0.005;
      const deltaY = (e.clientY - prevMousePos.y) * 0.005;
      prevMousePos = { x: e.clientX, y: e.clientY };

      spherical.theta -= deltaX;
      spherical.phi = Math.max(0.2, Math.min(Math.PI / 2.2, spherical.phi - deltaY));

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0.5, 0);
    };

    const onMouseUpDrag = () => {
      isDragging = false;
    };

    container.addEventListener('mousemove', onMouseMoveDrag);
    window.addEventListener('mouseup', onMouseUpDrag);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Animate bounce for selected vehicle
      const currentSelectedId = selectedIdRef.current;
      if (currentSelectedId) {
        const entry = vehicleGroupsRef.current.get(currentSelectedId);
        if (entry) {
          bounceTimeRef.current += delta * 6;
          const bounceOffset = Math.sin(bounceTimeRef.current) * 0.16;
          entry.group.position.y = entry.data.position.y + Math.max(0, bounceOffset);

          const ring = entry.group.getObjectByName('selectionRing') as THREE.Mesh;
          if (ring) {
            ring.rotation.z += delta * 2;
          }
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
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handlePointerDown);
      container.removeEventListener('touchstart', handlePointerDown);
      container.removeEventListener('mousemove', onMouseMoveDrag);
      window.removeEventListener('mouseup', onMouseUpDrag);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      groundGeo.dispose();
      bodyGeo.dispose();
      cabinGeo.dispose();
      wheelGeo.dispose();
    };
  }, [onSelectVehicle]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50/50 to-indigo-50/30">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Touch ripple indicator */}
      {touchFeedback && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all animate-bounce"
          style={{ left: touchFeedback.x, top: touchFeedback.y }}
        >
          <div className="px-3 py-1 rounded-full bg-slate-900/80 text-white font-semibold text-xs shadow-lg backdrop-blur-sm border border-white/20">
            {touchFeedback.text}
          </div>
        </div>
      )}

      {/* Floating Status Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200/80 text-xs font-medium text-slate-700 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Phase 3: 4 Car Entities Active</span>
        </div>

        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200/80 text-xs text-slate-600 pointer-events-auto">
          <span>Active:</span>
          <span className={selectedVehicleId ? 'font-bold text-orange-600' : 'font-semibold text-blue-600'}>
            {selectedVehicleId ? `${selectedVehicleId} (Selected)` : 'Tap Any Car to Select'}
          </span>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/85 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-slate-200/60 text-xs text-slate-500 pointer-events-none text-center">
        👆 Tap any parked Car to test entity selection • 🖱️ Orbit camera
      </div>
    </div>
  );
};
