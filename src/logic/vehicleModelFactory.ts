import * as THREE from 'three';
import { VehicleType, VehicleStateType } from './types.ts';
import { LiveryConfig, UnderglowConfig, RimConfig } from './garageCustomization.ts';

export interface VehicleFactoryOptions {
  vehicleId: string;
  type: VehicleType | string;
  colorHex: string;
  length: number; // 2 or 3
  state?: VehicleStateType;
  loadedPassengers?: number;
  capacity?: number;
  liveryConfig?: LiveryConfig;
  underglowConfig?: UnderglowConfig;
  rimConfig?: RimConfig;
}

export interface VehicleMeshRig {
  group: THREE.Group;
  frontWheels: THREE.Group[];
  wheelTires: THREE.Mesh[];
  brakeLightMat: THREE.MeshStandardMaterial;
  indicatorMat: THREE.MeshStandardMaterial;
  baseY: number;
}

/**
 * Creates a high-end stylized 3D toy wheel:
 * Outer matte rubber tire, beveled tire sidewalls, inset metallic alloy rim,
 * center axle hub, and 5 detailed lug bolts.
 */
function createStylizedToyWheel(
  rimColor: number | string,
  rimRoughness: number,
  rimMetalness: number
): { wheelGroup: THREE.Group; tireMesh: THREE.Mesh } {
  const wheelGroup = new THREE.Group();

  // 1. Thick Rubber Tire
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.9,
    metalness: 0.05,
  });
  const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.22, 18);
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.rotation.z = Math.PI / 2;
  tireMesh.castShadow = true;
  wheelGroup.add(tireMesh);

  // Outer beveled rubber tread ring for soft toy tire curvature
  const treadTorusGeo = new THREE.TorusGeometry(0.34, 0.035, 8, 20);
  const treadRing = new THREE.Mesh(treadTorusGeo, tireMat);
  treadRing.position.x = 0.08;
  wheelGroup.add(treadRing);

  // 2. Inset Metallic Alloy Rim
  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(rimColor),
    roughness: rimRoughness,
    metalness: rimMetalness,
  });
  const rimBaseGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.23, 16);
  const rimBase = new THREE.Mesh(rimBaseGeo, rimMat);
  rimBase.rotation.z = Math.PI / 2;
  wheelGroup.add(rimBase);

  // 3. Center Hub Cap
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.8,
  });
  const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.245, 12);
  const hub = new THREE.Mesh(hubGeo, hubMat);
  hub.rotation.z = Math.PI / 2;
  wheelGroup.add(hub);

  // 4. Five Inset Lug Bolts on Rim
  const lugMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.15,
    metalness: 0.95,
  });
  const lugGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.242, 6);
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5;
    const ly = Math.sin(angle) * 0.16;
    const lz = Math.cos(angle) * 0.16;
    const lug = new THREE.Mesh(lugGeo, lugMat);
    lug.rotation.z = Math.PI / 2;
    lug.position.set(0, ly, lz);
    wheelGroup.add(lug);
  }

  return { wheelGroup, tireMesh };
}

/**
 * Premium Miniature 3D Diorama Vehicle Model Factory
 * Inspired by high-end stylized 3D collectible toys:
 * - Rounded contours, molded wheel arches, folding passenger doors
 * - Front wipers, destination board plaque, chrome headlight bezels
 * - Inset roof passenger seat orbs with glowing passenger colors
 * - Contact drop shadows and crisp direction arrows
 */
export function buildDioramaVehicleMesh(options: VehicleFactoryOptions): VehicleMeshRig {
  const {
    vehicleId,
    type,
    colorHex,
    length,
    state = VehicleStateType.PARKED,
    loadedPassengers = 0,
    capacity,
    liveryConfig,
    underglowConfig,
    rimConfig,
  } = options;

  const vGroup = new THREE.Group();
  vGroup.userData = { vehicleId };

  const length3D = length * 1.05;
  const width3D = 1.62;
  const isBus = type === 'BUS' || type === VehicleType.BUS;
  const isTruck = type === 'TRUCK' || type === VehicleType.TRUCK;
  const isVan = type === 'VAN' || type === VehicleType.VAN;
  const isCar = !isBus && !isTruck && !isVan;

  let height3D = 0.96;
  if (isBus) height3D = 1.44;
  else if (isTruck) height3D = 1.48;
  else if (isVan) height3D = 1.30;

  const baseY = 0.72;

  // 1. Soft Ground Contact Drop Shadow
  const shadowGeo = new THREE.PlaneGeometry(width3D * 1.18, length3D * 1.10);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -height3D * 0.48;
  vGroup.add(shadowMesh);

  // 2. High-End Die-Cast Toy Materials (Clearcoat automotive lacquer & realistic glass)
  const bodyRoughness = isBus && liveryConfig ? liveryConfig.roughness : 0.16;
  const bodyMetalness = isBus && liveryConfig ? liveryConfig.metalness : 0.12;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: bodyRoughness,
    metalness: bodyMetalness,
    clearcoat: 0.85,
    clearcoatRoughness: 0.10,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.3,
  });

  const whiteFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.05,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.10,
    metalness: 0.96,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.90,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 2.8,
    roughness: 0.05,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xef4444,
    emissiveIntensity: 2.2,
    roughness: 0.08,
  });

  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });

  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.5,
    roughness: 0.12,
    metalness: 0.1,
  });

  // 3. Silhouette Construction by Vehicle Type
  if (isCar) {
    // --- SLEEK SPORT COUPE / COMPACT CAR (Length 2) ---
    // Sculpted Main Chassis
    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(width3D, height3D * 0.52, length3D),
      bodyMat
    );
    lowerBody.position.y = -height3D * 0.08;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    lowerBody.userData = { vehicleId, originalColor: colorHex };
    vGroup.add(lowerBody);

    // Aerodynamic Sloping Hood (-Z)
    const hoodGeo = new THREE.BoxGeometry(width3D * 0.95, height3D * 0.22, length3D * 0.34);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, height3D * 0.18, -length3D * 0.32);
    hood.castShadow = true;
    vGroup.add(hood);

    // Front Grille
    const grill = new THREE.Mesh(
      new THREE.BoxGeometry(width3D * 0.72, 0.14, 0.06),
      darkTrimMat
    );
    grill.position.set(0, -height3D * 0.12, -length3D * 0.505);
    vGroup.add(grill);

    // Greenhouse Cabin
    const cabinGeo = new THREE.BoxGeometry(width3D * 0.88, height3D * 0.48, length3D * 0.52);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, height3D * 0.38, 0.02);
    cabin.castShadow = true;
    vGroup.add(cabin);

    // Sloping Front Windshield (-Z)
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(width3D * 0.84, height3D * 0.44, 0.06),
      glassMat
    );
    windshield.position.set(0, height3D * 0.38, -length3D * 0.24);
    windshield.rotation.x = -0.32;
    vGroup.add(windshield);

    // Windshield Wipers
    [-0.24, 0.18].forEach((wx) => {
      const wiper = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.18, 0.02),
        darkTrimMat
      );
      wiper.position.set(wx, height3D * 0.28, -length3D * 0.28);
      wiper.rotation.z = -0.35;
      vGroup.add(wiper);
    });

    // Rear Sports Window (+Z)
    const rearWindow = new THREE.Mesh(
      new THREE.BoxGeometry(width3D * 0.82, height3D * 0.38, 0.06),
      glassMat
    );
    rearWindow.position.set(0, height3D * 0.38, length3D * 0.27);
    rearWindow.rotation.x = 0.32;
    vGroup.add(rearWindow);

    // Side Windows
    [-width3D * 0.445, width3D * 0.445].forEach((xSide) => {
      const sideWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, height3D * 0.32, length3D * 0.42),
        glassMat
      );
      sideWin.position.set(xSide, height3D * 0.38, 0.02);
      vGroup.add(sideWin);
    });

    // Sporty Rear Lip Spoiler (Body-colored matching frame_01.jpg)
    [-width3D * 0.32, width3D * 0.32].forEach((wsX) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.06), bodyMat);
      strut.position.set(wsX, height3D * 0.30, length3D * 0.45);
      vGroup.add(strut);
    });

    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(width3D * 0.90, 0.04, 0.18), bodyMat);
    wingBlade.position.set(0, height3D * 0.38, length3D * 0.45);
    wingBlade.castShadow = true;
    vGroup.add(wingBlade);

    // Front Bumper Splitter
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(width3D * 0.98, 0.18, 0.16),
      darkTrimMat
    );
    frontBumper.position.set(0, -height3D * 0.22, -length3D * 0.50);
    vGroup.add(frontBumper);

    // Dual Chrome Exhaust Pipes
    [-0.26, 0.26].forEach((exX) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), chromeMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(exX, -height3D * 0.24, length3D * 0.51);
      vGroup.add(tip);
    });

  } else if (isVan || isBus) {
    // --- STYLIZED 3D TOY JELLY-BEAN BUS/VAN (Matching Reference Image) ---
    // Create a highly rounded profile extruded into a chubby body
    const r = 0.35; // Large bevel radius for jelly look
    const depth = width3D - r * 2;
    const l = length3D;
    const h = height3D * 0.95;

    const shape = new THREE.Shape();
    shape.moveTo(-l/2 + r, -h/2);
    shape.lineTo(l/2 - r, -h/2);
    shape.quadraticCurveTo(l/2, -h/2, l/2, -h/2 + r);
    shape.lineTo(l/2, h/2 - r);
    shape.quadraticCurveTo(l/2, h/2, l/2 - r, h/2);
    shape.lineTo(-l/2 + r, h/2);
    shape.quadraticCurveTo(-l/2, h/2, -l/2, h/2 - r);
    shape.lineTo(-l/2, -h/2 + r);
    shape.quadraticCurveTo(-l/2, -h/2, -l/2 + r, -h/2);

    const extrudeSettings = { depth, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: r, bevelThickness: r };
    const busGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    busGeo.center();
    busGeo.rotateY(Math.PI / 2);

    const busBody = new THREE.Mesh(busGeo, bodyMat);
    busBody.position.y = 0.15; // Lift up slightly
    busBody.castShadow = true;
    busBody.receiveShadow = true;
    busBody.userData = { vehicleId, originalColor: colorHex };
    vGroup.add(busBody);

    // Huge Panoramic Front Windshield (Dark and shiny, matching reference)
    const wsGeo = new THREE.PlaneGeometry(width3D * 0.75, height3D * 0.5);
    const busWs = new THREE.Mesh(wsGeo, glassMat);
    busWs.position.set(0, 0.25, -length3D * 0.5 - r * 0.96);
    busWs.rotation.x = -0.05;
    vGroup.add(busWs);

    // Simple Side Windows (Black shiny strips)
    [-width3D * 0.5 - r * 0.96, width3D * 0.5 + r * 0.96].forEach((xSide) => {
      const sideGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(length3D * 0.65, height3D * 0.45),
        glassMat
      );
      sideGlass.position.set(xSide, 0.25, 0);
      sideGlass.rotation.y = xSide > 0 ? Math.PI / 2 : -Math.PI / 2;
      vGroup.add(sideGlass);
      
      // Window mullions (vertical dividers)
      const numWindows = isBus ? 4 : 3;
      for (let i = 1; i < numWindows; i++) {
        const zPos = -length3D * 0.325 + (i / numWindows) * length3D * 0.65;
        const pillarGeo = new THREE.BoxGeometry(0.04, height3D * 0.46, 0.04);
        const pillar = new THREE.Mesh(pillarGeo, bodyMat);
        pillar.position.set(xSide > 0 ? xSide + 0.01 : xSide - 0.01, 0.25, zPos);
        vGroup.add(pillar);
      }
    });

    // Rear Window
    const rearWinGeo = new THREE.PlaneGeometry(width3D * 0.75, height3D * 0.35);
    const rearWin = new THREE.Mesh(rearWinGeo, glassMat);
    rearWin.position.set(0, 0.2, length3D * 0.5 + r * 0.96);
    rearWin.rotation.y = Math.PI;
    vGroup.add(rearWin);

    // Custom Garage Livery Decals for Bus
    if (liveryConfig) {
      if (liveryConfig.patternType === 'racing_stripes') {
        [-0.32, 0.32].forEach((xOff) => {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.02, length3D * 0.90),
            new THREE.MeshBasicMaterial({ color: liveryConfig.stripeColor })
          );
          stripe.position.set(xOff, height3D * 0.5 - 0.05, 0);
          vGroup.add(stripe);
        });
      }
    }

    // Underglow Neon for Bus
    if (underglowConfig && underglowConfig.intensity > 0) {
      const ugLight = new THREE.PointLight(underglowConfig.colorHex, underglowConfig.intensity * 1.5, 4.0);
      ugLight.position.set(0, -height3D * 0.32, 0);
      vGroup.add(ugLight);

      const ugPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(width3D * 0.92, length3D * 0.88),
        new THREE.MeshBasicMaterial({
          color: underglowConfig.colorHex,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        })
      );
      ugPlate.rotation.x = -Math.PI / 2;
      ugPlate.position.y = -height3D * 0.36;
      vGroup.add(ugPlate);
    }

  } else if (isTruck) {
    // --- HEAVY-DUTY CAB-OVER CARGO TRUCK (Length 3) ---
    // Square Driver Cab (Front 1/3)
    const truckCab = new THREE.Mesh(
      new THREE.BoxGeometry(width3D * 0.98, height3D * 0.72, length3D * 0.34),
      bodyMat
    );
    truckCab.position.set(0, height3D * 0.05, -length3D * 0.32);
    truckCab.castShadow = true;
    truckCab.receiveShadow = true;
    truckCab.userData = { vehicleId, originalColor: colorHex };
    vGroup.add(truckCab);

    // Truck Windshield
    const truckWs = new THREE.Mesh(
      new THREE.BoxGeometry(width3D * 0.88, height3D * 0.40, 0.05),
      glassMat
    );
    truckWs.position.set(0, height3D * 0.22, -length3D * 0.48);
    truckWs.rotation.x = -0.12;
    vGroup.add(truckWs);

    // Windshield Wipers
    [-0.24, 0.22].forEach((wx) => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.02), darkTrimMat);
      wiper.position.set(wx, height3D * 0.12, -length3D * 0.50);
      wiper.rotation.z = -0.32;
      vGroup.add(wiper);
    });

    // Sun Visor Shade over Windshield
    const visor = new THREE.Mesh(new THREE.BoxGeometry(width3D * 0.94, 0.06, 0.22), darkTrimMat);
    visor.position.set(0, height3D * 0.44, -length3D * 0.48);
    vGroup.add(visor);

    // Massive Front Chrome Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(width3D * 0.75, height3D * 0.28, 0.08), chromeMat);
    grille.position.set(0, -height3D * 0.12, -length3D * 0.495);
    vGroup.add(grille);

    // Twin Vertical Chrome Exhaust Smoke Stacks
    [-width3D * 0.46, width3D * 0.46].forEach((xStack) => {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, height3D * 0.95, 12),
        chromeMat
      );
      stack.position.set(xStack, height3D * 0.35, -length3D * 0.14);
      stack.castShadow = true;
      vGroup.add(stack);
    });

    // Steel Chassis Rails beneath cargo bed
    const rails = new THREE.Mesh(new THREE.BoxGeometry(width3D * 0.65, 0.18, length3D * 0.62), darkTrimMat);
    rails.position.set(0, -height3D * 0.22, length3D * 0.18);
    vGroup.add(rails);

    // Ribbed Cargo Container Box (Rear 2/3)
    const cargoGeo = new THREE.BoxGeometry(width3D * 0.95, height3D * 0.68, length3D * 0.58);
    const cargoBox = new THREE.Mesh(cargoGeo, darkTrimMat);
    cargoBox.position.set(0, height3D * 0.08, length3D * 0.18);
    cargoBox.castShadow = true;
    vGroup.add(cargoBox);

    // Side Cylindrical Fuel Tanks
    [-width3D * 0.46, width3D * 0.46].forEach((xTank) => {
      const fuelTank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.65, 12),
        chromeMat
      );
      fuelTank.rotation.x = Math.PI / 2;
      fuelTank.position.set(xTank, -height3D * 0.20, -0.05);
      vGroup.add(fuelTank);
    });

    // Heavy Steel Bumper
    const truckBumper = new THREE.Mesh(new THREE.BoxGeometry(width3D * 1.05, 0.26, 0.22), chromeMat);
    truckBumper.position.set(0, -height3D * 0.26, -length3D * 0.50);
    vGroup.add(truckBumper);

  } else {
    // Already handled in the combined isVan || isBus block.
    // If anything else falls through, it uses the truck chassis for now.
  }

  // 4. BOLD ICONIC WHITE DIRECTIONAL ROOF ARROW (Matching Reference Gameplay Screenshots)
  const arrowGroup = new THREE.Group();
  // Set roof elevation to sit proudly and flush on top of each vehicle contour
  const roofY = (isBus || isVan)
    ? height3D * 0.36 + 0.015
    : isTruck
    ? height3D * 0.42 + 0.015
    : height3D * 0.62 + 0.015;
  arrowGroup.position.set(0, roofY, 0);

  const totalLen = length3D * 0.65;
  const headLen = totalLen * 0.46;
  const stemW = width3D * 0.40;
  const headW = width3D * 0.76;
  const stemHalfW = stemW / 2;
  const headHalfW = headW / 2;

  // 2D Arrow Shape pointing forward (-Z)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, -totalLen / 2); // Head tip forward (-Z)
  arrowShape.lineTo(headHalfW, -totalLen / 2 + headLen); // Right barb
  arrowShape.lineTo(stemHalfW, -totalLen / 2 + headLen); // Right notch
  arrowShape.lineTo(stemHalfW, totalLen / 2); // Right stem base (+Z)
  arrowShape.lineTo(-stemHalfW, totalLen / 2); // Left stem base
  arrowShape.lineTo(-stemHalfW, -totalLen / 2 + headLen); // Left notch
  arrowShape.lineTo(-headHalfW, -totalLen / 2 + headLen); // Left barb
  arrowShape.closePath();

  // Dark Outline Backing Plate for 100% crisp contrast on yellow, green, and white cars
  const outlineShape = new THREE.Shape();
  const expand = 0.055;
  outlineShape.moveTo(0, -totalLen / 2 - expand);
  outlineShape.lineTo(headHalfW + expand, -totalLen / 2 + headLen);
  outlineShape.lineTo(stemHalfW + expand, -totalLen / 2 + headLen);
  outlineShape.lineTo(stemHalfW + expand, totalLen / 2 + expand);
  outlineShape.lineTo(-stemHalfW - expand, totalLen / 2 + expand);
  outlineShape.lineTo(-stemHalfW - expand, -totalLen / 2 + headLen);
  outlineShape.lineTo(-headHalfW - expand, -totalLen / 2 + headLen);
  outlineShape.closePath();

  const outlineGeo = new THREE.ExtrudeGeometry(outlineShape, { depth: 0.015, bevelEnabled: false });
  outlineGeo.rotateX(Math.PI / 2);
  const outlineMesh = new THREE.Mesh(outlineGeo, darkTrimMat);
  outlineMesh.position.y = 0.005;
  arrowGroup.add(outlineMesh);

  // Pure Brilliant White Arrow Surface
  const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.03, bevelEnabled: false });
  arrowGeo.rotateX(Math.PI / 2);
  const thickArrowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.75,
    roughness: 0.1,
    metalness: 0.05,
  });
  const arrowMesh = new THREE.Mesh(arrowGeo, thickArrowMat);
  arrowMesh.position.y = 0.028;
  arrowMesh.castShadow = true;
  arrowGroup.add(arrowMesh);

  vGroup.add(arrowGroup);

  // 5. Seated Passengers inside docked vehicle (Matching Screenshot 4: Level 82)
  if (loadedPassengers > 0) {
    const totalCapacity = capacity || (isBus ? 4 : 3);
    const pMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.2,
      metalness: 0.1,
    });
    const seatedGroup = new THREE.Group();
    seatedGroup.position.set(0, height3D * 0.42, 0);

    for (let sIdx = 0; sIdx < Math.min(loadedPassengers, totalCapacity); sIdx++) {
      const zOff = -length3D * 0.22 + (sIdx / (totalCapacity - 1 || 1)) * (length3D * 0.44);
      const passengerHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), pMat);
      passengerHead.position.set((sIdx % 2 === 0 ? -0.22 : 0.22) * (isBus ? 1.2 : 0.9), 0.18, zOff);
      passengerHead.castShadow = true;
      seatedGroup.add(passengerHead);
    }
    vGroup.add(seatedGroup);
  }

  // 6. Side Wing Mirrors with Molded Curved Arms (Matching frame_01.jpg)
  [-width3D * 0.52, width3D * 0.52].forEach((xMirror) => {
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), darkTrimMat);
    const mZ = isCar ? -length3D * 0.22 : -length3D * 0.35;
    const mY = isCar ? height3D * 0.28 : height3D * 0.22;
    mirrorArm.position.set(xMirror, mY, mZ);

    const mirrorHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 0.12),
      bodyMat
    );
    mirrorHead.position.set(xMirror > 0 ? xMirror + 0.04 : xMirror - 0.04, mY, mZ);
    vGroup.add(mirrorArm, mirrorHead);
  });

  // 7. Rounded Headlights with Chrome Bezel Rings (Matching Image 5)
  [-width3D * 0.33, width3D * 0.33].forEach((hlX) => {
    // Chrome Bezel Housing Ring
    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16),
      chromeMat
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(hlX, -height3D * 0.08, -length3D * 0.505);

    // Glowing Warm Light Lens
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 14),
      headlightMat
    );
    lens.position.set(hlX, -height3D * 0.08, -length3D * 0.515);

    vGroup.add(bezel, lens);
  });

  // 8. Taillights & Dynamic Brake Lights (Rear: +Z)
  const tlLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14),
    taillightMat
  );
  tlLeft.rotation.x = Math.PI / 2;
  tlLeft.position.set(-width3D * 0.33, -height3D * 0.08, length3D * 0.505);
  tlLeft.name = 'brake_light_left';
  const tlRight = tlLeft.clone();
  tlRight.position.x = width3D * 0.33;
  tlRight.name = 'brake_light_right';
  vGroup.add(tlLeft, tlRight);

  // 9. Amber Corner Turn Indicators
  [-width3D * 0.44, width3D * 0.44].forEach((xInd) => {
    const ind = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      indicatorMat
    );
    ind.position.set(xInd, -height3D * 0.04, -length3D * 0.48);
    vGroup.add(ind);
  });

  // 10. Selected Ring Highlight
  if (state === VehicleStateType.SELECTED) {
    const selectRing = new THREE.Mesh(
      new THREE.RingGeometry(width3D * 0.75, width3D * 0.95, 24),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    selectRing.rotation.x = -Math.PI / 2;
    selectRing.position.y = -height3D * 0.46;
    vGroup.add(selectRing);
  }

  // 11. Stylized Multi-Lug Toy Wheels (Matching frame_01.jpg & frame_05.jpg)
  const rimColor = rimConfig ? rimConfig.colorHex : 0xf1f5f9;
  const rimRoughness = rimConfig ? rimConfig.roughness : 0.18;
  const rimMetalness = rimConfig ? rimConfig.metalness : 0.82;

  const wx = width3D * 0.52;
  const wz = length3D * 0.32;
  const frontWheels: THREE.Group[] = [];
  const allWheelTires: THREE.Mesh[] = [];

  const wheelPositions = [
    { pos: [wx, -height3D * 0.25, -wz], isFront: true },
    { pos: [-wx, -height3D * 0.25, -wz], isFront: true },
    { pos: [wx, -height3D * 0.25, wz], isFront: false },
    { pos: [-wx, -height3D * 0.25, wz], isFront: false },
  ];

  if (isTruck) {
    wheelPositions.push(
      { pos: [wx, -height3D * 0.25, wz * 0.45], isFront: false },
      { pos: [-wx, -height3D * 0.25, wz * 0.45], isFront: false }
    );
  }

  wheelPositions.forEach(({ pos: [x, y, z], isFront }) => {
    const { wheelGroup, tireMesh } = createStylizedToyWheel(rimColor, rimRoughness, rimMetalness);
    wheelGroup.position.set(x, y, z);
    // Face correct side outwards
    if (x < 0) {
      wheelGroup.rotation.y = Math.PI;
    }
    vGroup.add(wheelGroup);

    allWheelTires.push(tireMesh);
    if (isFront) {
      frontWheels.push(wheelGroup);
    }
  });

  vGroup.userData = {
    vehicleId,
    isBus,
    frontWheels,
    wheelTires: allWheelTires,
    brakeLightMat: taillightMat,
    indicatorMat,
    baseY,
  };

  return {
    group: vGroup,
    frontWheels,
    wheelTires: allWheelTires,
    brakeLightMat: taillightMat,
    indicatorMat,
    baseY,
  };
}
