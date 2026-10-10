import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sounds } from '../utils/soundEffects.ts';

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
    scene.background = new THREE.Color(0x7dd3fc); // Sunny cartoon blue sky matching frame_04.jpg

    // Camera framed matching frame_04.jpg (Vertical mobile composition)
    let aspect = width / height;
    const camera = new THREE.PerspectiveCamera(44, aspect, 0.1, 100);

    const updateCamera = () => {
      const curWidth = container.clientWidth || window.innerWidth;
      const curHeight = container.clientHeight || window.innerHeight;
      aspect = curWidth / curHeight;
      camera.aspect = aspect;
      if (aspect < 0.6) {
        camera.fov = 44;
        camera.position.set(0.1, 4.4, 18.0);
        camera.lookAt(0, 2.1, 0);
      } else {
        camera.fov = 38;
        camera.position.set(0.1, 3.6, 11.5);
        camera.lookAt(0, 1.85, 0);
      }
      camera.updateProjectionMatrix();
    };
    updateCamera();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------
    // SUNNY OUTDOOR LIGHTING
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xfffbeb, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0xd97706, 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(8, 22, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x67e8f9, 0.6);
    fillLight.position.set(-10, 12, 8);
    scene.add(fillLight);

    // -------------------------------------------------------------
    // CARTOON FLUFFY 3D CLOUDS IN BLUE SKY
    // -------------------------------------------------------------
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      emissive: 0xffffff,
      emissiveIntensity: 0.25,
    });
    const cloudsGroup = new THREE.Group();
    [
      [-3.2, 7.2, -10, 1.3],
      [2.5, 7.8, -11, 1.5],
      [-1.0, 8.4, -14, 2.0],
      [4.2, 6.6, -9, 1.1],
    ].forEach(([cx, cy, cz, scale]) => {
      const c = new THREE.Group();
      c.position.set(cx, cy, cz);
      [
        [0, 0, 0, 1.0],
        [-0.8, -0.2, 0, 0.75],
        [0.8, -0.2, 0, 0.75],
        [-0.4, 0.4, 0, 0.65],
        [0.4, 0.35, 0, 0.7],
      ].forEach(([px, py, pz, r]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 12, 12), cloudMat);
        puff.position.set(px * scale, py * scale, pz * scale);
        c.add(puff);
      });
      cloudsGroup.add(c);
    });
    scene.add(cloudsGroup);

    // -------------------------------------------------------------
    // AIRPORT TERMINAL BACKGROUND (Matching frame_04.jpg)
    // -------------------------------------------------------------
    const airportRoot = new THREE.Group();
    airportRoot.position.set(0, 0, -4.2);
    scene.add(airportRoot);

    // 1. Terminal Wall & Modern Windows
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(26, 6.5, 2.0), wallMat);
    wall.position.set(0, 3.25, -1.0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    airportRoot.add(wall);

    // Cyan Glass Windows with Turquoise Trim
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.8,
    });
    [-4, -2.5, 2.5, 4.5].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.1), glassMat);
      win.position.set(wx, 2.8, 0.05);
      airportRoot.add(win);
    });

    // 2. Yellow & Pink Arched Main Portal
    const archPortal = new THREE.Group();
    archPortal.position.set(-0.65, 0, 0.1);

    // Giant Yellow Arch
    const archTorus = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, 0.38, 14, 28, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
    );
    archTorus.position.set(0, 2.8, 0);
    archTorus.castShadow = true;
    archPortal.add(archTorus);

    // Pink and Turquoise Rainbow Striped Awning
    const pinkStripe = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.18, 12, 28, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 })
    );
    pinkStripe.position.set(0, 2.8, 0.05);
    archPortal.add(pinkStripe);

    // Automatic Sliding Glass Doors
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 2.7, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.3 })
    );
    doorFrame.position.set(0, 1.35, 0.05);
    archPortal.add(doorFrame);

    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.4, 0.1),
      glassMat
    );
    doorGlass.position.set(0, 1.35, 0.15);
    archPortal.add(doorGlass);

    // Gate "05" Sign above Door
    const gateSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.36, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x15803d, emissive: 0x22c55e, emissiveIntensity: 0.6 })
    );
    gateSign.position.set(0, 2.9, 0.25);
    archPortal.add(gateSign);

    // 3D Pink Cursive "AIRPORT" Marquee Sign on Arch
    const airportCanvas = document.createElement('canvas');
    airportCanvas.width = 512;
    airportCanvas.height = 160;
    const actx = airportCanvas.getContext('2d');
    if (actx) {
      actx.fillStyle = 'rgba(0,0,0,0)';
      actx.clearRect(0, 0, 512, 160);
      actx.fillStyle = '#ec4899';
      actx.strokeStyle = '#ffffff';
      actx.lineWidth = 10;
      actx.font = '900 82px sans-serif';
      actx.textAlign = 'center';
      actx.textBaseline = 'middle';
      actx.strokeText('AIRPORT', 256, 80);
      actx.fillText('AIRPORT', 256, 80);
    }
    const airportTex = new THREE.CanvasTexture(airportCanvas);
    const airportSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.1),
      new THREE.MeshBasicMaterial({ map: airportTex, transparent: true })
    );
    airportSign.position.set(0, 4.6, 0.35);
    archPortal.add(airportSign);

    airportRoot.add(archPortal);

    // 3. Air Traffic Control Tower (Right Background)
    const towerGroup = new THREE.Group();
    towerGroup.position.set(1.9, 0, -1.8);

    // Tower Concrete Shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.85, 6.2, 18),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
    );
    shaft.position.y = 3.6;
    shaft.castShadow = true;
    towerGroup.add(shaft);

    // Yellow Observation Cabin
    const cabin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.0, 1.2, 18),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
    );
    cabin.position.y = 6.8;
    cabin.castShadow = true;
    towerGroup.add(cabin);

    // Cabin Glass Windows
    const cabinGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.08, 0.55, 18),
      glassMat
    );
    cabinGlass.position.y = 6.8;
    towerGroup.add(cabinGlass);

    // Cabin Dome Roof
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
    );
    dome.position.y = 7.4;
    towerGroup.add(dome);

    // Rotating Radar Dish on Tower Mast
    const radarMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    radarMast.position.y = 8.3;
    towerGroup.add(radarMast);

    const radarDish = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    radarDish.position.set(0, 8.7, 0);
    radarDish.rotation.x = -0.6;
    towerGroup.add(radarDish);

    airportRoot.add(towerGroup);

    // 4. Concourse Glass Facade with "T3" Sign (Right of Portal)
    const t3Canvas = document.createElement('canvas');
    t3Canvas.width = 128;
    t3Canvas.height = 96;
    const t3ctx = t3Canvas.getContext('2d');
    if (t3ctx) {
      t3ctx.fillStyle = '#0284c7';
      t3ctx.fillRect(0, 0, 128, 96);
      t3ctx.strokeStyle = '#ffffff';
      t3ctx.lineWidth = 4;
      t3ctx.strokeRect(2, 2, 124, 92);
      t3ctx.fillStyle = '#ffffff';
      t3ctx.font = '900 52px sans-serif';
      t3ctx.textAlign = 'center';
      t3ctx.textBaseline = 'middle';
      t3ctx.fillText('T3', 64, 48);
    }
    const t3Tex = new THREE.CanvasTexture(t3Canvas);
    const t3Sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.8),
      new THREE.MeshBasicMaterial({ map: t3Tex })
    );
    t3Sign.position.set(1.9, 3.4, 0.15);
    airportRoot.add(t3Sign);

    // 5. Sidewalk Platform with Tiles
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.35, 3.8),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.6 })
    );
    sidewalk.position.set(0, 0.18, 1.8);
    sidewalk.receiveShadow = true;
    airportRoot.add(sidewalk);

    // Blue Bus Stop Signpost "29" on Sidewalk (Left side, matching frame_04.jpg)
    const signPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    );
    signPost.position.set(-1.85, 0.9, 2.2);
    airportRoot.add(signPost);

    const sign29Canvas = document.createElement('canvas');
    sign29Canvas.width = 128;
    sign29Canvas.height = 160;
    const sctx = sign29Canvas.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#0284c7';
      sctx.fillRect(0, 0, 128, 160);
      sctx.strokeStyle = '#ffffff';
      sctx.lineWidth = 6;
      sctx.strokeRect(4, 4, 120, 152);
      sctx.fillStyle = '#ffffff';
      sctx.font = '900 68px sans-serif';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.fillText('29', 64, 75);
      // Small arrow
      sctx.font = 'bold 32px sans-serif';
      sctx.fillText('➜', 64, 130);
    }
    const sign29Tex = new THREE.CanvasTexture(sign29Canvas);
    const busSignPlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.8),
      new THREE.MeshBasicMaterial({ map: sign29Tex })
    );
    busSignPlaque.position.set(-1.85, 1.5, 2.22);
    airportRoot.add(busSignPlaque);

    // Potted Flower Planters along Sidewalk
    [-1.2, 0.8].forEach((px) => {
      const planter = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.35, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.4 })
      );
      planter.position.set(px, 0.45, 2.2);
      airportRoot.add(planter);

      // Colorful flowers
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 })
      );
      flower.position.set(px, 0.68, 2.2);
      airportRoot.add(flower);
    });

    // Colorful Rolling Suitcases on Right Sidewalk & Luggage Cart (Matching frame_04.jpg)
    const luggageTrolleyGroup = new THREE.Group();
    luggageTrolleyGroup.position.set(1.95, 0.2, 2.2);

    // Chrome luggage cart frame
    const cartFrameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
    const cartBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.9), cartFrameMat);
    cartBase.position.y = 0.15;
    luggageTrolleyGroup.add(cartBase);

    // Cart wheels
    [-0.65, 0.65].forEach((wx) => {
      [-0.35, 0.35].forEach((wz) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.08, wz);
        luggageTrolleyGroup.add(wheel);
      });
    });

    // Suitcases on cart
    const luggageConfigs = [
      { x: -0.35, z: 0.0, color: 0xdb2777, h: 0.85, w: 0.52 }, // Pink upright suitcase
      { x: 0.25, z: 0.1, color: 0x06b6d4, h: 0.80, w: 0.48 }, // Turquoise suitcase
      { x: 0.55, z: -0.15, color: 0xf97316, h: 0.70, w: 0.42 }, // Orange suitcase
    ];
    luggageConfigs.forEach((cfg) => {
      const bag = new THREE.Group();
      bag.position.set(cfg.x, 0.2 + cfg.h * 0.5, cfg.z);

      const bagMesh = new THREE.Mesh(
        new THREE.BoxGeometry(cfg.w, cfg.h, 0.32),
        new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.35 })
      );
      bagMesh.castShadow = true;
      bag.add(bagMesh);

      // Handle on top
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.16, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
      );
      handle.position.y = cfg.h * 0.5 + 0.08;
      bag.add(handle);

      luggageTrolleyGroup.add(bag);
    });
    airportRoot.add(luggageTrolleyGroup);

    // -------------------------------------------------------------
    // ROADWAY & CHEVRON MARKINGS
    // -------------------------------------------------------------
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 18),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, 1.0);
    road.receiveShadow = true;
    scene.add(road);

    // Yellow Directional Road Markings (Yellow stripes on asphalt)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    [-1.2, 0.2, 1.6].forEach((sx) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 1.5), stripeMat);
      stripe.position.set(sx + 0.8, 0.03, 1.5);
      stripe.rotation.y = 0.45;
      scene.add(stripe);
    });

    // -------------------------------------------------------------
    // THE HERO: VINTAGE RED & CREAM VW CAMPER VAN (Matching frame_04.jpg)
    // -------------------------------------------------------------
    const vwBusGroup = new THREE.Group();
    vwBusGroup.position.set(-0.05, 0.05, 1.35);
    vwBusGroup.rotation.y = 0.25; // Tilted slightly towards camera right matching frame_04.jpg
    scene.add(vwBusGroup);

    const busLength = 4.4;
    const busWidth = 2.15;
    const busHeight = 2.3;

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222, // Deep cheerful red
      roughness: 0.22,
      metalness: 0.12,
    });

    const creamMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb, // Ivory / cream
      roughness: 0.28,
      metalness: 0.08,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.08,
      metalness: 0.95,
    });

    // Lower Red Body
    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(busWidth, busHeight * 0.46, busLength),
      redMat
    );
    lowerBody.position.y = busHeight * 0.23 + 0.36;
    lowerBody.castShadow = true;
    vwBusGroup.add(lowerBody);

    // Upper Cream Greenhouse
    const upperBody = new THREE.Mesh(
      new THREE.BoxGeometry(busWidth * 0.97, busHeight * 0.44, busLength * 0.97),
      creamMat
    );
    upperBody.position.y = busHeight * 0.68 + 0.36;
    upperBody.castShadow = true;
    vwBusGroup.add(upperBody);

    // Rounded Roof
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(busWidth * 0.485, busWidth * 0.485, busLength * 0.95, 20),
      creamMat
    );
    roof.rotation.set(Math.PI / 2, 0, 0);
    roof.position.y = busHeight * 0.88 + 0.36;
    roof.scale.set(1, 0.40, 1);
    roof.castShadow = true;
    vwBusGroup.add(roof);

    // Iconic Front Cream V-Chevron Wedge
    const chevron = new THREE.Mesh(
      new THREE.ConeGeometry(busWidth * 0.48, busHeight * 0.45, 3),
      creamMat
    );
    chevron.position.set(0, busHeight * 0.24 + 0.36, busLength * 0.505);
    chevron.rotation.x = Math.PI;
    chevron.scale.set(1, 1, 0.06);
    vwBusGroup.add(chevron);

    // Chrome Center Emblem
    const emblem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.05, 24),
      chromeMat
    );
    emblem.rotation.x = Math.PI / 2;
    emblem.position.set(0, busHeight * 0.31 + 0.36, busLength * 0.52);
    vwBusGroup.add(emblem);

    // Split-Window Windshields (2 Panes)
    [-busWidth * 0.24, busWidth * 0.24].forEach((wx) => {
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(busWidth * 0.42, 0.66, 0.08),
        glassMat
      );
      pane.position.set(wx, busHeight * 0.69 + 0.36, busLength * 0.488);
      pane.rotation.x = -0.15;
      vwBusGroup.add(pane);

      // Chrome Wiper
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.03), chromeMat);
      wiper.position.set(wx, busHeight * 0.65 + 0.36, busLength * 0.512);
      wiper.rotation.z = wx < 0 ? 0.35 : -0.35;
      vwBusGroup.add(wiper);
    });

    // Side Windows
    [-busWidth * 0.495, busWidth * 0.495].forEach((sx) => {
      [-1.2, -0.4, 0.4, 1.2].forEach((sz) => {
        const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.56, 0.66), glassMat);
        sideWin.position.set(sx, busHeight * 0.68 + 0.36, sz);
        vwBusGroup.add(sideWin);
      });
    });

    // Round Headlights with Chrome Bezels & Amber Lenses
    [-busWidth * 0.36, busWidth * 0.36].forEach((hx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 12, 24), chromeMat);
      ring.position.set(hx, busHeight * 0.28 + 0.36, busLength * 0.51);
      vwBusGroup.add(ring);

      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 16, 12),
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 0.9,
          roughness: 0.1,
        })
      );
      lens.position.set(hx, busHeight * 0.28 + 0.36, busLength * 0.51);
      lens.scale.set(1, 1, 0.3);
      vwBusGroup.add(lens);

      // Amber turn signal
      const signal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
      );
      signal.rotation.x = Math.PI / 2;
      signal.position.set(hx, busHeight * 0.12 + 0.36, busLength * 0.51);
      vwBusGroup.add(signal);
    });

    // Curved White Front Bumper
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(busWidth * 1.1, 0.20, 0.18),
      creamMat
    );
    frontBumper.position.set(0, 0.34, busLength * 0.528);
    frontBumper.castShadow = true;
    vwBusGroup.add(frontBumper);

    // Chrome Bumper Overriders
    [-0.52, 0.52].forEach((bx) => {
      const overrider = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.15), chromeMat);
      overrider.position.set(bx, 0.40, busLength * 0.538);
      vwBusGroup.add(overrider);
    });

    // Center Front License Plate: "BUS MADNESS"
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 256;
    plateCanvas.height = 64;
    const pctx = plateCanvas.getContext('2d');
    if (pctx) {
      pctx.fillStyle = '#1e3a8a';
      pctx.fillRect(0, 0, 256, 64);
      pctx.strokeStyle = '#ffffff';
      pctx.lineWidth = 4;
      pctx.strokeRect(4, 4, 248, 56);
      pctx.fillStyle = '#ffffff';
      pctx.font = 'bold 28px sans-serif';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText('BUS MADNESS', 128, 32);
    }
    const plateTex = new THREE.CanvasTexture(plateCanvas);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.24),
      new THREE.MeshBasicMaterial({ map: plateTex })
    );
    plate.position.set(0, 0.27, busLength * 0.542);
    vwBusGroup.add(plate);

    // Front Roof "BUS" Destination Sign Box
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.30, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.3 })
    );
    signBox.position.set(0, busHeight * 0.96 + 0.36, busLength * 0.40);
    vwBusGroup.add(signBox);

    const busLabelCanvas = document.createElement('canvas');
    busLabelCanvas.width = 256;
    busLabelCanvas.height = 80;
    const blctx = busLabelCanvas.getContext('2d');
    if (blctx) {
      blctx.fillStyle = '#fef08a';
      blctx.fillRect(0, 0, 256, 80);
      blctx.strokeStyle = '#78350f';
      blctx.lineWidth = 6;
      blctx.strokeRect(6, 6, 244, 68);
      blctx.fillStyle = '#78350f';
      blctx.font = '900 48px sans-serif';
      blctx.textAlign = 'center';
      blctx.textBaseline = 'middle';
      blctx.fillText('BUS', 128, 40);
    }
    const busLabelTex = new THREE.CanvasTexture(busLabelCanvas);
    const busLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.24),
      new THREE.MeshBasicMaterial({ map: busLabelTex })
    );
    busLabel.position.set(0, busHeight * 0.96 + 0.36, busLength * 0.40 + 0.17);
    vwBusGroup.add(busLabel);

    // Chrome Side Mirrors on Curved Stalks
    [-busWidth * 0.58, busWidth * 0.58].forEach((mx) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38), chromeMat);
      stalk.position.set(mx * 0.94, busHeight * 0.52 + 0.36, busLength * 0.38);
      stalk.rotation.z = mx < 0 ? -0.4 : 0.4;
      vwBusGroup.add(stalk);

      const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), chromeMat);
      mirror.position.set(mx, busHeight * 0.58 + 0.36, busLength * 0.38);
      mirror.scale.set(0.3, 1, 1);
      vwBusGroup.add(mirror);
    });

    // 4 Wheels with White-Walls & Chrome Domed Hubcaps
    const wheels: THREE.Group[] = [];
    const wheelPositions = [
      [-busWidth * 0.50, 0.40, busLength * 0.32],
      [busWidth * 0.50, 0.40, busLength * 0.32],
      [-busWidth * 0.50, 0.40, -busLength * 0.32],
      [busWidth * 0.50, 0.40, -busLength * 0.32],
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Group();
      wheel.position.set(wx, wy, wz);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.40, 0.40, 0.24, 20),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheel.add(tire);

      const whiteWall = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.30, 0.245, 20),
        creamMat
      );
      whiteWall.rotation.z = Math.PI / 2;
      wheel.add(whiteWall);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 12),
        chromeMat
      );
      cap.position.x = wx > 0 ? 0.11 : -0.11;
      wheel.add(cap);

      wheels.push(wheel);
      vwBusGroup.add(wheel);
    });

    // -------------------------------------------------------------
    // INTERACTION: TAP BUS TO HONK & BOUNCE
    // -------------------------------------------------------------
    let hopProgress = 0;
    const triggerBusHonk = () => {
      sounds.playEscape();
      hopProgress = 1.0;
      setInteractiveToast('Beep Beep! 🚌 Vintage Camper Ready!');
      setTimeout(() => setInteractiveToast(null), 1800);
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(vwBusGroup.children, true);
      if (hits.length > 0) {
        triggerBusHonk();
      }
    };

    container.addEventListener('pointerdown', onPointerDown);

    // -------------------------------------------------------------
    // ANIMATION LOOP
    // -------------------------------------------------------------
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Radar dish rotation
      radarDish.rotation.y += delta * 1.5;

      // Soft clouds drift
      cloudsGroup.position.x = Math.sin(time * 0.1) * 0.8;

      // Bus idle suspension & tap hop
      if (hopProgress > 0) {
        hopProgress = Math.max(0, hopProgress - delta * 3.5);
        const hopY = Math.sin((1 - hopProgress) * Math.PI) * 0.55;
        const squash = Math.cos((1 - hopProgress) * Math.PI) * 0.15;
        vwBusGroup.position.y = 0.05 + hopY;
        vwBusGroup.scale.set(1 + squash * 0.15, 1 - squash * 0.15, 1 + squash * 0.15);
      } else {
        const idleBob = Math.sin(time * 2.2) * 0.015;
        const idleRoll = Math.sin(time * 1.6) * 0.005;
        vwBusGroup.position.y = 0.05 + idleBob;
        vwBusGroup.rotation.z = idleRoll;
        vwBusGroup.scale.set(1, 1, 1);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      updateCamera();
      renderer.setSize(width, height, true);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      disposeHierarchy(scene);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden select-none touch-none">
      <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-pointer" />

      {/* Interactive Toast Notification */}
      {interactiveToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-xl border-2 border-yellow-200 animate-bounce pointer-events-none z-30 flex items-center gap-2">
          <span>{interactiveToast}</span>
        </div>
      )}
    </div>
  );
};
