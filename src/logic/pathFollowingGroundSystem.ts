import * as THREE from 'three';
import { WorldThemeConfig, getWorldConfig } from './worldThemes.ts';
import { OrganicRoadSystem } from './organicRoadSystem.ts';
import { DioramaTerrainSystem } from './dioramaTerrainSystem.ts';

/**
 * PathFollowingGroundSystem
 * Replaces the flat grid plane with a sophisticated path-following diorama terrain system.
 * Generates distinct 3D curved road segments for each of the 8 world themes using
 * extruded CatmullRom spline curves, raised beveled curbs, painted road markings,
 * and contoured pedestal ground geometry that wraps naturally around the paths.
 */
export class PathFollowingGroundSystem {
  public group: THREE.Group;
  public terrainMesh: THREE.Mesh | null = null;
  public plinthMesh: THREE.Mesh | null = null;
  public plinthRimMesh: THREE.Mesh | null = null;
  public roadsGroup: THREE.Group;
  public curbsGroup: THREE.Group;
  public markingsGroup: THREE.Group;

  private currentWorldId = 1;
  private terrainMaterial: THREE.MeshStandardMaterial;
  private roadMaterial: THREE.MeshStandardMaterial;
  private curbMaterial: THREE.MeshStandardMaterial;

  constructor(initialWorldId = 1) {
    this.currentWorldId = initialWorldId;
    this.group = new THREE.Group();
    this.group.name = 'PathFollowingGroundSystem';

    this.roadsGroup = new THREE.Group();
    this.roadsGroup.name = 'PathRoadsGroup';

    this.curbsGroup = new THREE.Group();
    this.curbsGroup.name = 'PathCurbsGroup';

    this.markingsGroup = new THREE.Group();
    this.markingsGroup.name = 'PathMarkingsGroup';

    const theme = getWorldConfig(initialWorldId);

    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: theme.groundColor,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: theme.roadColor,
      roughness: 0.85,
      metalness: 0.12,
    });

    this.curbMaterial = new THREE.MeshStandardMaterial({
      color: theme.curbColor || 0x94a3b8,
      roughness: 0.65,
      metalness: 0.1,
    });

    // 1. Build Base Contoured Ground & Collector Plinth
    this.buildContouredBase();

    // 2. Build World-Specific Curved Road Segments
    this.buildWorldCurvedRoadSegments(initialWorldId);

    this.group.add(this.roadsGroup, this.curbsGroup, this.markingsGroup);
  }

  /**
   * Builds the contoured diorama base with smooth transitions, swales, and collector plinth
   */
  private buildContouredBase(): void {
    const width = 110;
    const depth = 110;
    const segX = 80;
    const segZ = 80;

    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Keep central puzzle lot (-13 <= x <= 13, -11 <= z <= 18) perfectly flat to avoid clipping
      const dx = Math.max(0, Math.abs(x) - 13.5);
      const dz = Math.max(0, Math.abs(z - 3.5) - 14.5);
      const dist = Math.sqrt(dx * dx + dz * dz);
      const blend = THREE.MathUtils.smoothstep(dist, 0.4, 7.5);

      let h = -0.04;
      if (blend > 0.001) {
        h += blend * (
          0.32 +
          Math.sin(x * 0.075) * Math.cos(z * 0.08) * 1.1 +
          Math.cos(x * 0.16 + 0.5) * Math.sin(z * 0.14) * 0.45 +
          (z < -13 ? Math.min(3.5, (-13 - z) * 0.14 + Math.sin(x * 0.1) * 0.75) : 0)
        );
      }
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    this.terrainMesh = new THREE.Mesh(geo, this.terrainMaterial);
    this.terrainMesh.name = 'ContouredPathTerrain';
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);

    // Museum Showcase Plinth Pedestal
    const plinthGeo = new THREE.BoxGeometry(width + 0.5, 3.2, depth + 0.5);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x080d1a,
      roughness: 0.75,
      metalness: 0.2,
    });
    this.plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    this.plinthMesh.position.y = -1.62;
    this.plinthMesh.receiveShadow = true;

    const rimGeo = new THREE.BoxGeometry(width + 1.2, 0.24, depth + 1.2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.35,
    });
    this.plinthRimMesh = new THREE.Mesh(rimGeo, rimMat);
    this.plinthRimMesh.position.y = -0.12;
    this.plinthRimMesh.receiveShadow = true;

    this.group.add(this.plinthMesh, this.plinthRimMesh);
  }

  /**
   * Defines and creates distinct curved road segments for each of the 8 world themes
   */
  public buildWorldCurvedRoadSegments(worldId: number): void {
    // Clear existing road segments
    this.clearRoadSegments();

    const safeWorldId = Math.min(8, Math.max(1, worldId));
    this.currentWorldId = safeWorldId;
    const theme = getWorldConfig(safeWorldId);

    // Update material colors
    this.terrainMaterial.color.setHex(theme.groundColor);
    this.roadMaterial.color.setHex(theme.roadColor);
    this.curbMaterial.color.setHex(theme.curbColor || 0x94a3b8);

    const roadColorHex = theme.roadColor;
    const curbColorHex = theme.curbColor || 0x94a3b8;

    // Define 8 distinct curved spline layouts for each world theme
    switch (safeWorldId) {
      // ---------------------------------------------------------
      // WORLD 1 — City Parking: Gentle suburban parkway curves & dual feeder loops
      // ---------------------------------------------------------
      case 1: {
        const parkwayCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-22, 0.08, 20),
          new THREE.Vector3(-26, 0.08, 8),
          new THREE.Vector3(-24, 0.08, -6),
          new THREE.Vector3(-16, 0.08, -18),
          new THREE.Vector3(0, 0.08, -21),
          new THREE.Vector3(16, 0.08, -18),
          new THREE.Vector3(24, 0.08, -6),
          new THREE.Vector3(26, 0.08, 8),
          new THREE.Vector3(22, 0.08, 20),
        ]);
        this.addCurvedRoadSegment(parkwayCurve, 4.4, roadColorHex, curbColorHex, true, 0xfacc15);

        // Entry slip curve
        const entrySlipCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-14, 0.08, 18),
          new THREE.Vector3(-10, 0.08, 12),
          new THREE.Vector3(-8.5, 0.08, 4),
        ]);
        this.addCurvedRoadSegment(entrySlipCurve, 3.6, roadColorHex, curbColorHex, false);
        break;
      }

      // ---------------------------------------------------------
      // WORLD 2 — Transit Terminal: Sweeping dual-radius transit express bypass lanes
      // ---------------------------------------------------------
      case 2: {
        const westExpressCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-20, 0.08, 22),
          new THREE.Vector3(-25, 0.08, 10),
          new THREE.Vector3(-23, 0.08, -8),
          new THREE.Vector3(-12, 0.08, -19),
          new THREE.Vector3(0, 0.08, -22),
        ]);
        const eastExpressCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.08, -22),
          new THREE.Vector3(12, 0.08, -19),
          new THREE.Vector3(23, 0.08, -8),
          new THREE.Vector3(25, 0.08, 10),
          new THREE.Vector3(20, 0.08, 22),
        ]);
        this.addCurvedRoadSegment(westExpressCurve, 5.0, roadColorHex, curbColorHex, true, 0x38bdf8);
        this.addCurvedRoadSegment(eastExpressCurve, 5.0, roadColorHex, curbColorHex, true, 0x38bdf8);

        // Terminal Concourse Bus Slip
        const concourseSlip = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-15, 0.08, -6.8),
          new THREE.Vector3(0, 0.08, -7.2),
          new THREE.Vector3(15, 0.08, -6.8),
        ]);
        this.addCurvedRoadSegment(concourseSlip, 4.8, roadColorHex, curbColorHex, true, 0xfacc15);
        break;
      }

      // ---------------------------------------------------------
      // WORLD 3 — Downtown Skyline: High-density chicane S-curves with elevated viaduct
      // ---------------------------------------------------------
      case 3: {
        const chicaneCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-28, 0.08, 16),
          new THREE.Vector3(-18, 0.08, 14),
          new THREE.Vector3(-22, 0.08, -2),
          new THREE.Vector3(-16, 0.08, -16),
          new THREE.Vector3(0, 0.08, -18),
          new THREE.Vector3(16, 0.08, -16),
          new THREE.Vector3(22, 0.08, -2),
          new THREE.Vector3(18, 0.08, 14),
          new THREE.Vector3(28, 0.08, 16),
        ]);
        this.addCurvedRoadSegment(chicaneCurve, 4.6, roadColorHex, curbColorHex, true, 0xd946ef);

        // Elevated Skyline Overpass Curve
        const overpassCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-22, 1.4, -14),
          new THREE.Vector3(-10, 2.6, -18),
          new THREE.Vector3(0, 3.2, -20),
          new THREE.Vector3(10, 2.6, -18),
          new THREE.Vector3(22, 1.4, -14),
        ]);
        this.addCurvedRoadSegment(overpassCurve, 4.0, roadColorHex, 0xc084fc, true, 0xffffff);
        break;
      }

      // ---------------------------------------------------------
      // WORLD 4 — Palm Beach Harbor: Coastal serpentine shoreline curve & marina loop
      // ---------------------------------------------------------
      case 4: {
        const coastalSerpentine = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-26, 0.08, 22),
          new THREE.Vector3(-22, 0.08, 12),
          new THREE.Vector3(-26, 0.08, 0),
          new THREE.Vector3(-20, 0.08, -12),
          new THREE.Vector3(-8, 0.08, -20),
          new THREE.Vector3(8, 0.08, -20),
          new THREE.Vector3(20, 0.08, -12),
          new THREE.Vector3(26, 0.08, 0),
          new THREE.Vector3(22, 0.08, 12),
          new THREE.Vector3(26, 0.08, 22),
        ]);
        this.addCurvedRoadSegment(coastalSerpentine, 4.8, roadColorHex, curbColorHex, true, 0x06b6d4);

        // Marina Circular Turnaround Loop
        const marinaLoop = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.08, 17),
          new THREE.Vector3(4.5, 0.08, 20.5),
          new THREE.Vector3(0, 0.08, 24),
          new THREE.Vector3(-4.5, 0.08, 20.5),
        ], true);
        this.addCurvedRoadSegment(marinaLoop, 3.8, roadColorHex, curbColorHex, true, 0xf97316);
        break;
      }

      // ---------------------------------------------------------
      // WORLD 5 — Airport Express: Wide aerodynamic runway taxiway curves
      // ---------------------------------------------------------
      case 5: {
        const taxiwayCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-28, 0.08, 18),
          new THREE.Vector3(-24, 0.08, 4),
          new THREE.Vector3(-18, 0.08, -14),
          new THREE.Vector3(0, 0.08, -20),
          new THREE.Vector3(18, 0.08, -14),
          new THREE.Vector3(24, 0.08, 4),
          new THREE.Vector3(28, 0.08, 18),
        ]);
        this.addCurvedRoadSegment(taxiwayCurve, 5.6, roadColorHex, curbColorHex, true, 0x38bdf8);

        // High-Speed Perimeter Departure Ramp
        const departureRamp = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-16, 0.08, 20),
          new THREE.Vector3(-14, 0.08, 8),
          new THREE.Vector3(-10, 0.08, -4),
          new THREE.Vector3(-6, 0.08, -8),
        ]);
        this.addCurvedRoadSegment(departureRamp, 4.0, roadColorHex, curbColorHex, false);
        break;
      }

      // ---------------------------------------------------------
      // WORLD 6 — Carnival Fairground: Playful cloverleaf loops & festive roundabout arcs
      // ---------------------------------------------------------
      case 6: {
        const festiveMidwayCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-24, 0.08, 22),
          new THREE.Vector3(-18, 0.08, 10),
          new THREE.Vector3(-24, 0.08, -4),
          new THREE.Vector3(-14, 0.08, -18),
          new THREE.Vector3(0, 0.08, -16),
          new THREE.Vector3(14, 0.08, -18),
          new THREE.Vector3(24, 0.08, -4),
          new THREE.Vector3(18, 0.08, 10),
          new THREE.Vector3(24, 0.08, 22),
        ]);
        this.addCurvedRoadSegment(festiveMidwayCurve, 4.5, roadColorHex, curbColorHex, true, 0xec4899);

        // Playful Carousel Roundabout Circle
        const carouselRoundabout = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.08, 18),
          new THREE.Vector3(5, 0.08, 21.5),
          new THREE.Vector3(0, 0.08, 25),
          new THREE.Vector3(-5, 0.08, 21.5),
        ], true);
        this.addCurvedRoadSegment(carouselRoundabout, 4.0, roadColorHex, curbColorHex, true, 0xfacc15);
        break;
      }

      // ---------------------------------------------------------
      // WORLD 7 — Sunset Promenade: Grand panoramic sunset boulevard curve
      // ---------------------------------------------------------
      case 7: {
        const sunsetBoulevard = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-26, 0.08, 24),
          new THREE.Vector3(-22, 0.08, 10),
          new THREE.Vector3(-20, 0.08, -6),
          new THREE.Vector3(-12, 0.08, -18),
          new THREE.Vector3(0, 0.08, -21),
          new THREE.Vector3(12, 0.08, -18),
          new THREE.Vector3(20, 0.08, -6),
          new THREE.Vector3(22, 0.08, 10),
          new THREE.Vector3(26, 0.08, 24),
        ]);
        this.addCurvedRoadSegment(sunsetBoulevard, 5.2, roadColorHex, curbColorHex, true, 0xfbbf24);

        // Golden Hour Scenic Overlook Turnout
        const scenicTurnout = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-10, 0.08, -19),
          new THREE.Vector3(0, 0.08, -23.5),
          new THREE.Vector3(10, 0.08, -19),
        ]);
        this.addCurvedRoadSegment(scenicTurnout, 3.6, roadColorHex, curbColorHex, false);
        break;
      }

      // ---------------------------------------------------------
      // WORLD 8 — Alpine Valley / Cyber District: Serpentine mountain switchback hairpin curves
      // ---------------------------------------------------------
      case 8: {
        const switchbackCurve1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-26, 0.08, 22),
          new THREE.Vector3(-20, 0.08, 12),
          new THREE.Vector3(-27, 0.08, 2),
          new THREE.Vector3(-18, 0.08, -8),
          new THREE.Vector3(-24, 0.08, -18),
          new THREE.Vector3(-10, 0.08, -22),
          new THREE.Vector3(0, 0.08, -20),
        ]);
        const switchbackCurve2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.08, -20),
          new THREE.Vector3(10, 0.08, -22),
          new THREE.Vector3(24, 0.08, -18),
          new THREE.Vector3(18, 0.08, -8),
          new THREE.Vector3(27, 0.08, 2),
          new THREE.Vector3(20, 0.08, 12),
          new THREE.Vector3(26, 0.08, 22),
        ]);
        this.addCurvedRoadSegment(switchbackCurve1, 4.4, roadColorHex, curbColorHex, true, 0x00f5ff);
        this.addCurvedRoadSegment(switchbackCurve2, 4.4, roadColorHex, curbColorHex, true, 0x00f5ff);
        break;
      }
    }
  }

  /**
   * Helper that builds an extruded curved road mesh, raised curbs, and center stripes along a CatmullRom spline
   */
  private addCurvedRoadSegment(
    curve: THREE.CatmullRomCurve3,
    roadWidth = 4.2,
    roadColorHex = 0x1e293b,
    curbColorHex = 0x94a3b8,
    addStripes = true,
    stripeColorHex = 0xfacc15
  ): void {
    const segments = 64;

    // 1. Asphalt Road Mesh
    const roadMesh = OrganicRoadSystem.createCurvedRoadMesh(curve, roadWidth, segments, roadColorHex);
    roadMesh.receiveShadow = true;
    this.roadsGroup.add(roadMesh);

    // 2. Concrete Curbs
    const outerCurb = OrganicRoadSystem.createRaisedCurbMesh(curve, roadWidth / 2, 0.35, 0.18, segments, curbColorHex);
    const innerCurb = OrganicRoadSystem.createRaisedCurbMesh(curve, -roadWidth / 2, 0.35, 0.18, segments, curbColorHex);
    outerCurb.castShadow = true;
    outerCurb.receiveShadow = true;
    innerCurb.castShadow = true;
    innerCurb.receiveShadow = true;
    this.curbsGroup.add(outerCurb, innerCurb);

    // 3. Center Stripes
    if (addStripes) {
      const stripes = OrganicRoadSystem.createCurvedStripes(curve, 0.22, segments, stripeColorHex);
      this.markingsGroup.add(stripes);
    }
  }

  private clearRoadSegments(): void {
    const disposeGroup = (grp: THREE.Group) => {
      while (grp.children.length > 0) {
        const obj = grp.children[0];
        grp.remove(obj);
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        }
      }
    };

    disposeGroup(this.roadsGroup);
    disposeGroup(this.curbsGroup);
    disposeGroup(this.markingsGroup);
  }

  public updateWorldGround(worldId: number): void {
    if (this.currentWorldId === worldId) return;
    this.buildWorldCurvedRoadSegments(worldId);
  }

  public dispose(): void {
    this.clearRoadSegments();
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      this.group.remove(this.terrainMesh);
    }
    if (this.plinthMesh) {
      this.plinthMesh.geometry.dispose();
      this.group.remove(this.plinthMesh);
    }
    if (this.plinthRimMesh) {
      this.plinthRimMesh.geometry.dispose();
      this.group.remove(this.plinthRimMesh);
    }
  }
}
