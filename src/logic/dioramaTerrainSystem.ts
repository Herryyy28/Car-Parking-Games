import * as THREE from 'three';
import { WorldThemeConfig } from './worldThemes.ts';
import { OrganicRoadSystem } from './organicRoadSystem.ts';

/**
 * DioramaTerrainSystem
 * Constructs and manages the high-fidelity 3D miniature diorama environment:
 * - Subdivided variable-height terrain with gentle rolling knolls, scenic mountain ridges,
 *   roadside swales, and a smooth central flat plateau for crisp gameplay.
 * - Non-linear curved road sections (scenic winding parkway, elevated viaduct overpass,
 *   scenic bus roundabout with central landscaped island, and curved merging slipways).
 * - Solid miniature diorama pedestal plinth (museum-grade collector model base skirt).
 * - Architectural details (bridge support piers, guardrails, reflector guideposts, monuments).
 * - World-theme responsive materials and dynamic lighting integration.
 */
export class DioramaTerrainSystem {
  public group: THREE.Group;
  public terrainMesh: THREE.Mesh;
  public plinthMesh: THREE.Mesh;
  public plinthRimMesh: THREE.Mesh;
  public roadsGroup: THREE.Group;
  public viaductGroup: THREE.Group;
  public roundaboutGroup: THREE.Group;

  // Reusable curves for ambient traffic and road geometry
  public scenicParkwayCurve: THREE.CatmullRomCurve3;
  public elevatedViaductCurve: THREE.CatmullRomCurve3;
  public southernRoundaboutCurve: THREE.CatmullRomCurve3;

  // Road & curb mesh references for dynamic world theme updates
  private roadMeshes: THREE.Mesh[] = [];
  private curbMeshes: THREE.Mesh[] = [];
  private terrainMaterial: THREE.MeshStandardMaterial;
  private roadMaterial: THREE.MeshStandardMaterial;
  private curbMaterial: THREE.MeshStandardMaterial;
  private bridgeMaterial: THREE.MeshStandardMaterial;

  constructor(theme: WorldThemeConfig) {
    this.group = new THREE.Group();
    this.group.name = 'DioramaTerrainSystem';

    this.roadsGroup = new THREE.Group();
    this.roadsGroup.name = 'DioramaRoadsGroup';

    this.viaductGroup = new THREE.Group();
    this.viaductGroup.name = 'DioramaViaductGroup';

    this.roundaboutGroup = new THREE.Group();
    this.roundaboutGroup.name = 'DioramaRoundaboutGroup';

    // 1. Shared PBR materials
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: theme.groundColor,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: false,
    });

    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: theme.roadColor,
      roughness: 0.85,
      metalness: 0.12,
    });

    this.curbMaterial = new THREE.MeshStandardMaterial({
      color: theme.curbColor || 0x94a3b8,
      roughness: 0.65,
      metalness: 0.08,
    });

    this.bridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.6,
      metalness: 0.15,
    });

    // 2. Build Sculpted Variable-Height Terrain
    this.terrainMesh = this.buildSculptedTerrain(115, 115, 96, 96);
    this.group.add(this.terrainMesh);

    // 3. Build Miniature Diorama Pedestal Plinth (Collector Display Skirt)
    const { plinth, rim } = this.buildDioramaPlinth(115.5, 115.5, 3.6);
    this.plinthMesh = plinth;
    this.plinthRimMesh = rim;
    this.group.add(this.plinthMesh, this.plinthRimMesh);

    // 4. Build Non-Linear Curved Road Sections
    this.scenicParkwayCurve = this.createScenicParkwaySpline();
    this.elevatedViaductCurve = this.createElevatedViaductSpline();
    this.southernRoundaboutCurve = this.createRoundaboutSpline();

    this.buildNonLinearRoads();
    this.group.add(this.roadsGroup);

    this.buildElevatedViaduct();
    this.group.add(this.viaductGroup);

    this.buildScenicRoundabout();
    this.group.add(this.roundaboutGroup);
  }

  /**
   * Pure mathematical function calculating terrain elevation at any (x, z) world coordinate.
   * Guarantees that the central gameplay board (|x| <= 13, -11 <= z <= 18) remains completely
   * flat at y = -0.04 to prevent any vehicle clipping or occlusion, while outer landscape rolls
   * smoothly into gentle hills, roadside berms, and scenic northern ridges.
   */
  public static getTerrainHeight(x: number, z: number): number {
    const dx = Math.max(0, Math.abs(x) - 13.0);
    const dz = Math.max(0, Math.abs(z - 3.5) - 14.5);
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Hermite smoothstep blend from flat center (0.4) to outer terrain (7.0)
    const blend = THREE.MathUtils.smoothstep(dist, 0.4, 7.0);
    if (blend <= 0.001) {
      return -0.04;
    }

    // Natural undulating terrain harmonic frequencies
    let h = 0.35 +
      Math.sin(x * 0.08) * Math.cos(z * 0.09) * 1.15 +
      Math.cos(x * 0.18 + 0.7) * Math.sin(z * 0.16 - 0.5) * 0.55 +
      Math.sin(x * 0.32 + z * 0.28) * 0.18;

    // Scenic Northern Foothills / Mountain Ridge Backdrop (z < -13.0)
    if (z < -13.0) {
      const northDist = -13.0 - z;
      h += Math.min(3.8, northDist * 0.15 + Math.sin(x * 0.11) * 0.85);
    }

    // Gentle side berms
    const sideDist = Math.max(0, Math.abs(x) - 15.0);
    if (sideDist > 0) {
      h += Math.min(1.6, sideDist * 0.07 + Math.cos(z * 0.14) * 0.45);
    }

    // Prevent excessive dips below water/swale floor
    h = Math.max(-0.18, h);

    // Taper smoothly to 0 at the outer diorama plinth edge
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    if (edgeDist > 44.0) {
      const edgeFactor = THREE.MathUtils.smoothstep(edgeDist, 44.0, 54.0);
      h *= (1.0 - edgeFactor * 0.96);
    }

    return -0.04 + blend * h;
  }

  /**
   * Helper returning road surface Y with slight clearance above terrain
   */
  public static getRoadElevation(x: number, z: number): number {
    return Math.max(0.09, DioramaTerrainSystem.getTerrainHeight(x, z) + 0.09);
  }

  /**
   * Builds the subdivided 3D terrain mesh with variable elevation and computed normals
   */
  private buildSculptedTerrain(
    width: number,
    depth: number,
    segmentsX: number,
    segmentsY: number
  ): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsY);
    // Rotate to world horizontal plane: X is East/West, Z is North/South
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = DioramaTerrainSystem.getTerrainHeight(x, z);
      pos.setY(i, y);
    }

    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.terrainMaterial);
    mesh.name = 'DioramaSculptedTerrain';
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Builds a solid miniature diorama pedestal plinth (collector showcase skirt)
   */
  private buildDioramaPlinth(
    width: number,
    depth: number,
    skirtHeight: number
  ): { plinth: THREE.Mesh; rim: THREE.Mesh } {
    // Pedestal base block
    const plinthGeo = new THREE.BoxGeometry(width, skirtHeight, depth);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x090e17,
      roughness: 0.72,
      metalness: 0.18,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.name = 'DioramaPlinthBase';
    plinth.position.y = -skirtHeight / 2 - 0.02;
    plinth.receiveShadow = true;

    // Beveled accent rim along the top perimeter
    const rimGeo = new THREE.BoxGeometry(width + 0.6, 0.22, depth + 0.6);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate-graphite frame lip
      roughness: 0.5,
      metalness: 0.3,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.name = 'DioramaPlinthRim';
    rim.position.y = -0.11;
    rim.receiveShadow = true;

    return { plinth, rim };
  }

  /**
   * Defines a winding CatmullRom spline for the Scenic Parkway winding through the terrain
   */
  private createScenicParkwaySpline(): THREE.CatmullRomCurve3 {
    const waypoints = [
      new THREE.Vector3(-15.0, DioramaTerrainSystem.getRoadElevation(-15, 18), 18.0),
      new THREE.Vector3(-23.0, DioramaTerrainSystem.getRoadElevation(-23, 11), 11.0),
      new THREE.Vector3(-26.0, DioramaTerrainSystem.getRoadElevation(-26, 0), 0.0),
      new THREE.Vector3(-22.0, DioramaTerrainSystem.getRoadElevation(-22, -11), -11.0),
      new THREE.Vector3(-14.0, DioramaTerrainSystem.getRoadElevation(-14, -18), -18.0),
      new THREE.Vector3(0.0, DioramaTerrainSystem.getRoadElevation(0, -21.5), -21.5),
      new THREE.Vector3(14.0, DioramaTerrainSystem.getRoadElevation(14, -18), -18.0),
      new THREE.Vector3(22.0, DioramaTerrainSystem.getRoadElevation(22, -11), -11.0),
      new THREE.Vector3(26.0, DioramaTerrainSystem.getRoadElevation(26, 0), 0.0),
      new THREE.Vector3(23.0, DioramaTerrainSystem.getRoadElevation(23, 11), 11.0),
      new THREE.Vector3(15.0, DioramaTerrainSystem.getRoadElevation(15, 18), 18.0),
      new THREE.Vector3(0.0, DioramaTerrainSystem.getRoadElevation(0, 19.8), 19.8),
    ];

    return new THREE.CatmullRomCurve3(waypoints, true, 'centripetal');
  }

  /**
   * Defines an elevated viaduct / bridge overpass crossing the northern ridge
   */
  private createElevatedViaductSpline(): THREE.CatmullRomCurve3 {
    const waypoints = [
      new THREE.Vector3(-21.0, 1.25, -14.0),
      new THREE.Vector3(-12.0, 2.45, -17.5),
      new THREE.Vector3(0.0, 3.10, -19.8),
      new THREE.Vector3(12.0, 2.45, -17.5),
      new THREE.Vector3(21.0, 1.25, -14.0),
    ];

    return new THREE.CatmullRomCurve3(waypoints, false, 'centripetal');
  }

  /**
   * Defines a circular / oval scenic bus roundabout turning circle
   */
  private createRoundaboutSpline(): THREE.CatmullRomCurve3 {
    const center = new THREE.Vector3(0, 0.12, 19.8);
    const radius = 5.4;
    const count = 12;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = center.x + Math.sin(angle) * (radius * 1.1); // subtle organic oval
      const z = center.z + Math.cos(angle) * radius;
      points.push(new THREE.Vector3(x, DioramaTerrainSystem.getRoadElevation(x, z), z));
    }

    return new THREE.CatmullRomCurve3(points, true, 'centripetal');
  }

  /**
   * Generates the non-linear curved roads: winding parkway, curbs, stripes, and guardrails
   */
  private buildNonLinearRoads(): void {
    const roadWidth = 4.2;
    const segments = 96;

    // 1. Asphalt ribbon mesh
    const parkwayMesh = OrganicRoadSystem.createCurvedRoadMesh(
      this.scenicParkwayCurve,
      roadWidth,
      segments,
      this.roadMaterial.color.getHex()
    );
    parkwayMesh.name = 'ScenicParkwayMesh';
    this.roadMeshes.push(parkwayMesh);
    this.roadsGroup.add(parkwayMesh);

    // 2. Yellow double dashed center line
    const stripes = OrganicRoadSystem.createCurvedStripes(
      this.scenicParkwayCurve,
      0.24,
      segments,
      0xfacc15
    );
    this.roadsGroup.add(stripes);

    // 3. Concrete curbs on both flanks of the curved road
    const outerCurb = OrganicRoadSystem.createRaisedCurbMesh(
      this.scenicParkwayCurve,
      roadWidth / 2,
      0.35,
      0.18,
      segments,
      this.curbMaterial.color.getHex()
    );
    const innerCurb = OrganicRoadSystem.createRaisedCurbMesh(
      this.scenicParkwayCurve,
      -roadWidth / 2,
      0.35,
      0.18,
      segments,
      this.curbMaterial.color.getHex()
    );
    this.curbMeshes.push(outerCurb, innerCurb);
    this.roadsGroup.add(outerCurb, innerCurb);

    // 4. Roadside reflector guide posts along scenic hill curves
    this.buildReflectorPosts(this.scenicParkwayCurve, roadWidth / 2 + 0.55);
  }

  /**
   * Builds the elevated viaduct / bridge overpass crossing the scenic northern ridge
   */
  private buildElevatedViaduct(): void {
    const bridgeWidth = 4.0;
    const segments = 48;

    // 1. Bridge Road Deck
    const bridgeDeck = OrganicRoadSystem.createCurvedRoadMesh(
      this.elevatedViaductCurve,
      bridgeWidth,
      segments,
      this.roadMaterial.color.getHex()
    );
    bridgeDeck.name = 'ElevatedViaductDeck';
    this.roadMeshes.push(bridgeDeck);
    this.viaductGroup.add(bridgeDeck);

    // 2. White lane stripes along bridge
    const bridgeStripes = OrganicRoadSystem.createCurvedStripes(
      this.elevatedViaductCurve,
      0.22,
      segments,
      0xffffff
    );
    this.viaductGroup.add(bridgeStripes);

    // 3. Concrete Parapet / Guardrail Walls
    const leftBarrier = OrganicRoadSystem.createRaisedCurbMesh(
      this.elevatedViaductCurve,
      -bridgeWidth / 2,
      0.3,
      0.65,
      segments,
      0x94a3b8
    );
    const rightBarrier = OrganicRoadSystem.createRaisedCurbMesh(
      this.elevatedViaductCurve,
      bridgeWidth / 2,
      0.3,
      0.65,
      segments,
      0x94a3b8
    );
    this.curbMeshes.push(leftBarrier, rightBarrier);
    this.viaductGroup.add(leftBarrier, rightBarrier);

    // 4. Concrete Support Piers / Pillars
    const pierXCoords = [-14.0, -7.0, 0.0, 7.0, 14.0];
    const pierGeo = new THREE.CylinderGeometry(0.55, 0.65, 1, 16);
    const pierMat = this.bridgeMaterial;

    pierXCoords.forEach((px) => {
      // Find approximate point along curve with this X
      let closestPoint: THREE.Vector3 | null = null;
      let minDiff = Infinity;
      const pts = this.elevatedViaductCurve.getSpacedPoints(80);
      for (const p of pts) {
        const diff = Math.abs(p.x - px);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = p;
        }
      }

      if (closestPoint) {
        const groundY = DioramaTerrainSystem.getTerrainHeight(closestPoint.x, closestPoint.z);
        const pierHeight = Math.max(0.6, closestPoint.y - groundY);
        const pier = new THREE.Mesh(pierGeo, pierMat);
        pier.scale.set(1, pierHeight, 1);
        pier.position.set(closestPoint.x, groundY + pierHeight / 2, closestPoint.z);
        pier.castShadow = true;
        pier.receiveShadow = true;
        this.viaductGroup.add(pier);
      }
    });
  }

  /**
   * Builds the southern scenic bus roundabout with central landscaped island
   */
  private buildScenicRoundabout(): void {
    const roadWidth = 3.8;
    const segments = 48;

    // 1. Roundabout asphalt loop
    const roundaboutMesh = OrganicRoadSystem.createCurvedRoadMesh(
      this.southernRoundaboutCurve,
      roadWidth,
      segments,
      this.roadMaterial.color.getHex()
    );
    roundaboutMesh.name = 'RoundaboutRoadMesh';
    this.roadMeshes.push(roundaboutMesh);
    this.roundaboutGroup.add(roundaboutMesh);

    // 2. Dash striping
    const roundaboutStripes = OrganicRoadSystem.createCurvedStripes(
      this.southernRoundaboutCurve,
      0.2,
      segments,
      0xfacc15
    );
    this.roundaboutGroup.add(roundaboutStripes);

    // 3. Central Landscaped Island
    const islandCenter = new THREE.Vector3(0, 0, 19.8);
    const islandRadius = 3.2;

    const islandCurbGeo = new THREE.CylinderGeometry(islandRadius, islandRadius + 0.3, 0.35, 32);
    const islandCurb = new THREE.Mesh(islandCurbGeo, this.curbMaterial);
    islandCurb.position.set(islandCenter.x, 0.18, islandCenter.z);
    islandCurb.receiveShadow = true;
    islandCurb.castShadow = true;

    // Turf center
    const islandTurfGeo = new THREE.CylinderGeometry(islandRadius - 0.1, islandRadius - 0.1, 0.4, 32);
    const islandTurf = new THREE.Mesh(islandTurfGeo, this.terrainMaterial);
    islandTurf.position.set(islandCenter.x, 0.22, islandCenter.z);
    islandTurf.receiveShadow = true;

    // Decorative transit sculpture / fountain monument in the center
    const monumentGroup = new THREE.Group();
    monumentGroup.position.set(islandCenter.x, 0.42, islandCenter.z);

    const basePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.0, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.2 })
    );
    basePedestal.position.y = 0.25;
    basePedestal.castShadow = true;

    const brassTransitPylon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, 2.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 })
    );
    brassTransitPylon.position.y = 1.4;
    brassTransitPylon.castShadow = true;

    const topGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.5,
      })
    );
    topGlobe.position.y = 2.65;
    topGlobe.castShadow = true;

    monumentGroup.add(basePedestal, brassTransitPylon, topGlobe);

    this.roundaboutGroup.add(islandCurb, islandTurf, monumentGroup);
  }

  /**
   * Places miniature reflector guide posts and timber posts along the outer road curve
   */
  private buildReflectorPosts(curve: THREE.CatmullRomCurve3, offsetDist: number): void {
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const reflectorMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const reflectorGeo = new THREE.BoxGeometry(0.1, 0.12, 0.1);

    const points = curve.getSpacedPoints(40);
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < points.length; i += 3) {
      const p = points[i];
      let tangent: THREE.Vector3;
      if (i < points.length - 1) {
        tangent = new THREE.Vector3().subVectors(points[i + 1], p).normalize();
      } else {
        tangent = new THREE.Vector3().subVectors(p, points[i - 1]).normalize();
      }

      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const postPos = new THREE.Vector3().copy(p).addScaledVector(side, offsetDist);
      const groundY = DioramaTerrainSystem.getTerrainHeight(postPos.x, postPos.z);

      const postGroup = new THREE.Group();
      postGroup.position.set(postPos.x, groundY + 0.32, postPos.z);

      const postMesh = new THREE.Mesh(postGeo, postMat);
      postMesh.castShadow = true;

      const reflector = new THREE.Mesh(reflectorGeo, reflectorMat);
      reflector.position.y = 0.22;

      postGroup.add(postMesh, reflector);
      this.roadsGroup.add(postGroup);
    }
  }

  /**
   * Dynamically applies world theme colors and materials across all terrain, road, and curb elements
   */
  public applyWorldTheme(theme: WorldThemeConfig): void {
    this.terrainMaterial.color.setHex(theme.groundColor);
    this.roadMaterial.color.setHex(theme.roadColor);
    this.curbMaterial.color.setHex(theme.curbColor || 0x94a3b8);

    this.roadMeshes.forEach((mesh) => {
      if (mesh.material && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.setHex(theme.roadColor);
      }
    });

    this.curbMeshes.forEach((mesh) => {
      if (mesh.material && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.setHex(theme.curbColor || 0x94a3b8);
      }
    });
  }

  /**
   * Cleanly disposes geometries and materials
   */
  public dispose(): void {
    this.terrainMesh.geometry.dispose();
    this.terrainMaterial.dispose();
    this.plinthMesh.geometry.dispose();
    this.plinthRimMesh.geometry.dispose();
    this.roadMaterial.dispose();
    this.curbMaterial.dispose();
    this.bridgeMaterial.dispose();
  }
}
