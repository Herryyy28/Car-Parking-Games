import * as THREE from 'three';

export interface WorldThemeConfig {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
  badge: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  groundColor: number;
  roadColor: number;
  puzzlePadColor: number;
  sunLightColor: number;
  sunIntensity: number;
  ambientLightColor: number;
  ambientIntensity: number;
  terminalBuildingColor: number;
  terminalRoofColor: number;
  sidewalkColor: number;
  gridLineColor1: number;
  gridLineColor2: number;
  coneColor: number;
  accentGlowColor: number;
  propType: 'city' | 'station' | 'downtown' | 'beach' | 'airport' | 'festival' | 'night' | 'mountain';
}

export const WORLD_THEMES: Record<number, WorldThemeConfig> = {
  // WORLD 1 — City Parking
  1: {
    id: 1,
    name: 'City Parking',
    subtitle: 'Sunny downtown streets & parking bays',
    icon: '🌱',
    badge: 'World 1',
    skyColor: 0x0a101d,
    fogColor: 0x0a101d,
    fogDensity: 0.012,
    groundColor: 0x0f172a,
    roadColor: 0x1e293b,
    puzzlePadColor: 0x334155,
    sunLightColor: 0xfff8db,
    sunIntensity: 1.8,
    ambientLightColor: 0xffffff,
    ambientIntensity: 1.1,
    terminalBuildingColor: 0x0284c7, // vibrant cyan/blue
    terminalRoofColor: 0xfacc15,     // sunny yellow eave
    sidewalkColor: 0x475569,
    gridLineColor1: 0x64748b,
    gridLineColor2: 0x334155,
    coneColor: 0xf97316,
    accentGlowColor: 0x38bdf8,
    propType: 'city',
  },

  // WORLD 2 — Bus Station / Terminal Hub
  2: {
    id: 2,
    name: 'Bus Station Hub',
    subtitle: 'Busy central transit terminal & platforms',
    icon: '🚗',
    badge: 'World 2',
    skyColor: 0x091428,
    fogColor: 0x091428,
    fogDensity: 0.013,
    groundColor: 0x0d1f36,
    roadColor: 0x1b2d47,
    puzzlePadColor: 0x243b5a,
    sunLightColor: 0xffeedd,
    sunIntensity: 1.9,
    ambientLightColor: 0xe0f2fe,
    ambientIntensity: 1.15,
    terminalBuildingColor: 0x2563eb, // royal cobalt station
    terminalRoofColor: 0x38bdf8,     // neon cyan cantilever
    sidewalkColor: 0x334e68,
    gridLineColor1: 0x38bdf8,
    gridLineColor2: 0x1e3a5f,
    coneColor: 0xfbbf24,
    accentGlowColor: 0x60a5fa,
    propType: 'station',
  },

  // WORLD 3 — Downtown Skyline
  3: {
    id: 3,
    name: 'Downtown Skyline',
    subtitle: 'High-rise financial district with storefronts & traffic signals',
    icon: '🚌',
    badge: 'World 3',
    skyColor: 0x110e24,
    fogColor: 0x110e24,
    fogDensity: 0.013,
    groundColor: 0x181335,
    roadColor: 0x241d47,
    puzzlePadColor: 0x312760,
    sunLightColor: 0xfde047,
    sunIntensity: 1.75,
    ambientLightColor: 0xf3e8ff,
    ambientIntensity: 1.1,
    terminalBuildingColor: 0x7c3aed, // deep purple modern center
    terminalRoofColor: 0xf43f5e,     // magenta edge
    sidewalkColor: 0x473b75,
    gridLineColor1: 0xc084fc,
    gridLineColor2: 0x4c1d95,
    coneColor: 0xf43f5e,
    accentGlowColor: 0xa855f7,
    propType: 'downtown',
  },

  // WORLD 4 — Palm Beach Harbor
  4: {
    id: 4,
    name: 'Palm Beach Harbor',
    subtitle: 'Coastal boulevard with palm trees, yachts & sunshine',
    icon: '🎨',
    badge: 'World 4',
    skyColor: 0x052e3d,
    fogColor: 0x052e3d,
    fogDensity: 0.011,
    groundColor: 0x083344,
    roadColor: 0x164e63,
    puzzlePadColor: 0x155e75,
    sunLightColor: 0xffedd5,
    sunIntensity: 2.1,
    ambientLightColor: 0xccfbf1,
    ambientIntensity: 1.25,
    terminalBuildingColor: 0x0d9488, // tropical teal cabana
    terminalRoofColor: 0xf97316,     // terracotta orange awning
    sidewalkColor: 0x115e59,
    gridLineColor1: 0x2dd4bf,
    gridLineColor2: 0x0e7490,
    coneColor: 0xf59e0b,
    accentGlowColor: 0x14b8a6,
    propType: 'beach',
  },

  // WORLD 5 — Metro Airport Express
  5: {
    id: 5,
    name: 'Airport Express',
    subtitle: 'Hangar runway with flight signs, radar & luggage tugs',
    icon: '🅿️',
    badge: 'World 5',
    skyColor: 0x0c1427,
    fogColor: 0x0c1427,
    fogDensity: 0.012,
    groundColor: 0x111c33,
    roadColor: 0x1e293b,
    puzzlePadColor: 0x334155,
    sunLightColor: 0xf8fafc,
    sunIntensity: 1.85,
    ambientLightColor: 0xe2e8f0,
    ambientIntensity: 1.15,
    terminalBuildingColor: 0x475569, // sleek aero silver-slate
    terminalRoofColor: 0x38bdf8,     // sky aero wing
    sidewalkColor: 0x334155,
    gridLineColor1: 0x38bdf8,
    gridLineColor2: 0x1e293b,
    coneColor: 0xef4444,
    accentGlowColor: 0x0ea5e9,
    propType: 'airport',
  },

  // WORLD 6 — Carnival & Festival
  6: {
    id: 6,
    name: 'Carnival Fairground',
    subtitle: 'Festival plazas with bright balloons, confetti banners & fair stalls',
    icon: '🚧',
    badge: 'World 6',
    skyColor: 0x1e102e,
    fogColor: 0x1e102e,
    fogDensity: 0.012,
    groundColor: 0x28143d,
    roadColor: 0x3b185f,
    puzzlePadColor: 0x541e82,
    sunLightColor: 0xfef08a,
    sunIntensity: 2.0,
    ambientLightColor: 0xffedd5,
    ambientIntensity: 1.2,
    terminalBuildingColor: 0xec4899, // carnival magenta tent
    terminalRoofColor: 0xfacc15,     // sunny gold circus trim
    sidewalkColor: 0x4a1d6d,
    gridLineColor1: 0xf472b6,
    gridLineColor2: 0xa21caf,
    coneColor: 0xec4899,
    accentGlowColor: 0xf43f5e,
    propType: 'festival',
  },

  // WORLD 7 — Neon Night City
  7: {
    id: 7,
    name: 'Neon Cyber City',
    subtitle: 'Cyber night streets bathed in warm lanterns & glowing neon',
    icon: '🔄',
    badge: 'World 7',
    skyColor: 0x070b19,
    fogColor: 0x070b19,
    fogDensity: 0.014,
    groundColor: 0x0b1329,
    roadColor: 0x111c38,
    puzzlePadColor: 0x1b284e,
    sunLightColor: 0x67e8f9,
    sunIntensity: 1.4,
    ambientLightColor: 0xc084fc,
    ambientIntensity: 0.95,
    terminalBuildingColor: 0x1e1b4b, // night midnight tower
    terminalRoofColor: 0x06b6d4,     // electric cyan neon crown
    sidewalkColor: 0x1e293b,
    gridLineColor1: 0x22d3ee,
    gridLineColor2: 0xa855f7,
    coneColor: 0x06b6d4,
    accentGlowColor: 0xd946ef,
    propType: 'night',
  },

  // WORLD 8 — Alpine Mountain Pass
  8: {
    id: 8,
    name: 'Alpine Mountain Pass',
    subtitle: 'Pine tree forested peak roads and timber lodge stations',
    icon: '🚍',
    badge: 'World 8',
    skyColor: 0x071e22,
    fogColor: 0x071e22,
    fogDensity: 0.011,
    groundColor: 0x0c2d2f,
    roadColor: 0x133e3f,
    puzzlePadColor: 0x1c5150,
    sunLightColor: 0xfef9c3,
    sunIntensity: 1.9,
    ambientLightColor: 0xdcfce7,
    ambientIntensity: 1.2,
    terminalBuildingColor: 0x15803d, // evergreen forest lodge
    terminalRoofColor: 0x854d0e,     // cedar timber roof
    sidewalkColor: 0x166534,
    gridLineColor1: 0x4ade80,
    gridLineColor2: 0x14532d,
    coneColor: 0xf97316,
    accentGlowColor: 0x22c55e,
    propType: 'mountain',
  },
};

export function getWorldConfig(worldId: number): WorldThemeConfig {
  return WORLD_THEMES[worldId] || WORLD_THEMES[1];
}

export function getWorldIdForLevel(levelId: number): number {
  if (levelId <= 25) return 1;
  if (levelId <= 50) return 2;
  if (levelId <= 75) return 3;
  if (levelId <= 100) return 4;
  if (levelId <= 125) return 5;
  if (levelId <= 150) return 6;
  if (levelId <= 175) return 7;
  return 8;
}
