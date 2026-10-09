import * as THREE from 'three';
import { WorldThemeConfig, getWorldConfig } from '../logic/worldThemes.ts';
import { DioramaTerrainSystem } from './dioramaTerrainSystem.ts';

/**
 * BackgroundEnvironmentManager
 * Dynamically constructs, manages, and swaps 3D environmental props,
 * lighting, materials, buildings, trees, street signs, and decorations
 * around the BusMadnessArena according to the currently active World.
 */
export class BackgroundEnvironmentManager {
  private scene: THREE.Scene;
  private propsContainer: THREE.Group;
  private animatedProps: Array<{
    mesh: THREE.Object3D;
    type: 'bob' | 'rotate' | 'balloon' | 'beacon' | 'wind';
    speed: number;
    initialY: number;
    offset: number;
  }> = [];

  private resolveTerrainY(x: number, y: number, z: number): number {
    if (y !== 0) return y;
    const th = DioramaTerrainSystem.getTerrainHeight(x, z);
    return Math.max(0, th);
  }

  // Theme reference pointers for dynamic material color updates
  private groundMesh: THREE.Mesh | null = null;
  private roadMesh: THREE.Mesh | null = null;
  private puzzlePadMesh: THREE.Mesh | null = null;
  private terminalBuildingMesh: THREE.Mesh | null = null;
  private terminalRoofMesh: THREE.Mesh | null = null;
  private sidewalkMesh: THREE.Mesh | null = null;
  private directionalSun: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private skyFillLight: THREE.DirectionalLight | null = null;
  private hemiLightRef: THREE.HemisphereLight | null = null;
  private gridHelperRef: THREE.GridHelper | null = null;
  private safetyCones: THREE.Mesh[] = [];

  private currentWorldId: number = -1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.propsContainer = new THREE.Group();
    this.propsContainer.name = 'WorldEnvironmentProps';
    this.scene.add(this.propsContainer);
  }

  /**
   * Register primary static arena meshes so their material palettes
   * dynamically update to match the active World theme.
   */
  public registerArenaElements(elements: {
    ground: THREE.Mesh;
    road: THREE.Mesh;
    puzzlePad: THREE.Mesh;
    terminalBuilding: THREE.Mesh;
    terminalRoof: THREE.Mesh;
    sidewalk: THREE.Mesh;
    sunLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    skyFill: THREE.DirectionalLight;
    hemiLight?: THREE.HemisphereLight;
    gridHelper?: THREE.GridHelper;
    cones?: THREE.Mesh[];
  }): void {
    this.groundMesh = elements.ground;
    this.roadMesh = elements.road;
    this.puzzlePadMesh = elements.puzzlePad;
    this.terminalBuildingMesh = elements.terminalBuilding;
    this.terminalRoofMesh = elements.terminalRoof;
    this.sidewalkMesh = elements.sidewalk;
    this.directionalSun = elements.sunLight;
    this.ambientLight = elements.ambientLight;
    this.skyFillLight = elements.skyFill;
    if (elements.hemiLight) this.hemiLightRef = elements.hemiLight;
    if (elements.gridHelper) this.gridHelperRef = elements.gridHelper;
    if (elements.cones) this.safetyCones = elements.cones;
  }

  /**
   * Updates all environmental props, buildings, scenery, and lighting
   * to match the designated worldId.
   */
  public applyWorldTheme(worldId: number): void {
    if (this.currentWorldId === worldId) return;
    this.currentWorldId = worldId;

    const theme = getWorldConfig(worldId);

    // 1. Update Scene Sky, Fog, and Lighting
    this.scene.background = new THREE.Color(theme.skyColor);
    // Clean Linear Fog: only gently softens distant background horizons (75 to 160 units),
    // keeping the entire puzzle arena, vehicles, and road 100% crystal-clear with zero fog washout
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.set(theme.fogColor);
      this.scene.fog.near = 75;
      this.scene.fog.far = 160;
    } else {
      this.scene.fog = new THREE.Fog(theme.fogColor, 75, 160);
    }

    if (this.directionalSun) {
      this.directionalSun.color.set(theme.sunLightColor);
      this.directionalSun.intensity = theme.sunIntensity;
    }

    if (this.ambientLight) {
      this.ambientLight.color.set(theme.ambientLightColor);
      this.ambientLight.intensity = theme.ambientIntensity;
    }

    if (this.hemiLightRef) {
      this.hemiLightRef.color.set(theme.hemiSkyColor);
      this.hemiLightRef.groundColor.set(theme.hemiGroundColor);
    }

    if (this.skyFillLight) {
      this.skyFillLight.color.set(theme.accentGlowColor);
    }

    // 2. Update Ground, Roads, and Terminal Architecture
    if (this.groundMesh && (this.groundMesh.material as THREE.MeshStandardMaterial)) {
      (this.groundMesh.material as THREE.MeshStandardMaterial).color.set(theme.groundColor);
    }
    if (this.roadMesh && (this.roadMesh.material as THREE.MeshStandardMaterial)) {
      (this.roadMesh.material as THREE.MeshStandardMaterial).color.set(theme.roadColor);
    }
    if (this.puzzlePadMesh && (this.puzzlePadMesh.material as THREE.MeshStandardMaterial)) {
      (this.puzzlePadMesh.material as THREE.MeshStandardMaterial).color.set(theme.puzzlePadColor);
    }
    if (this.terminalBuildingMesh && (this.terminalBuildingMesh.material as THREE.MeshStandardMaterial)) {
      (this.terminalBuildingMesh.material as THREE.MeshStandardMaterial).color.set(theme.terminalBuildingColor);
    }
    if (this.terminalRoofMesh && (this.terminalRoofMesh.material as THREE.MeshStandardMaterial)) {
      (this.terminalRoofMesh.material as THREE.MeshStandardMaterial).color.set(theme.terminalRoofColor);
    }
    if (this.sidewalkMesh && (this.sidewalkMesh.material as THREE.MeshStandardMaterial)) {
      (this.sidewalkMesh.material as THREE.MeshStandardMaterial).color.set(theme.sidewalkColor);
    }
    this.safetyCones.forEach((cone) => {
      if (cone.material && cone.material instanceof THREE.MeshStandardMaterial) {
        cone.material.color.set(theme.coneColor);
      }
    });

    // 3. Clear existing dynamic 3D props
    this.clearProps();

    // 4. Populate theme-specific 3D environment props
    this.buildWorldProps(theme);
  }

  /**
   * Destroys existing props and frees geometry/material resources.
   */
  private clearProps(): void {
    this.animatedProps = [];
    while (this.propsContainer.children.length > 0) {
      const child = this.propsContainer.children[0];
      this.propsContainer.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
    }
  }

  /**
   * Construct 3D thematic environmental props around the puzzle perimeter:
   * Trees, Street Signs, Buildings, Lamps, Foliage, and Ambient Details.
   */
  private buildWorldProps(theme: WorldThemeConfig): void {
    switch (theme.propType) {
      case 'city':
        this.buildCityProps(theme);
        break;
      case 'station':
        this.buildStationProps(theme);
        break;
      case 'downtown':
        this.buildDowntownProps(theme);
        break;
      case 'beach':
        this.buildBeachProps(theme);
        break;
      case 'airport':
        this.buildAirportProps(theme);
        break;
      case 'festival':
        this.buildFestivalProps(theme);
        break;
      case 'sunset':
      case 'night':
        this.buildNightCityProps(theme);
        break;
      case 'mountain':
        this.buildMountainProps(theme);
        break;
      default:
        this.buildCityProps(theme);
        break;
    }

    // Always add World Entrance Totem & Street Signs
    this.buildWorldSignboard(theme);
  }

  // ========================================================
  // WORLD 1: CITY PROPS (Colorful Boutique Storefronts, Puffy Trees, Flower Planters)
  // ========================================================
  private buildCityProps(theme: WorldThemeConfig): void {
    // 1. Charming Row of Boutique Storefronts directly visible behind Bus Station
    // Storefront 1: Pastel Peach Bakery / Cafe with red & white striped awning
    this.createStorefrontBuilding(-6.2, 0, -17.5, 3.6, 5.2, 3.4, 0xfda4af, 0xffffff, 0xef4444, 0xffffff);
    // Storefront 2: Mint Green Bookstore / Boutique with emerald awning
    this.createStorefrontBuilding(-2.1, 0, -17.0, 3.8, 6.0, 3.6, 0x86efac, 0xffffff, 0x059669, 0xffffff);
    // Storefront 3: Warm Sunshine Yellow Cafe with orange & white awning
    this.createStorefrontBuilding(2.1, 0, -17.0, 3.8, 5.6, 3.6, 0xfde047, 0xffffff, 0xf97316, 0xffffff);
    // Storefront 4: Sky Blue Corner Deli with royal blue awning
    this.createStorefrontBuilding(6.2, 0, -17.5, 3.6, 5.4, 3.4, 0x93c5fd, 0xffffff, 0x3b82f6, 0xffffff);

    // 2. Stylized Fluffy Trees planted along the sidewalk behind the terminal
    this.createStylizedTree(-8.6, 0, -14.6, 1.1);
    this.createStylizedTree(-4.2, 0, -14.6, 0.95);
    this.createStylizedTree(4.2, 0, -14.6, 0.95);
    this.createStylizedTree(8.6, 0, -14.6, 1.1);

    // 3. Flanking Trees & Planters framing the puzzle board within the camera FOV (x = ±8.2)
    this.createStylizedTree(-8.2, 0, -1.0, 1.0);
    this.createStylizedTree(-8.5, 0, 5.5, 1.15);
    this.createStylizedTree(-8.2, 0, 11.5, 1.0);
    this.createStylizedTree(8.2, 0, -1.0, 1.0);
    this.createStylizedTree(8.5, 0, 5.5, 1.15);
    this.createStylizedTree(8.2, 0, 11.5, 1.0);

    // 4. Vibrant Flowering Planter Boxes
    this.createFlowerPlanter(-6.8, 0, -13.2, 0xec4899);
    this.createFlowerPlanter(6.8, 0, -13.2, 0xf59e0b);
    this.createFlowerPlanter(-7.8, 0, 2.2, 0xef4444);
    this.createFlowerPlanter(7.8, 0, 2.2, 0x10b981);
    this.createFlowerPlanter(-7.8, 0, 8.5, 0x8b5cf6);
    this.createFlowerPlanter(7.8, 0, 8.5, 0x06b6d4);

    // 5. Stylized Park Benches along flanking sidewalks
    this.createBench(-7.8, 0, 5.2, Math.PI / 2);
    this.createBench(7.8, 0, 5.2, -Math.PI / 2);

    // 6. Modern Warm Street Lamps
    this.createModernLamp(-7.5, 0, -4.2);
    this.createModernLamp(7.5, 0, -4.2);
    this.createModernLamp(-7.5, 0, 13.8);
    this.createModernLamp(7.5, 0, 13.8);

    // 7. Buoyant Festive Floating Balloon Bunches
    this.createBalloonBunch(-7.2, 0, -13.8);
    this.createBalloonBunch(7.2, 0, -13.8);

    // 8. Street Traffic Signs
    this.createTrafficSign(-6.8, 0, -4.8, 'STOP');
    this.createTrafficSign(6.8, 0, -4.8, 'ONEWAY');
  }

  // ========================================================
  // WORLD 2: STATION PROPS (Platforms, Transit Signs, Shelters)
  // ========================================================
  private buildStationProps(theme: WorldThemeConfig): void {
    // Modern Transit Hub Storefronts & Station Wings
    this.createStorefrontBuilding(-6.2, 0, -17.5, 3.6, 5.8, 3.5, 0x93c5fd, 0xffffff, 0x0284c7, 0xffffff);
    this.createStorefrontBuilding(-2.1, 0, -17.0, 3.8, 6.8, 3.8, 0x60a5fa, 0xffffff, 0x1d4ed8, 0xffffff);
    this.createStorefrontBuilding(2.1, 0, -17.0, 3.8, 6.8, 3.8, 0x38bdf8, 0xffffff, 0x0369a1, 0xffffff);
    this.createStorefrontBuilding(6.2, 0, -17.5, 3.6, 5.8, 3.5, 0xa5b4fc, 0xffffff, 0x4f46e5, 0xffffff);

    // Station Canopy Shelters along sidewalks
    this.createStationShelter(-7.8, 0, 3.5);
    this.createStationShelter(7.8, 0, 3.5);

    // Transit Route Signs & Clocks
    this.createClockTower(-7.5, 0, -4.5);
    this.createTransitBoard(7.5, 0, -4.5);

    // Modern Street Lamps with Blue Neon Glow
    this.createNeonLamp(-7.5, 0, 9.5, 0x38bdf8);
    this.createNeonLamp(7.5, 0, 9.5, 0x38bdf8);

    // Ticket vending kiosks
    this.createKiosk(-7.8, 0, 6.5, 0xfacc15);
    this.createKiosk(7.8, 0, 6.5, 0x10b981);

    // Stylized trees
    this.createStylizedTree(-8.5, 0, -1.0, 1.0);
    this.createStylizedTree(8.5, 0, -1.0, 1.0);
  }

  // ========================================================
  // WORLD 3: DOWNTOWN PROPS (Skyscrapers, Storefronts, Signals)
  // ========================================================
  private buildDowntownProps(theme: WorldThemeConfig): void {
    // Downtown Vibrant Storefronts & Mid-Rise Towers
    this.createStorefrontBuilding(-6.2, 0, -17.5, 3.6, 6.5, 3.5, 0xc084fc, 0xffffff, 0x7e22ce, 0xffffff);
    this.createStorefrontBuilding(-2.1, 0, -17.0, 3.8, 8.0, 3.8, 0x818cf8, 0xffffff, 0x3730a3, 0xffffff);
    this.createStorefrontBuilding(2.1, 0, -17.0, 3.8, 7.5, 3.8, 0xa78bfa, 0xffffff, 0x581c87, 0xffffff);
    this.createStorefrontBuilding(6.2, 0, -17.5, 3.6, 6.2, 3.5, 0x38bdf8, 0xffffff, 0x0284c7, 0xffffff);

    // Traffic Light Gantries with glowing colored signals
    this.createTrafficSignal(-7.5, 0, -4.5);
    this.createTrafficSignal(7.5, 0, -4.5);

    // Modern Planters with Shrubs
    this.createModernPlanter(-7.8, 0, 4.5);
    this.createModernPlanter(-7.8, 0, 9.5);
    this.createModernPlanter(7.8, 0, 4.5);
    this.createModernPlanter(7.8, 0, 9.5);

    this.createStylizedTree(-8.4, 0, 0, 1.0);
    this.createStylizedTree(8.4, 0, 0, 1.0);
  }

  // ========================================================
  // WORLD 4: BEACH PROPS (Palm Trees, Surfboards, Tiki Huts)
  // ========================================================
  private buildBeachProps(theme: WorldThemeConfig): void {
    // Tropical Storefronts / Surf Shops
    this.createStorefrontBuilding(-6.2, 0, -17.5, 3.6, 5.0, 3.4, 0xfed7aa, 0xffffff, 0xf97316, 0xffffff);
    this.createStorefrontBuilding(-2.1, 0, -17.0, 3.8, 5.4, 3.6, 0xa7f3d0, 0xffffff, 0x059669, 0xffffff);
    this.createStorefrontBuilding(2.1, 0, -17.0, 3.8, 5.2, 3.6, 0xbae6fd, 0xffffff, 0x0284c7, 0xffffff);
    this.createStorefrontBuilding(6.2, 0, -17.5, 3.6, 5.0, 3.4, 0xfbcfe8, 0xffffff, 0xdb2777, 0xffffff);

    // Tropical Palm Trees
    this.createPalmTree(-8.2, 0, -14.2);
    this.createPalmTree(-8.4, 0, 1.5);
    this.createPalmTree(-8.4, 0, 8.5);
    this.createPalmTree(8.2, 0, -14.2);
    this.createPalmTree(8.4, 0, 1.5);
    this.createPalmTree(8.4, 0, 8.5);

    // Colorful Surfboards planted in the sand
    this.createSurfboard(-7.5, 0, 4.5, 0xef4444);
    this.createSurfboard(-7.7, 0, 5.2, 0xfacc15);
    this.createSurfboard(7.5, 0, 4.5, 0xec4899);
    this.createSurfboard(7.7, 0, 5.2, 0x10b981);

    // Beach Umbrellas
    this.createBeachUmbrella(-7.8, 0, 11.5, 0xf43f5e);
    this.createBeachUmbrella(7.8, 0, 11.5, 0x0ea5e9);
  }

  // ========================================================
  // WORLD 5: AIRPORT PROPS (Runway Radar, Wind Tents, Luggage)
  // ========================================================
  private buildAirportProps(theme: WorldThemeConfig): void {
    // Modern Aero Terminal Pavilions
    this.createStorefrontBuilding(-6.2, 0, -17.5, 3.6, 5.5, 3.5, 0x94a3b8, 0xffffff, 0x3b82f6, 0xffffff);
    this.createStorefrontBuilding(-2.1, 0, -17.0, 3.8, 6.2, 3.8, 0x64748b, 0xffffff, 0xf59e0b, 0xffffff);
    this.createStorefrontBuilding(2.1, 0, -17.0, 3.8, 6.2, 3.8, 0x64748b, 0xffffff, 0xf59e0b, 0xffffff);
    this.createStorefrontBuilding(6.2, 0, -17.5, 3.6, 5.5, 3.5, 0x94a3b8, 0xffffff, 0x3b82f6, 0xffffff);

    // Rotating Radar Dish & Wind Sock
    this.createRadarDish(-7.5, 0, -4.5);
    this.createWindSock(7.5, 0, -4.5);

    // Runway Strobe Light Pylons
    this.createRunwayPylon(-7.8, 0, 3.0);
    this.createRunwayPylon(-7.8, 0, 9.5);
    this.createRunwayPylon(7.8, 0, 3.0);
    this.createRunwayPylon(7.8, 0, 9.5);

    // Luggage Carts
    this.createLuggageCart(-7.6, 0, 6.2);
    this.createLuggageCart(7.6, 0, 6.2);
  }

  // ========================================================
  // WORLD 6: FESTIVAL PROPS (Balloons, Flags, Carnival Tents)
  // ========================================================
  private buildFestivalProps(theme: WorldThemeConfig): void {
    // Carnival Candy Stalls & Booths
    this.createStorefrontBuilding(-6.2, 0, -17.5, 3.6, 5.2, 3.4, 0xf472b6, 0xffffff, 0xfacc15, 0xf43f5e);
    this.createStorefrontBuilding(-2.1, 0, -17.0, 3.8, 5.8, 3.6, 0xa78bfa, 0xffffff, 0x38bdf8, 0x8b5cf6);
    this.createStorefrontBuilding(2.1, 0, -17.0, 3.8, 5.8, 3.6, 0x38bdf8, 0xffffff, 0xf43f5e, 0x06b6d4);
    this.createStorefrontBuilding(6.2, 0, -17.5, 3.6, 5.2, 3.4, 0xfde047, 0xffffff, 0x10b981, 0xf59e0b);

    // Floating Festive Balloon Bunches
    this.createBalloonBunch(-8.0, 0, -14.2);
    this.createBalloonBunch(-8.0, 0, 3.0);
    this.createBalloonBunch(-8.0, 0, 10.0);
    this.createBalloonBunch(8.0, 0, -14.2);
    this.createBalloonBunch(8.0, 0, 3.0);
    this.createBalloonBunch(8.0, 0, 10.0);

    // Colorful Pennant Bunting Poles
    this.createPennantBunting(-7.5, 0, -4.5);
    this.createPennantBunting(7.5, 0, -4.5);

    // Popcorn & Ticket Booth
    this.createFestivalStall(-7.8, 0, 6.5, 0xf43f5e);
    this.createFestivalStall(7.8, 0, 6.5, 0x10b981);
  }

  // ========================================================
  // WORLD 7: NIGHT PROPS (Neon Towers, Cyber Signs, Beacons)
  // ========================================================
  private buildNightCityProps(theme: WorldThemeConfig): void {
    // Sleek Night City Storefronts with Glowing Neon Trim
    this.createStorefrontBuilding(-6.2, 0, -17.5, 3.6, 6.2, 3.5, 0x1e1b4b, 0x06b6d4, 0x06b6d4, 0x3b82f6);
    this.createStorefrontBuilding(-2.1, 0, -17.0, 3.8, 7.5, 3.8, 0x0f172a, 0xd946ef, 0xd946ef, 0x8b5cf6);
    this.createStorefrontBuilding(2.1, 0, -17.0, 3.8, 7.5, 3.8, 0x0f172a, 0x22c55e, 0x22c55e, 0x10b981);
    this.createStorefrontBuilding(6.2, 0, -17.5, 3.6, 6.2, 3.5, 0x1e1b4b, 0xfacc15, 0xfacc15, 0xf97316);

    // Glowing Neon Hologram Totems
    this.createNeonTotem(-7.8, 0, 2.0, 0x06b6d4);
    this.createNeonTotem(-7.8, 0, 8.5, 0xd946ef);
    this.createNeonTotem(7.8, 0, 2.0, 0x22c55e);
    this.createNeonTotem(7.8, 0, 8.5, 0xec4899);

    // Searchlight Beacons into the night sky
    this.createSearchlightBeacon(-7.5, 0, -5.0, 0x06b6d4);
    this.createSearchlightBeacon(7.5, 0, -5.0, 0xa855f7);
  }

  // ========================================================
  // WORLD 8: MOUNTAIN PROPS (Pine Trees, Timber Lodges, Rocks)
  // ========================================================
  private buildMountainProps(theme: WorldThemeConfig): void {
    // Alpine Timber Cabins
    this.createTimberCabin(-6.2, 0, -17.5, 0x78350f, 0x451a03);
    this.createTimberCabin(6.2, 0, -17.5, 0x92400e, 0x451a03);

    // Conifer Pine Trees with layered green foliage
    this.createPineTree(-8.2, 0, -14.2, 1.2);
    this.createPineTree(-8.2, 0, 1.5, 1.2);
    this.createPineTree(-8.4, 0, 6.5, 1.0);
    this.createPineTree(-8.2, 0, 11.5, 1.3);
    this.createPineTree(8.2, 0, -14.2, 1.2);
    this.createPineTree(8.2, 0, 1.5, 1.2);
    this.createPineTree(8.4, 0, 6.5, 1.0);
    this.createPineTree(8.2, 0, 11.5, 1.3);

    // Mountain Boulders
    this.createBoulder(-7.5, 0, 4.0, 1.1);
    this.createBoulder(7.5, 0, 4.0, 1.0);

    // Trail Marker Signpost
    this.createTrailMarker(-7.2, 0, -4.5);
    this.createTrailMarker(7.2, 0, -4.5);
  }

  // ========================================================
  // SHARED PROP GENERATOR METHODS (High Quality Procedural 3D)
  // ========================================================

  private buildWorldSignboard(theme: WorldThemeConfig): void {
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 0, -20.5);

    // Wooden / Metallic posts
    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 5.2, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const p1 = new THREE.Mesh(postGeo, postMat);
    p1.position.set(-3.6, 2.6, 0);
    const p2 = new THREE.Mesh(postGeo, postMat);
    p2.position.set(3.6, 2.6, 0);
    signGroup.add(p1, p2);

    // Large Overhead Banner Board
    const boardGeo = new THREE.BoxGeometry(7.6, 1.4, 0.35);
    const boardMat = new THREE.MeshStandardMaterial({
      color: theme.terminalBuildingColor,
      roughness: 0.3,
      metalness: 0.2,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 4.2, 0);
    board.castShadow = true;
    signGroup.add(board);

    // Bright Glowing Trim
    const trimGeo = new THREE.BoxGeometry(7.7, 0.16, 0.4);
    const trimMat = new THREE.MeshStandardMaterial({
      color: theme.terminalRoofColor,
      emissive: theme.terminalRoofColor,
      emissiveIntensity: 0.6,
    });
    const trimTop = new THREE.Mesh(trimGeo, trimMat);
    trimTop.position.set(0, 4.95, 0);
    const trimBot = new THREE.Mesh(trimGeo, trimMat);
    trimBot.position.set(0, 3.45, 0);
    signGroup.add(trimTop, trimBot);

    this.propsContainer.add(signGroup);
  }

  /**
   * Procedural Charming Boutique Storefront Building with
   * Striped Fabric Awning, Glowing Display Window, Flower Boxes, and Roof Parapet.
   */
  private createStorefrontBuilding(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    wallColor: number,
    trimColor: number,
    awningColor1: number,
    awningColor2: number
  ): void {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, this.resolveTerrainY(x, y, z), z);

    // 1. Main Pastel Facade Body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.5,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    bGroup.add(body);

    // 2. Decorative Molded Roof Cornice / Parapet
    const corniceGeo = new THREE.BoxGeometry(w + 0.35, 0.42, d + 0.35);
    const corniceMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.35 });
    const cornice = new THREE.Mesh(corniceGeo, corniceMat);
    cornice.position.y = h + 0.21;
    cornice.castShadow = true;
    bGroup.add(cornice);

    // 3. Rooftop Detail (Cute AC Unit or Vent)
    const acGeo = new THREE.BoxGeometry(0.9, 0.55, 0.75);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
    const ac = new THREE.Mesh(acGeo, acMat);
    ac.position.set(w * 0.2, h + 0.5, 0);
    bGroup.add(ac);

    // 4. Ground Floor Display Window with Warm Glowing Shop Interior
    const dispWinGeo = new THREE.BoxGeometry(w * 0.52, 1.6, 0.12);
    const dispWinMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef3c7,
      emissiveIntensity: 0.65,
      roughness: 0.1,
    });
    const dispWin = new THREE.Mesh(dispWinGeo, dispWinMat);
    dispWin.position.set(-w * 0.18, 1.05, d / 2 + 0.04);
    bGroup.add(dispWin);

    // 5. Shop Entrance Door
    const doorGeo = new THREE.BoxGeometry(w * 0.26, 1.8, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.4 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(w * 0.26, 0.95, d / 2 + 0.04);
    bGroup.add(door);

    // 6. Cute Striped Fabric Awning over shopfront
    const awningWidth = w * 0.92;
    const awningDepth = 1.05;
    const stripeCount = 6;
    const stripeWidth = awningWidth / stripeCount;
    for (let s = 0; s < stripeCount; s++) {
      const stripeMat = new THREE.MeshStandardMaterial({
        color: s % 2 === 0 ? awningColor1 : awningColor2,
        roughness: 0.6,
      });
      const stripeGeo = new THREE.BoxGeometry(stripeWidth * 0.96, 0.1, awningDepth);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = 0.28;
      stripe.position.set(
        -awningWidth / 2 + (s + 0.5) * stripeWidth,
        2.1,
        d / 2 + awningDepth * 0.45
      );
      stripe.castShadow = true;
      bGroup.add(stripe);
    }

    // 7. Upper Floor Windows with Flower Boxes
    const upperWinGeo = new THREE.BoxGeometry(0.8, 1.0, 0.08);
    const upperWinMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });
    [-w * 0.25, w * 0.25].forEach((wx) => {
      if (h > 3.8) {
        const uWin = new THREE.Mesh(upperWinGeo, upperWinMat);
        uWin.position.set(wx, h * 0.66, d / 2 + 0.04);
        bGroup.add(uWin);

        // Window Sill / Flower Box
        const sillGeo = new THREE.BoxGeometry(0.95, 0.14, 0.22);
        const sillMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });
        const sill = new THREE.Mesh(sillGeo, sillMat);
        sill.position.set(wx, h * 0.66 - 0.56, d / 2 + 0.1);
        bGroup.add(sill);

        // Blossoms in flower box
        const flowerGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const flowerMat = new THREE.MeshStandardMaterial({ color: awningColor1 });
        const flower = new THREE.Mesh(flowerGeo, flowerMat);
        flower.position.set(wx, h * 0.66 - 0.44, d / 2 + 0.13);
        bGroup.add(flower);
      }
    });

    this.propsContainer.add(bGroup);
  }

  /**
   * Stylized Puffy Deciduous Tree with multi-tier foliage & gentle wind animation
   */
  private createStylizedTree(x: number, y: number, z: number, scale = 1.0): void {
    const tree = new THREE.Group();
    tree.position.set(x, this.resolveTerrainY(x, y, z), z);
    tree.scale.set(scale, scale, scale);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 2.2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    tree.add(trunk);

    // 3 Overlapping Puffy Foliage Spheres
    const folMat1 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.55 });
    const folMat2 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 });
    const folMat3 = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55 });

    const fol1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 10), folMat1);
    fol1.position.set(0, 2.7, 0);
    fol1.castShadow = true;

    const fol2 = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 10), folMat2);
    fol2.position.set(0.35, 3.6, 0.1);
    fol2.castShadow = true;

    const fol3 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), folMat3);
    fol3.position.set(-0.3, 3.4, -0.2);
    fol3.castShadow = true;

    tree.add(fol1, fol2, fol3);

    this.animatedProps.push({
      mesh: fol1,
      type: 'wind',
      speed: 1.6,
      initialY: 2.7,
      offset: x * 0.4 + z * 0.2,
    });

    this.propsContainer.add(tree);
  }

  /**
   * Modern Rectangular Flower Planter with vibrant blossoms
   */
  private createFlowerPlanter(x: number, y: number, z: number, flowerColorHex: number): void {
    const planter = new THREE.Group();
    planter.position.set(x, y, z);

    // White / Concrete Planter Box
    const boxGeo = new THREE.BoxGeometry(1.6, 0.5, 0.7);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.25;
    box.castShadow = true;
    planter.add(box);

    // Soil
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x3f2e1c, roughness: 0.9 })
    );
    soil.position.y = 0.5;
    planter.add(soil);

    // Green Bush
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
    );
    bush.position.y = 0.65;
    bush.scale.set(1.5, 0.6, 0.8);
    planter.add(bush);

    // 4 Flower Buds
    const fMat = new THREE.MeshStandardMaterial({ color: flowerColorHex, roughness: 0.4 });
    [-0.5, -0.15, 0.2, 0.5].forEach((fx, idx) => {
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), fMat);
      bud.position.set(fx, 0.85 + (idx % 2) * 0.08, (idx % 2 === 0 ? 0.1 : -0.1));
      planter.add(bud);
    });

    this.propsContainer.add(planter);
  }

  /**
   * Modern Street Lamp with warm glowing spherical bulb
   */
  private createModernLamp(x: number, y: number, z: number): void {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
    );
    pole.position.y = 2.1;
    pole.castShadow = true;
    lamp.add(pole);

    // Curved Arm & Glowing Globe
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    arm.position.set(0.15, 4.2, 0);
    lamp.add(arm);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xfef08a,
        emissiveIntensity: 1.8,
      })
    );
    bulb.position.set(0.35, 4.05, 0);
    lamp.add(bulb);

    this.propsContainer.add(lamp);
  }

  private createBuilding(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    bodyColor: number,
    trimColor: number
  ): void {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, y, z);

    // Main Body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    bGroup.add(body);

    // Roof Parapet
    const roofGeo = new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3);
    const roofMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + 0.2;
    bGroup.add(roof);

    // Window Grids on front face
    const winGeo = new THREE.BoxGeometry(0.7, 0.9, 0.1);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const rows = Math.min(5, Math.floor(h / 2.2));
    const cols = Math.min(3, Math.floor(w / 1.8));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const win = new THREE.Mesh(winGeo, winMat);
        const wx = (c - (cols - 1) / 2) * 1.5;
        const wy = 2.0 + r * 1.8;
        win.position.set(wx, wy, d / 2 + 0.05);
        bGroup.add(win);
      }
    }

    this.propsContainer.add(bGroup);
  }

  private createCityTree(x: number, y: number, z: number): void {
    this.createStylizedTree(x, y, z, 1.0);
  }

  private createTrafficSign(x: number, y: number, z: number, type: 'STOP' | 'ONEWAY'): void {
    const signGroup = new THREE.Group();
    signGroup.position.set(x, y, z);

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 })
    );
    pole.position.y = 1.6;
    pole.castShadow = true;
    signGroup.add(pole);

    // Sign plate
    const signGeo = type === 'STOP' ? new THREE.CylinderGeometry(0.55, 0.55, 0.08, 8) : new THREE.BoxGeometry(0.9, 0.45, 0.08);
    const signMat = new THREE.MeshStandardMaterial({
      color: type === 'STOP' ? 0xef4444 : 0x0284c7,
      roughness: 0.3,
    });
    const plate = new THREE.Mesh(signGeo, signMat);
    plate.position.y = 3.0;
    plate.rotation.x = Math.PI / 2;
    signGroup.add(plate);

    this.propsContainer.add(signGroup);
  }

  private createBench(x: number, y: number, z: number, rotY: number): void {
    const bench = new THREE.Group();
    bench.position.set(x, y, z);
    bench.rotation.y = rotY;

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.12, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 })
    );
    seat.position.y = 0.5;
    bench.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 })
    );
    back.position.set(0, 0.8, -0.25);
    bench.add(back);

    this.propsContainer.add(bench);
  }

  private createPalmTree(x: number, y: number, z: number): void {
    const palm = new THREE.Group();
    palm.position.set(x, y, z);

    // Curved Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - i * 0.02, 0.28 - i * 0.02, 0.8, 8), trunkMat);
      ring.position.set(Math.sin(i * 0.2) * 0.3, 0.4 + i * 0.75, 0);
      ring.rotation.z = -i * 0.08;
      ring.castShadow = true;
      palm.add(ring);
    }

    // Palm Leaves Fronds
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, side: THREE.DoubleSide, roughness: 0.5 });
    for (let f = 0; f < 6; f++) {
      const frondGeo = new THREE.BoxGeometry(1.8, 0.06, 0.4);
      const frond = new THREE.Mesh(frondGeo, frondMat);
      const angle = (f / 6) * Math.PI * 2;
      frond.position.set(Math.cos(angle) * 0.9, 4.1, Math.sin(angle) * 0.9);
      frond.rotation.y = angle;
      frond.rotation.z = -0.35;
      frond.castShadow = true;
      palm.add(frond);
    }

    this.propsContainer.add(palm);
  }

  private createPineTree(x: number, y: number, z: number, scale = 1.0): void {
    const pine = new THREE.Group();
    pine.position.set(x, this.resolveTerrainY(x, y, z), z);
    pine.scale.set(scale, scale, scale);

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
    );
    trunk.position.y = 1;
    trunk.castShadow = true;
    pine.add(trunk);

    // Cones (tiers of needles)
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 });
    for (let c = 0; c < 3; c++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6 - c * 0.35, 1.8, 8), coneMat);
      cone.position.y = 2.2 + c * 1.1;
      cone.castShadow = true;
      pine.add(cone);
    }

    this.propsContainer.add(pine);
  }

  private createCarnivalTent(x: number, y: number, z: number, col1: number, col2: number): void {
    const tent = new THREE.Group();
    tent.position.set(x, y, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 3.2, 16),
      new THREE.MeshStandardMaterial({ color: col1, roughness: 0.5 })
    );
    base.position.y = 1.6;
    tent.add(base);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.0, 3.5, 16),
      new THREE.MeshStandardMaterial({ color: col2, roughness: 0.4 })
    );
    roof.position.y = 4.95;
    roof.castShadow = true;
    tent.add(roof);

    this.propsContainer.add(tent);
  }

  private createBalloonBunch(x: number, y: number, z: number): void {
    const bunch = new THREE.Group();
    bunch.position.set(x, y, z);

    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 3.5, 4),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    string.position.y = 1.75;
    bunch.add(string);

    const colors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xec4899];
    const balloonsGroup = new THREE.Group();
    balloonsGroup.position.y = 3.6;

    colors.forEach((c, idx) => {
      const bMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 10, 10),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.1 })
      );
      const ang = (idx / colors.length) * Math.PI * 2;
      bMesh.position.set(Math.cos(ang) * 0.45, (idx % 2) * 0.35, Math.sin(ang) * 0.45);
      balloonsGroup.add(bMesh);
    });

    bunch.add(balloonsGroup);

    this.animatedProps.push({
      mesh: balloonsGroup,
      type: 'balloon',
      speed: 2.0,
      initialY: 3.6,
      offset: x * 0.7,
    });

    this.propsContainer.add(bunch);
  }

  private createCyberTower(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    bodyColor: number,
    neonColor: number
  ): void {
    const tower = new THREE.Group();
    tower.position.set(x, y, z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.8 })
    );
    body.position.y = h / 2;
    tower.add(body);

    // Glowing Neon Vertical Ribbons
    const neonGeo = new THREE.BoxGeometry(0.18, h * 0.9, 0.18);
    const neonMat = new THREE.MeshStandardMaterial({
      color: neonColor,
      emissive: neonColor,
      emissiveIntensity: 2.2,
    });

    [-w / 2 + 0.2, w / 2 - 0.2].forEach((nx) => {
      const strip = new THREE.Mesh(neonGeo, neonMat);
      strip.position.set(nx, h / 2, d / 2 + 0.05);
      tower.add(strip);
    });

    this.propsContainer.add(tower);
  }

  private createNeonTotem(x: number, y: number, z: number, colorHex: number): void {
    const totem = new THREE.Group();
    totem.position.set(x, y, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    base.position.y = 0.25;
    totem.add(base);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 2.0,
      })
    );
    orb.position.y = 2.4;
    totem.add(orb);

    this.animatedProps.push({
      mesh: orb,
      type: 'bob',
      speed: 3.0,
      initialY: 2.4,
      offset: z,
    });

    this.propsContainer.add(totem);
  }

  private createSearchlightBeacon(x: number, y: number, z: number, colorHex: number): void {
    const beacon = new THREE.Group();
    beacon.position.set(x, y, z);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    base.position.y = 0.4;
    beacon.add(base);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 2.2, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    beam.position.y = 7.4;
    beacon.add(beam);

    this.animatedProps.push({
      mesh: beam,
      type: 'beacon',
      speed: 1.2,
      initialY: 7.4,
      offset: x,
    });

    this.propsContainer.add(beacon);
  }

  private createRadarDish(x: number, y: number, z: number): void {
    const radar = new THREE.Group();
    radar.position.set(x, y, z);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 })
    );
    mast.position.y = 1.5;
    radar.add(mast);

    const dishGroup = new THREE.Group();
    dishGroup.position.y = 3.2;

    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, side: THREE.DoubleSide })
    );
    dish.rotation.x = Math.PI / 2;
    dishGroup.add(dish);

    radar.add(dishGroup);

    this.animatedProps.push({
      mesh: dishGroup,
      type: 'rotate',
      speed: 1.8,
      initialY: 3.2,
      offset: 0,
    });

    this.propsContainer.add(radar);
  }

  private createWindSock(x: number, y: number, z: number): void {
    const sock = new THREE.Group();
    sock.position.set(x, y, z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
    );
    pole.position.y = 1.9;
    sock.add(pole);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.4, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf97316, side: THREE.DoubleSide })
    );
    cone.position.set(0.6, 3.6, 0);
    cone.rotation.z = Math.PI / 2;
    sock.add(cone);

    this.animatedProps.push({
      mesh: cone,
      type: 'wind',
      speed: 3.5,
      initialY: 3.6,
      offset: 1,
    });

    this.propsContainer.add(sock);
  }

  private createRunwayPylon(x: number, y: number, z: number): void {
    const pylon = new THREE.Group();
    pylon.position.set(x, y, z);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    );
    post.position.y = 0.6;
    pylon.add(post);

    const strobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.0 })
    );
    strobe.position.y = 1.25;
    pylon.add(strobe);

    this.propsContainer.add(pylon);
  }

  private createLuggageCart(x: number, y: number, z: number): void {
    const cart = new THREE.Group();
    cart.position.set(x, y, z);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.3, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    );
    base.position.y = 0.35;
    cart.add(base);

    // Suitcase
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.5, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xf97316 })
    );
    bag.position.set(0, 0.75, 0);
    cart.add(bag);

    this.propsContainer.add(cart);
  }

  private createStationShelter(x: number, y: number, z: number): void {
    const shelter = new THREE.Group();
    shelter.position.set(x, y, z);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.15, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, transparent: true, opacity: 0.85 })
    );
    roof.position.y = 2.4;
    shelter.add(roof);

    [-1.4, 1.4].forEach((px) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
      );
      pole.position.set(px, 1.2, 0);
      shelter.add(pole);
    });

    this.propsContainer.add(shelter);
  }

  private createClockTower(x: number, y: number, z: number): void {
    const tower = new THREE.Group();
    tower.position.set(x, y, z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 5.0, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    body.position.y = 2.5;
    tower.add(body);

    const clock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 1.0 })
    );
    clock.position.set(0, 4.2, 0.62);
    clock.rotation.x = Math.PI / 2;
    tower.add(clock);

    this.propsContainer.add(tower);
  }

  private createTransitBoard(x: number, y: number, z: number): void {
    const board = new THREE.Group();
    board.position.set(x, y, z);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.4, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.8 })
    );
    screen.position.y = 3.0;
    board.add(screen);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b })
    );
    pole.position.y = 1.2;
    board.add(pole);

    this.propsContainer.add(board);
  }

  private createNeonLamp(x: number, y: number, z: number, glowHex: number): void {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    pole.position.y = 2.25;
    lamp.add(pole);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.08, 8, 16),
      new THREE.MeshStandardMaterial({ color: glowHex, emissive: glowHex, emissiveIntensity: 2.5 })
    );
    ring.position.set(0, 4.5, 0);
    ring.rotation.x = Math.PI / 2;
    lamp.add(ring);

    this.propsContainer.add(lamp);
  }

  private createKiosk(x: number, y: number, z: number, colorHex: number): void {
    const kiosk = new THREE.Group();
    kiosk.position.set(x, y, z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.2, 1.4),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 })
    );
    body.position.y = 1.1;
    kiosk.add(body);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.7, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x93c5fd, emissiveIntensity: 1.2 })
    );
    screen.position.set(0, 1.4, 0.72);
    kiosk.add(screen);

    this.propsContainer.add(kiosk);
  }

  private createTrafficSignal(x: number, y: number, z: number): void {
    const sig = new THREE.Group();
    sig.position.set(x, y, z);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    post.position.y = 2.25;
    sig.add(post);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    box.position.set(0, 3.8, 0);
    sig.add(box);

    const red = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 })
    );
    red.position.set(0, 4.2, 0.26);

    const green = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2.2 })
    );
    green.position.set(0, 3.4, 0.26);
    sig.add(red, green);

    this.propsContainer.add(sig);
  }

  private createModernPlanter(x: number, y: number, z: number): void {
    const planter = new THREE.Group();
    planter.position.set(x, y, z);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.5, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    pot.position.y = 0.4;
    planter.add(pot);

    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 })
    );
    bush.position.y = 1.1;
    planter.add(bush);

    this.propsContainer.add(planter);
  }

  private createBillboard(x: number, y: number, z: number, label: string): void {
    const bb = new THREE.Group();
    bb.position.set(x, y, z);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0xa855f7, emissiveIntensity: 0.7 })
    );
    bb.add(sign);

    this.propsContainer.add(bb);
  }

  private createBeachCabana(x: number, y: number, z: number, fabricHex: number): void {
    const cabana = new THREE.Group();
    cabana.position.set(x, y, z);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.3, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 })
    );
    deck.position.y = 0.15;
    cabana.add(deck);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 1.8, 4),
      new THREE.MeshStandardMaterial({ color: fabricHex, roughness: 0.6 })
    );
    canopy.position.y = 2.8;
    canopy.rotation.y = Math.PI / 4;
    cabana.add(canopy);

    this.propsContainer.add(cabana);
  }

  private createSurfboard(x: number, y: number, z: number, boardColor: number): void {
    const board = new THREE.Group();
    board.position.set(x, y, z);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.8, 0.08),
      new THREE.MeshStandardMaterial({ color: boardColor, roughness: 0.25 })
    );
    mesh.position.y = 0.8;
    mesh.rotation.z = 0.18;
    board.add(mesh);

    this.propsContainer.add(board);
  }

  private createBeachUmbrella(x: number, y: number, z: number, fabricColor: number): void {
    const umb = new THREE.Group();
    umb.position.set(x, y, z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
    );
    pole.position.y = 1.4;
    pole.rotation.z = 0.12;
    umb.add(pole);

    const top = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 0.7, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: fabricColor, side: THREE.DoubleSide })
    );
    top.position.set(0.18, 2.7, 0);
    top.rotation.z = 0.12;
    umb.add(top);

    this.propsContainer.add(umb);
  }

  private createPennantBunting(x: number, y: number, z: number): void {
    const bunting = new THREE.Group();
    bunting.position.set(x, y, z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
    );
    pole.position.y = 2.1;
    bunting.add(pole);

    const pennant = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.8, 3),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    pennant.position.set(0.4, 3.8, 0);
    pennant.rotation.z = Math.PI / 2;
    bunting.add(pennant);

    this.propsContainer.add(bunting);
  }

  private createFestivalStall(x: number, y: number, z: number, colorHex: number): void {
    const stall = new THREE.Group();
    stall.position.set(x, y, z);

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xb45309 })
    );
    counter.position.y = 0.55;
    stall.add(counter);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.2, 1.6),
      new THREE.MeshStandardMaterial({ color: colorHex })
    );
    awning.position.y = 2.2;
    stall.add(awning);

    this.propsContainer.add(stall);
  }

  private createTimberCabin(x: number, y: number, z: number, wallColor: number, roofColor: number): void {
    const cabin = new THREE.Group();
    cabin.position.set(x, this.resolveTerrainY(x, y, z), z);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 3.2, 4.0),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 })
    );
    walls.position.y = 1.6;
    cabin.add(walls);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.6, 2.2, 4),
      new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8 })
    );
    roof.position.y = 4.2;
    roof.rotation.y = Math.PI / 4;
    cabin.add(roof);

    this.propsContainer.add(cabin);
  }

  private createBoulder(x: number, y: number, z: number, scale = 1.0): void {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.85, 1),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 })
    );
    const groundY = this.resolveTerrainY(x, 0, z);
    rock.position.set(x, groundY + 0.45 * scale, z);
    rock.scale.set(scale * 1.3, scale * 0.9, scale * 1.1);
    this.propsContainer.add(rock);
  }

  private createTrailMarker(x: number, y: number, z: number): void {
    const marker = new THREE.Group();
    marker.position.set(x, y, z);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 2.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    post.position.y = 1.1;
    marker.add(post);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b })
    );
    board.position.set(0.3, 1.8, 0);
    marker.add(board);

    this.propsContainer.add(marker);
  }

  /**
   * Update animation loop for dynamic animated props
   * (floating balloons, radar spin, wind sway, searchlight beams).
   */
  public update(elapsed: number, delta: number): void {
    for (let i = 0; i < this.animatedProps.length; i++) {
      const p = this.animatedProps[i];
      if (p.type === 'bob') {
        p.mesh.position.y = p.initialY + Math.sin(elapsed * p.speed + p.offset) * 0.18;
      } else if (p.type === 'rotate') {
        p.mesh.rotation.y += delta * p.speed;
      } else if (p.type === 'balloon') {
        p.mesh.position.y = p.initialY + Math.sin(elapsed * p.speed + p.offset) * 0.22;
        p.mesh.rotation.z = Math.sin(elapsed * 1.5 + p.offset) * 0.08;
      } else if (p.type === 'wind') {
        p.mesh.rotation.z = Math.sin(elapsed * p.speed + p.offset) * 0.06;
      } else if (p.type === 'beacon') {
        p.mesh.rotation.y += delta * p.speed;
        p.mesh.rotation.x = Math.sin(elapsed * 0.8 + p.offset) * 0.2;
      }
    }
  }

  /**
   * Full cleanup on arena component unmount
   */
  public dispose(): void {
    this.clearProps();
    this.scene.remove(this.propsContainer);
  }
}
