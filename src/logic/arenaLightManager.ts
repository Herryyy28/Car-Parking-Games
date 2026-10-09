import * as THREE from 'three';
import { WorldThemeConfig, getWorldConfig } from './worldThemes.ts';

export interface LightThemeProfile {
  themeIndex: number;
  name: string;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  pointLightColors: number[];
  pointLightIntensity: number;
  pointLightDistance: number;
  pointLightDecay: number;
  bulbEmissiveColor: number;
  bulbEmissiveIntensity: number;
}

/**
 * 8 Dedicated Lighting Profiles mapping each world theme index
 * Smoothly shifts from rich warm sunset / golden hour tones (Theme 7 & 1)
 * to high-contrast cool neon cyber district lighting (Theme 3, 6 & 8).
 */
export const LIGHT_THEME_PROFILES: Record<number, LightThemeProfile> = {
  // Theme 1 — Sunny City Parking: Crisp cheerful daylight with warm golden sunlight
  1: {
    themeIndex: 1,
    name: 'Sunny Golden Morning',
    ambientColor: 0xf8fafc,
    ambientIntensity: 0.48,
    hemiSkyColor: 0xbae6fd,
    hemiGroundColor: 0xa7f3d0,
    hemiIntensity: 0.65,
    sunColor: 0xfffae5,
    sunIntensity: 2.3,
    pointLightColors: [0xfbbf24, 0xf59e0b, 0xfbbf24, 0xf59e0b, 0xfef08a, 0xfde047],
    pointLightIntensity: 1.4,
    pointLightDistance: 16,
    pointLightDecay: 1.8,
    bulbEmissiveColor: 0xfef08a,
    bulbEmissiveIntensity: 2.2,
  },

  // Theme 2 — Transit Terminal: Clean bright commuter daylight shifting to cool steel blues
  2: {
    themeIndex: 2,
    name: 'Transit Terminal Cool Day',
    ambientColor: 0xe0f2fe,
    ambientIntensity: 0.46,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0x6ee7b7,
    hemiIntensity: 0.6,
    sunColor: 0xfffbeb,
    sunIntensity: 2.2,
    pointLightColors: [0x38bdf8, 0x0284c7, 0x38bdf8, 0x0284c7, 0x67e8f9, 0x0ea5e9],
    pointLightIntensity: 1.6,
    pointLightDistance: 17,
    pointLightDecay: 1.7,
    bulbEmissiveColor: 0x38bdf8,
    bulbEmissiveIntensity: 2.4,
  },

  // Theme 3 — Downtown Skyline: Twilight transition into Neon Cyber District
  3: {
    themeIndex: 3,
    name: 'Cyber Downtown Dusk',
    ambientColor: 0x2e1065,
    ambientIntensity: 0.40,
    hemiSkyColor: 0xa855f7,
    hemiGroundColor: 0x3b0764,
    hemiIntensity: 0.7,
    sunColor: 0xf472b6,
    sunIntensity: 1.8,
    pointLightColors: [0xd946ef, 0x8b5cf6, 0xec4899, 0xa855f7, 0xf43f5e, 0xc084fc],
    pointLightIntensity: 2.4,
    pointLightDistance: 19,
    pointLightDecay: 1.6,
    bulbEmissiveColor: 0xd946ef,
    bulbEmissiveIntensity: 3.2,
  },

  // Theme 4 — Palm Beach Harbor: Warm coastal tropical evening with amber shoreline glow
  4: {
    themeIndex: 4,
    name: 'Coastal Amber Twilight',
    ambientColor: 0xfef3c7,
    ambientIntensity: 0.50,
    hemiSkyColor: 0xfb923c,
    hemiGroundColor: 0xfde047,
    hemiIntensity: 0.65,
    sunColor: 0xffedd5,
    sunIntensity: 2.4,
    pointLightColors: [0xf97316, 0xf59e0b, 0xf97316, 0xf59e0b, 0xfb923c, 0xfacc15],
    pointLightIntensity: 1.8,
    pointLightDistance: 18,
    pointLightDecay: 1.8,
    bulbEmissiveColor: 0xfba94c,
    bulbEmissiveIntensity: 2.5,
  },

  // Theme 5 — Airport Express: Modern aero xenon runway cool-white & electric ice
  5: {
    themeIndex: 5,
    name: 'Airport Xenon Concourse',
    ambientColor: 0x1e293b,
    ambientIntensity: 0.42,
    hemiSkyColor: 0x67e8f9,
    hemiGroundColor: 0x0f172a,
    hemiIntensity: 0.6,
    sunColor: 0xe0f2fe,
    sunIntensity: 2.0,
    pointLightColors: [0x06b6d4, 0x38bdf8, 0x06b6d4, 0x38bdf8, 0x22d3ee, 0x0284c7],
    pointLightIntensity: 2.0,
    pointLightDistance: 18,
    pointLightDecay: 1.7,
    bulbEmissiveColor: 0x22d3ee,
    bulbEmissiveIntensity: 2.8,
  },

  // Theme 6 — Carnival Fairground: Festive neon carnival glow with candy pinks & electric gold
  6: {
    themeIndex: 6,
    name: 'Carnival Neon Midway',
    ambientColor: 0x3b0764,
    ambientIntensity: 0.44,
    hemiSkyColor: 0xf472b6,
    hemiGroundColor: 0x581c87,
    hemiIntensity: 0.72,
    sunColor: 0xfef08a,
    sunIntensity: 2.1,
    pointLightColors: [0xec4899, 0xfacc15, 0xec4899, 0xfacc15, 0xf43f5e, 0xfbbf24],
    pointLightIntensity: 2.5,
    pointLightDistance: 18,
    pointLightDecay: 1.6,
    bulbEmissiveColor: 0xec4899,
    bulbEmissiveIntensity: 3.0,
  },

  // Theme 7 — Sunset Promenade: Rich Warm Sunset Tones (Warm peach/apricot, golden amber glow)
  7: {
    themeIndex: 7,
    name: 'Sunset Promenade Golden Hour',
    ambientColor: 0xffedd5, // Rich warm peach ambient
    ambientIntensity: 0.58,
    hemiSkyColor: 0xf97316, // Sunset orange sky
    hemiGroundColor: 0xfbbf24, // Warm golden bounce
    hemiIntensity: 0.75,
    sunColor: 0xf59e0b,     // Deep warm amber sunset sun
    sunIntensity: 2.5,
    pointLightColors: [0xff7700, 0xfbbf24, 0xff8811, 0xf59e0b, 0xffa040, 0xfbbf24],
    pointLightIntensity: 2.4,
    pointLightDistance: 20,
    pointLightDecay: 1.8,
    bulbEmissiveColor: 0xffaa33,
    bulbEmissiveIntensity: 2.8,
  },

  // Theme 8 — Cool Neon Cyber District Lighting (High-contrast electric cyan, magenta, & deep dark ambient)
  8: {
    themeIndex: 8,
    name: 'Neon Cyber District',
    ambientColor: 0x090d16, // Deep dark cyber void
    ambientIntensity: 0.38,
    hemiSkyColor: 0x00f5ff, // Electric cyber cyan sky
    hemiGroundColor: 0x1e1b4b,// Deep midnight asphalt
    hemiIntensity: 0.65,
    sunColor: 0x818cf8,     // Cool electric violet key light
    sunIntensity: 1.9,
    pointLightColors: [0x00f5ff, 0xd946ef, 0x00f5ff, 0xd946ef, 0x06b6d4, 0xa855f7], // Neon cyan & magenta
    pointLightIntensity: 2.8,
    pointLightDistance: 22,
    pointLightDecay: 1.5,
    bulbEmissiveColor: 0x00f5ff,
    bulbEmissiveIntensity: 3.6,
  },
};

/**
 * Light Manager for BusMadnessArena
 * Dynamically updates scene ambient, hemisphere, directional, and point lights
 * based on the active level theme index, smoothly shifting between warm sunset tones
 * and cool neon cyber district lighting.
 */
export class ArenaLightManager {
  private scene: THREE.Scene;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public sunLight: THREE.DirectionalLight;
  public pointLights: THREE.PointLight[] = [];
  public bulbMeshes: THREE.Mesh[] = [];
  private currentThemeIndex = 1;

  constructor(
    scene: THREE.Scene,
    ambientLight: THREE.AmbientLight,
    hemiLight: THREE.HemisphereLight,
    sunLight: THREE.DirectionalLight,
    lampPositions: [number, number, number][] = [
      [-12, 5.1, -4],
      [12, 5.1, -4],
      [-12, 5.1, 14],
      [12, 5.1, 14],
      [-6, 4.8, -8.5],
      [6, 4.8, -8.5],
    ]
  ) {
    this.scene = scene;
    this.ambientLight = ambientLight;
    this.hemiLight = hemiLight;
    this.sunLight = sunLight;

    // Create managed Point Lights stationed at street lamps and terminal canopy
    lampPositions.forEach(([x, y, z], idx) => {
      const pLight = new THREE.PointLight(0xfbbf24, 1.5, 16, 1.8);
      pLight.position.set(x, y, z);
      pLight.name = `ArenaPointLight_${idx}`;
      this.scene.add(pLight);
      this.pointLights.push(pLight);
    });
  }

  /**
   * Register physical bulb meshes so their emissive materials glow in sync with point lights
   */
  public registerBulbMesh(mesh: THREE.Mesh): void {
    this.bulbMeshes.push(mesh);
  }

  /**
   * Updates all ambient, directional, and point lights based on the current level's theme index (1 to 8).
   * Smoothly shifts from warm sunset tones to cool neon cyber district lighting.
   */
  public updateTheme(themeIndex: number): void {
    const safeIndex = Math.min(8, Math.max(1, Math.round(themeIndex)));
    this.currentThemeIndex = safeIndex;

    const profile = LIGHT_THEME_PROFILES[safeIndex] || LIGHT_THEME_PROFILES[1];

    // 1. Update Ambient Light
    this.ambientLight.color.setHex(profile.ambientColor);
    this.ambientLight.intensity = profile.ambientIntensity;

    // 2. Update Hemisphere Light
    this.hemiLight.color.setHex(profile.hemiSkyColor);
    this.hemiLight.groundColor.setHex(profile.hemiGroundColor);
    this.hemiLight.intensity = profile.hemiIntensity;

    // 3. Update Sun / Key Directional Light
    this.sunLight.color.setHex(profile.sunColor);
    this.sunLight.intensity = profile.sunIntensity;

    // 4. Update Point Lights
    this.pointLights.forEach((pLight, idx) => {
      const color = profile.pointLightColors[idx % profile.pointLightColors.length];
      pLight.color.setHex(color);
      pLight.intensity = profile.pointLightIntensity;
      pLight.distance = profile.pointLightDistance;
      pLight.decay = profile.pointLightDecay;
    });

    // 5. Update Bulb Meshes Emissive
    this.bulbMeshes.forEach((mesh, idx) => {
      if (mesh.material && mesh.material instanceof THREE.MeshStandardMaterial) {
        const color = profile.pointLightColors[idx % profile.pointLightColors.length] || profile.bulbEmissiveColor;
        mesh.material.emissive.setHex(color);
        mesh.material.emissiveIntensity = profile.bulbEmissiveIntensity;
      }
    });
  }

  public getThemeIndex(): number {
    return this.currentThemeIndex;
  }

  public dispose(): void {
    this.pointLights.forEach((pl) => {
      this.scene.remove(pl);
      pl.dispose();
    });
    this.pointLights = [];
    this.bulbMeshes = [];
  }
}
