import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sounds } from '../utils/soundEffects.ts';
import { buildDioramaVehicleMesh } from '../logic/vehicleModelFactory.ts';
import { PlayerProgress } from '../logic/playerProgress.ts';
import { LIVERIES, UNDERGLOWS, RIMS } from '../logic/garageCustomization.ts';
import { OrganicRoadSystem } from '../logic/organicRoadSystem.ts';

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

export const Home3DDepotScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [interactiveToast, setInteractiveToast] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.name = 'Home3DDepotScene';

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 150);
    camera.position.set(0, 14, 25);
    camera.lookAt(0, 0.6, -1.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.imageRendering = '-webkit-optimize-contrast';
    container.appendChild(renderer.domElement);

    // Warm Studio / Sunset Golden Hour Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffedd5, 0.55);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.65);
    scene.add(hemiLight);

    // Sun Key Light with PCFSoft shadows
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(16, 28, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.radius = 1.5;
    scene.add(sunLight);

    // Rim silhouette light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-16, 18, -16);
    scene.add(rimLight);

    // Point lights around depot terminal & street lamps
    const pointLights: THREE.PointLight[] = [];
    [
      [-10, 4.5, -4],
      [10, 4.5, -4],
      [-10, 4.5, 10],
      [10, 4.5, 10],
      [0, 5.0, -8],
    ].forEach(([px, py, pz], i) => {
      const pl = new THREE.PointLight(i === 4 ? 0x38bdf8 : 0xfbbf24, 1.8, 18, 1.8);
      pl.position.set(px, py, pz);
      scene.add(pl);
      pointLights.push(pl);
    });

    // -------------------------------------------------------------
    // DEPOT ENVIRONMENT & GEOMETRY
    // -------------------------------------------------------------
    const dioramaRoot = new THREE.Group();
    scene.add(dioramaRoot);

    // 1. Plinth / Showcase Skirt
    const plinthGeo = new THREE.BoxGeometry(44, 2.8, 38);
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.8, metalness: 0.1 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -1.42;
    plinth.receiveShadow = true;
    dioramaRoot.add(plinth);

    // Beveled plinth rim
    const rimGeo = new THREE.BoxGeometry(44.6, 0.22, 38.6);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
    const plinthRim = new THREE.Mesh(rimGeo, rimMat);
    plinthRim.position.y = -0.11;
    plinthRim.receiveShadow = true;
    dioramaRoot.add(plinthRim);

    // 2. Main Ground Asphalt Plate
    const groundGeo = new THREE.BoxGeometry(43.6, 0.18, 37.6);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.86, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = 0.08;
    ground.receiveShadow = true;
    dioramaRoot.add(ground);

    // 3. Modern Transit Terminal Concourse Building
    const terminalGroup = new THREE.Group();
    terminalGroup.position.set(0, 0, -10.5);

    const stationBuildingGeo = new THREE.BoxGeometry(28, 4.6, 4.2);
    const stationBuildingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.25 });
    const stationBuilding = new THREE.Mesh(stationBuildingGeo, stationBuildingMat);
    stationBuilding.position.set(0, 2.3, -2.1);
    stationBuilding.castShadow = true;
    terminalGroup.add(stationBuilding);

    // Tinted Glass Panes
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.08,
      metalness: 0.8,
    });
    [-10, -5, 0, 5, 10].forEach((gx) => {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 0.1), glassMat);
      pane.position.set(gx, 1.8, 0.02);
      terminalGroup.add(pane);
    });

    // Cantilevered Platform Canopy
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.78,
    });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(28.4, 0.22, 5.5), canopyMat);
    canopy.position.set(0, 4.6, 0.8);
    terminalGroup.add(canopy);

    // Canopy Pillars
    const trussMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.6 });
    [-12, -6, 0, 6, 12].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.6, 12), trussMat);
      pillar.position.set(px, 2.3, 3.2);
      pillar.castShadow = true;
      terminalGroup.add(pillar);
    });

    // Glowing LED Marquee Sign
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 0.15), signMat);
    sign.position.set(0, 4.0, 0.1);
    terminalGroup.add(sign);

    // Passenger Sidewalk Platform
    const platformGeo = new THREE.BoxGeometry(28, 0.32, 4.6);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.16, 2.3);
    platform.receiveShadow = true;
    terminalGroup.add(platform);

    // Yellow safety tactile edge
    const tactileEdge = new THREE.Mesh(
      new THREE.BoxGeometry(27.8, 0.05, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.4 })
    );
    tactileEdge.position.set(0, 0.34, 4.4);
    terminalGroup.add(tactileEdge);

    dioramaRoot.add(terminalGroup);

    // 4. Curved Sweeping Feeder Road System
    const mainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-18, 0.09, 12),
      new THREE.Vector3(-16, 0.09, 2),
      new THREE.Vector3(-10, 0.09, -4.5),
      new THREE.Vector3(0, 0.09, -5.2),
      new THREE.Vector3(10, 0.09, -4.5),
      new THREE.Vector3(16, 0.09, 2),
      new THREE.Vector3(18, 0.09, 12),
    ]);
    const mainRoadMesh = OrganicRoadSystem.createCurvedRoadMesh(mainCurve, 4.8, 48, 0x1a2333);
    const mainStripes = OrganicRoadSystem.createCurvedStripes(mainCurve, 0.22, 48, 0xfacc15);
    const mainOuterCurb = OrganicRoadSystem.createRaisedCurbMesh(mainCurve, 2.4, 0.35, 0.18, 48, 0x64748b);
    const mainInnerCurb = OrganicRoadSystem.createRaisedCurbMesh(mainCurve, -2.4, 0.35, 0.18, 48, 0x64748b);
    dioramaRoot.add(mainRoadMesh, mainStripes, mainOuterCurb, mainInnerCurb);

    // 5. Marked Bus Depot Parking Stalls
    const bayXs = [-7.5, -2.5, 2.5, 7.5];
    const bayLinesGroup = new THREE.Group();
    bayXs.forEach((bx) => {
      // White stall lines
      const lineGeo = new THREE.BoxGeometry(0.12, 0.02, 5.4);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const leftLine = new THREE.Mesh(lineGeo, lineMat);
      leftLine.position.set(bx - 1.25, 0.18, 2.4);
      const rightLine = new THREE.Mesh(lineGeo, lineMat);
      rightLine.position.set(bx + 1.25, 0.18, 2.4);

      // Yellow wheel stop bumper
      const bumperGeo = new THREE.BoxGeometry(1.8, 0.12, 0.22);
      const bumperMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      const bumper = new THREE.Mesh(bumperGeo, bumperMat);
      bumper.position.set(bx, 0.24, -0.2);
      bumper.castShadow = true;

      bayLinesGroup.add(leftLine, rightLine, bumper);
    });
    dioramaRoot.add(bayLinesGroup);

    // 6. Charming Diorama Trees & Street Lamps
    const createDioramaTree = (tx: number, tz: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0.18, tz);
      tree.scale.set(scale, scale, scale);

      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.4, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      tree.add(trunk);

      // Tiered foliage spheres
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65 });
      const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.6, 8), foliageMat);
      cone1.position.y = 1.8;
      cone1.castShadow = true;
      const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 8), foliageMat);
      cone2.position.y = 2.6;
      cone2.castShadow = true;
      tree.add(cone1, cone2);

      return tree;
    };

    [
      [-17, -8, 1.1],
      [-16, -3, 0.9],
      [17, -8, 1.1],
      [16, -3, 0.9],
      [-18, 8, 1.0],
      [18, 8, 1.0],
      [-12, 14, 0.85],
      [12, 14, 0.85],
    ].forEach(([tx, tz, s]) => {
      dioramaRoot.add(createDioramaTree(tx, tz, s));
    });

    // Street Lamps
    [
      [-10, 0.18, -4],
      [10, 0.18, -4],
      [-10, 0.18, 10],
      [10, 0.18, 10],
    ].forEach(([lx, ly, lz]) => {
      const lamp = new THREE.Group();
      lamp.position.set(lx, ly, lz);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 4.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
      );
      pole.position.y = 2.2;
      pole.castShadow = true;

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xfef08a, emissiveIntensity: 2.5 })
      );
      bulb.position.y = 4.4;

      lamp.add(pole, bulb);
      dioramaRoot.add(lamp);
    });

    // -------------------------------------------------------------
    // COLORFUL 3D TOY TRANSIT BUSES
    // -------------------------------------------------------------
    const progress = PlayerProgress.get();
    const activeLivery = LIVERIES.find((l) => l.id === progress.activeLivery) || LIVERIES[0];
    const activeUnderglow = UNDERGLOWS.find((u) => u.id === progress.activeUnderglow) || UNDERGLOWS[0];
    const activeRim = RIMS.find((r) => r.id === progress.activeRim) || RIMS[0];

    interface InteractiveBusEntry {
      id: string;
      group: THREE.Group;
      basePos: THREE.Vector3;
      baseRot: number;
      name: string;
      hopProgress: number;
      color: string;
    }

    const buses: InteractiveBusEntry[] = [];

    // Bus 1 (Center Left - Hero Custom Garage Bus)
    const heroBusRig = buildDioramaVehicleMesh({
      vehicleId: 'depot_bus_hero',
      type: 'BUS',
      colorHex: '#EAB308',
      length: 3,
      loadedPassengers: 3,
      capacity: 4,
      liveryConfig: activeLivery,
      underglowConfig: activeUnderglow,
      rimConfig: activeRim,
    });
    const heroBus = heroBusRig.group;
    heroBus.position.set(-2.5, 0.55, 2.4);
    heroBus.rotation.y = 0;
    dioramaRoot.add(heroBus);
    buses.push({
      id: 'depot_bus_hero',
      group: heroBus,
      basePos: new THREE.Vector3(-2.5, 0.55, 2.4),
      baseRot: 0,
      name: 'Custom Garage Bus',
      hopProgress: 0,
      color: '#EAB308',
    });

    // Bus 2 (Center Right - Royal Blue Bus)
    const blueBusRig = buildDioramaVehicleMesh({
      vehicleId: 'depot_bus_blue',
      type: 'BUS',
      colorHex: '#2563EB',
      length: 3,
      loadedPassengers: 2,
      capacity: 4,
    });
    const blueBus = blueBusRig.group;
    blueBus.position.set(2.5, 0.55, 2.4);
    blueBus.rotation.y = 0;
    dioramaRoot.add(blueBus);
    buses.push({
      id: 'depot_bus_blue',
      group: blueBus,
      basePos: new THREE.Vector3(2.5, 0.55, 2.4),
      baseRot: 0,
      name: 'Royal Blue Express',
      hopProgress: 0,
      color: '#2563EB',
    });

    // Bus 3 (Far Left - Crimson City Bus)
    const redBusRig = buildDioramaVehicleMesh({
      vehicleId: 'depot_bus_red',
      type: 'BUS',
      colorHex: '#EF4444',
      length: 3,
      loadedPassengers: 4,
      capacity: 4,
    });
    const redBus = redBusRig.group;
    redBus.position.set(-7.5, 0.55, 2.4);
    redBus.rotation.y = 0;
    dioramaRoot.add(redBus);
    buses.push({
      id: 'depot_bus_red',
      group: redBus,
      basePos: new THREE.Vector3(-7.5, 0.55, 2.4),
      baseRot: 0,
      name: 'Crimson City Commuter',
      hopProgress: 0,
      color: '#EF4444',
    });

    // Bus 4 (Far Right - Emerald Green Bus)
    const greenBusRig = buildDioramaVehicleMesh({
      vehicleId: 'depot_bus_green',
      type: 'BUS',
      colorHex: '#10B981',
      length: 3,
      loadedPassengers: 1,
      capacity: 4,
    });
    const greenBus = greenBusRig.group;
    greenBus.position.set(7.5, 0.55, 2.4);
    greenBus.rotation.y = 0;
    dioramaRoot.add(greenBus);
    buses.push({
      id: 'depot_bus_green',
      group: greenBus,
      basePos: new THREE.Vector3(7.5, 0.55, 2.4),
      baseRot: 0,
      name: 'Emerald Metro Shuttle',
      hopProgress: 0,
      color: '#10B981',
    });

    // Ambient Moving Feeder Car (Slowly drives along the curved feeder loop)
    const ambientCarRig = buildDioramaVehicleMesh({
      vehicleId: 'depot_ambient_car',
      type: 'CAR',
      colorHex: '#F97316',
      length: 2,
    });
    const ambientCar = ambientCarRig.group;
    dioramaRoot.add(ambientCar);

    // -------------------------------------------------------------
    // INTERACTION: TOUCH ORBIT & TAP BUS TO HONK
    // -------------------------------------------------------------
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let userOrbitY = 0;
    let userOrbitX = 0;
    let autoRotate = true;
    let lastInteractTime = Date.now();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const triggerBusHop = (busEntry: InteractiveBusEntry) => {
      busEntry.hopProgress = 1.0;
      sounds.playEscape();
      setInteractiveToast(`Honked ${busEntry.name}!`);
      setTimeout(() => setInteractiveToast(null), 1800);
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      isDragging = true;
      prevX = clientX;
      prevY = clientY;
      autoRotate = false;
      lastInteractTime = Date.now();
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = (clientX - prevX) * 0.008;
      const deltaY = (clientY - prevY) * 0.005;
      prevX = clientX;
      prevY = clientY;

      userOrbitY += deltaX;
      userOrbitX = Math.max(-0.25, Math.min(0.35, userOrbitX + deltaY));

      dioramaRoot.rotation.y = userOrbitY;
      camera.position.y = 14 + userOrbitX * 10;
      camera.lookAt(0, 0.6, -1.0);
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      // Check if tap on a bus
      if (isDragging) {
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

        const rect = container.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(dioramaRoot.children, true);

        if (intersects.length > 0) {
          let hitObj: THREE.Object3D | null = intersects[0].object;
          while (hitObj && hitObj !== dioramaRoot) {
            const hitBus = buses.find((b) => b.group === hitObj);
            if (hitBus) {
              triggerBusHop(hitBus);
              break;
            }
            hitObj = hitObj.parent;
          }
        }
      }

      isDragging = false;
      setTimeout(() => {
        if (Date.now() - lastInteractTime >= 2500) {
          autoRotate = true;
        }
      }, 2500);
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    container.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp, { passive: true });

    // -------------------------------------------------------------
    // ANIMATION LOOP
    // -------------------------------------------------------------
    let animId: number;
    let clock = new THREE.Clock();
    let ambientCarT = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Gentle auto orbit drift
      if (autoRotate && !isDragging) {
        userOrbitY += delta * 0.08;
        dioramaRoot.rotation.y = userOrbitY;
      }

      // Subtle bus idle suspension breathing & hop reactions
      buses.forEach((b, i) => {
        const idleBob = Math.sin(time * 2.5 + i * 1.2) * 0.02;
        const idleRoll = Math.sin(time * 1.8 + i * 0.8) * 0.008;

        if (b.hopProgress > 0) {
          b.hopProgress = Math.max(0, b.hopProgress - delta * 3.5);
          const hopHeight = Math.sin((1 - b.hopProgress) * Math.PI) * 0.65;
          const squash = Math.cos((1 - b.hopProgress) * Math.PI) * 0.15;
          b.group.position.y = b.basePos.y + hopHeight;
          b.group.scale.set(1 + squash * 0.2, 1 - squash * 0.2, 1 + squash * 0.2);
        } else {
          b.group.position.y = b.basePos.y + idleBob;
          b.group.rotation.z = idleRoll;
          b.group.scale.set(1, 1, 1);
        }
      });

      // Ambient car driving along curve
      ambientCarT = (ambientCarT + delta * 0.06) % 1.0;
      const carPos = mainCurve.getPointAt(ambientCarT);
      const carTangent = mainCurve.getTangentAt(ambientCarT);
      ambientCar.position.copy(carPos);
      ambientCar.position.y = 0.52;
      ambientCar.rotation.y = Math.atan2(carTangent.x, carTangent.z);

      renderer.render(scene, camera);
    };

    animate();

    // -------------------------------------------------------------
    // RESIZE OBSERVER
    // -------------------------------------------------------------
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, true);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      disposeHierarchy(scene);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden select-none touch-none">
      <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Interactive Toast Notification */}
      {interactiveToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-yellow-200 animate-bounce pointer-events-none z-20 flex items-center gap-1.5">
          <span>🔊</span>
          <span>{interactiveToast}</span>
        </div>
      )}

      {/* Subtle Hint: Touch & drag to orbit diorama */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/60 backdrop-blur-sm border border-slate-800/80 px-3 py-1 rounded-full text-[10px] font-bold text-slate-300 pointer-events-none z-10 flex items-center gap-1.5">
        <span>👆</span>
        <span>Drag to explore depot • Tap bus to honk</span>
      </div>
    </div>
  );
};
