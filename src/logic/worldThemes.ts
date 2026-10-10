import * as THREE from 'three';

export interface WorldThemeConfig {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
  badge: string;
  levelStart: number;
  levelEnd: number;
  unlockRequirementLevel: number;
  chapters: string[];
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
  hemiSkyColor: number;
  hemiGroundColor: number;
  terminalBuildingColor: number;
  terminalRoofColor: number;
  sidewalkColor: number;
  curbColor: number;
  gridLineColor1: number;
  gridLineColor2: number;
  coneColor: number;
  accentGlowColor: number;
  treeFoliageColor: number;
  treeTrunkColor: number;
  propType: 'city' | 'station' | 'downtown' | 'beach' | 'airport' | 'festival' | 'sunset' | 'night' | 'mountain';
}

export const WORLD_THEMES: Record<number, WorldThemeConfig> = {
  // WORLD 1 — Sunny City Parking (Levels 1 - 125)
  1: {
    id: 1,
    name: 'Airport',
    subtitle: 'Sunny airport terminals & colorful parking bays',
    icon: '✈️',
    badge: 'World 1',
    levelStart: 1,
    levelEnd: 125,
    unlockRequirementLevel: 1,
    chapters: [
      'Downtown Commute',
      'Central Plaza',
      'Midtown Rush',
      'Metro Loop',
      'Grand City Depot',
    ],
    skyColor: 0xd4ecfc,       // soft bright powder blue sky
    fogColor: 0xd4ecfc,
    fogDensity: 0.005,        // very light, far atmospheric depth
    groundColor: 0x86efac,    // lush cheerful mint grass lawn
    roadColor: 0x475569,      // clean modern slate asphalt
    puzzlePadColor: 0x5b6b82, // distinct elevated pavement
    sunLightColor: 0xfffae5,  // warm golden sunlight
    sunIntensity: 2.2,
    ambientLightColor: 0xf1f5f9,
    ambientIntensity: 1.4,
    hemiSkyColor: 0xbae6fd,   // sky fill
    hemiGroundColor: 0xa7f3d0,// grass bounce
    terminalBuildingColor: 0x38bdf8, // friendly sky blue bus stop
    terminalRoofColor: 0xfbbf24,     // sunny yellow awning
    sidewalkColor: 0xf1f5f9,  // crisp clean light sidewalk
    curbColor: 0xe2e8f0,      // beveled white-gray curb
    gridLineColor1: 0xffffff, // crisp white road markings
    gridLineColor2: 0x94a3b8,
    coneColor: 0xf97316,      // bright safety orange
    accentGlowColor: 0xfef08a,
    treeFoliageColor: 0x22c55e, // vibrant green trees
    treeTrunkColor: 0xb45309,
    propType: 'airport',
  },

  // WORLD 2 — Central Transit Terminal (Levels 126 - 250)
  2: {
    id: 2,
    name: 'Transit Terminal',
    subtitle: 'Vibrant city transit terminal & bustling passenger platforms',
    icon: '🚗',
    badge: 'World 2',
    levelStart: 126,
    levelEnd: 250,
    unlockRequirementLevel: 25,
    chapters: [
      'Terminal Platform',
      'Bus Concourse',
      'Depot Junction',
      'Express Overpass',
      'Central Interchange',
    ],
    skyColor: 0xcee5fd,
    fogColor: 0xcee5fd,
    fogDensity: 0.005,
    groundColor: 0x6ee7b7,
    roadColor: 0x3b4c63,
    puzzlePadColor: 0x4f627d,
    sunLightColor: 0xfffbeb,
    sunIntensity: 2.3,
    ambientLightColor: 0xe0f2fe,
    ambientIntensity: 1.45,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0x86efac,
    terminalBuildingColor: 0x2563eb, // royal blue modern station
    terminalRoofColor: 0x38bdf8,     // cyan canopy
    sidewalkColor: 0xf8fafc,
    curbColor: 0xe2e8f0,
    gridLineColor1: 0xffffff,
    gridLineColor2: 0x94a3b8,
    coneColor: 0xfbbf24,
    accentGlowColor: 0x60a5fa,
    treeFoliageColor: 0x10b981,
    treeTrunkColor: 0x92400e,
    propType: 'station',
  },

  // WORLD 3 — Downtown Skyline & Boutiques (Levels 251 - 375)
  3: {
    id: 3,
    name: 'Downtown Skyline',
    subtitle: 'Charming shopping boulevard with storefronts & awnings',
    icon: '🚌',
    badge: 'World 3',
    levelStart: 251,
    levelEnd: 375,
    unlockRequirementLevel: 125,
    chapters: [
      'Boutique Alley',
      'Skyline Boulevard',
      'Fashion District',
      'Highrise Crossing',
      'Metropolitan Tower',
    ],
    skyColor: 0xdbeafe,
    fogColor: 0xdbeafe,
    fogDensity: 0.005,
    groundColor: 0xa7f3d0,
    roadColor: 0x475569,
    puzzlePadColor: 0x64748b,
    sunLightColor: 0xfef9c3,
    sunIntensity: 2.2,
    ambientLightColor: 0xf8fafc,
    ambientIntensity: 1.4,
    hemiSkyColor: 0xc7d2fe,
    hemiGroundColor: 0x6ee7b7,
    terminalBuildingColor: 0x8b5cf6, // pastel violet boutique center
    terminalRoofColor: 0xf43f5e,     // cheerful coral awning
    sidewalkColor: 0xf1f5f9,
    curbColor: 0xe2e8f0,
    gridLineColor1: 0xffffff,
    gridLineColor2: 0xa5b4fc,
    coneColor: 0xf43f5e,
    accentGlowColor: 0xa855f7,
    treeFoliageColor: 0x16a34a,
    treeTrunkColor: 0x78350f,
    propType: 'downtown',
  },

  // WORLD 4 — Palm Beach Harbor (Levels 376 - 500)
  4: {
    id: 4,
    name: 'Palm Beach Harbor',
    subtitle: 'Sunny coastal boulevard with turquoise water & palm trees',
    icon: '🎨',
    badge: 'World 4',
    levelStart: 376,
    levelEnd: 500,
    unlockRequirementLevel: 250,
    chapters: [
      'Pier Express',
      'Coastal Causeway',
      'Marina Boardwalk',
      'Lighthouse Turn',
      'Ocean Terminal',
    ],
    skyColor: 0xbae6fd,
    fogColor: 0xbae6fd,
    fogDensity: 0.004,
    groundColor: 0xfef08a,    // warm golden beach sand edges
    roadColor: 0x52657e,
    puzzlePadColor: 0x6b7d96,
    sunLightColor: 0xffedd5,
    sunIntensity: 2.4,
    ambientLightColor: 0xccfbf1,
    ambientIntensity: 1.5,
    hemiSkyColor: 0x38bdf8,
    hemiGroundColor: 0xfde047,
    terminalBuildingColor: 0x06b6d4, // bright turquoise beach pavilion
    terminalRoofColor: 0xf97316,     // terracotta orange awning
    sidewalkColor: 0xfffbeb,
    curbColor: 0xfef3c7,
    gridLineColor1: 0xffffff,
    gridLineColor2: 0x67e8f9,
    coneColor: 0xf59e0b,
    accentGlowColor: 0x06b6d4,
    treeFoliageColor: 0x22c55e,
    treeTrunkColor: 0xa16207,
    propType: 'beach',
  },

  // WORLD 5 — Airport Skyway (Levels 501 - 625)
  5: {
    id: 5,
    name: 'Airport Express',
    subtitle: 'Clear skies, aero concourse & streamlined departure lanes',
    icon: '🅿️',
    badge: 'World 5',
    levelStart: 501,
    levelEnd: 625,
    unlockRequirementLevel: 375,
    chapters: [
      'Departure Ramp',
      'Runway Crossing',
      'Hangar Ring',
      'Skybridge Arterial',
      'International Skyport',
    ],
    skyColor: 0xe0f2fe,
    fogColor: 0xe0f2fe,
    fogDensity: 0.005,
    groundColor: 0x86efac,
    roadColor: 0x475569,
    puzzlePadColor: 0x5b6b82,
    sunLightColor: 0xffffff,
    sunIntensity: 2.2,
    ambientLightColor: 0xf1f5f9,
    ambientIntensity: 1.4,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0xa7f3d0,
    terminalBuildingColor: 0x64748b, // modern aero silver
    terminalRoofColor: 0x38bdf8,     // sky blue aero wing
    sidewalkColor: 0xf8fafc,
    curbColor: 0xe2e8f0,
    gridLineColor1: 0xffffff,
    gridLineColor2: 0x94a3b8,
    coneColor: 0xef4444,
    accentGlowColor: 0x0ea5e9,
    treeFoliageColor: 0x15803d,
    treeTrunkColor: 0x854d0e,
    propType: 'airport',
  },

  // WORLD 6 — Carnival Fairground (Levels 626 - 750)
  6: {
    id: 6,
    name: 'Carnival Fairground',
    subtitle: 'Festive plazas with colorful balloons, banners & candy stalls',
    icon: '🚧',
    badge: 'World 6',
    levelStart: 626,
    levelEnd: 750,
    unlockRequirementLevel: 500,
    chapters: [
      'Carnival Parade',
      'Grand Midway',
      'Ferris Way',
      'Celebration Boulevard',
      'Carnival Grand Finale',
    ],
    skyColor: 0xfce7f3,       // playful candy sky
    fogColor: 0xfce7f3,
    fogDensity: 0.005,
    groundColor: 0x86efac,
    roadColor: 0x475569,
    puzzlePadColor: 0x6b7280,
    sunLightColor: 0xfef08a,
    sunIntensity: 2.3,
    ambientLightColor: 0xffedd5,
    ambientIntensity: 1.4,
    hemiSkyColor: 0xf472b6,
    hemiGroundColor: 0x86efac,
    terminalBuildingColor: 0xec4899, // joyful pink fairground tent
    terminalRoofColor: 0xfacc15,     // golden circus trim
    sidewalkColor: 0xfff1f2,
    curbColor: 0xfecdd3,
    gridLineColor1: 0xffffff,
    gridLineColor2: 0xf472b6,
    coneColor: 0xec4899,
    accentGlowColor: 0xf43f5e,
    treeFoliageColor: 0x22c55e,
    treeTrunkColor: 0x78350f,
    propType: 'festival',
  },

  // WORLD 7 — Sunset Promenade (Levels 751 - 875)
  7: {
    id: 7,
    name: 'Sunset Promenade',
    subtitle: 'Warm golden hour city with cozy cafe umbrellas & amber glow',
    icon: '🔄',
    badge: 'World 7',
    levelStart: 751,
    levelEnd: 875,
    unlockRequirementLevel: 625,
    chapters: [
      'Golden Hour Avenue',
      'Twilight Square',
      'Amber Highway',
      'Sunset Viaduct',
      'Horizon Central',
    ],
    skyColor: 0xffedd5,       // warm peach/apricot golden hour sky
    fogColor: 0xffedd5,
    fogDensity: 0.005,
    groundColor: 0xfde047,    // warm sunlit lawn
    roadColor: 0x475569,
    puzzlePadColor: 0x57657b,
    sunLightColor: 0xfbbf24,  // warm amber sun
    sunIntensity: 2.2,
    ambientLightColor: 0xfef3c7,
    ambientIntensity: 1.45,
    hemiSkyColor: 0xfb923c,
    hemiGroundColor: 0xfacc15,
    terminalBuildingColor: 0xf97316, // warm terracotta bistro
    terminalRoofColor: 0xfacc15,
    sidewalkColor: 0xffedd5,
    curbColor: 0xfed7aa,
    gridLineColor1: 0xffffff,
    gridLineColor2: 0xfbbf24,
    coneColor: 0xf97316,
    accentGlowColor: 0xf59e0b,
    treeFoliageColor: 0x16a34a,
    treeTrunkColor: 0x78350f,
    propType: 'sunset',
  },

  // WORLD 8 — Alpine Meadow Valley (Levels 876 - 1000)
  8: {
    id: 8,
    name: 'Alpine Valley',
    subtitle: 'Clear mountain breeze, pine trees & timber chalet station',
    icon: '🚍',
    badge: 'World 8',
    levelStart: 876,
    levelEnd: 1000,
    unlockRequirementLevel: 750,
    chapters: [
      'Glacier Foothills',
      'Pine Forest Switchbacks',
      'Mountain Pass',
      'Summit Ridge',
      'Mount Olympus Peak',
    ],
    skyColor: 0xdbeafe,
    fogColor: 0xdbeafe,
    fogDensity: 0.004,
    groundColor: 0x4ade80,    // alpine green pasture
    roadColor: 0x475569,
    puzzlePadColor: 0x5b6b82,
    sunLightColor: 0xfef9c3,
    sunIntensity: 2.2,
    ambientLightColor: 0xdcfce7,
    ambientIntensity: 1.4,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0x86efac,
    terminalBuildingColor: 0x16a34a, // chalet forest green
    terminalRoofColor: 0xa16207,     // warm cedar timber roof
    sidewalkColor: 0xf0fdf4,
    curbColor: 0xdcfce7,
    gridLineColor1: 0xffffff,
    gridLineColor2: 0x86efac,
    coneColor: 0xf97316,
    accentGlowColor: 0x22c55e,
    treeFoliageColor: 0x15803d,
    treeTrunkColor: 0x78350f,
    propType: 'mountain',
  },
};

export function getWorldConfig(worldId: number): WorldThemeConfig {
  return WORLD_THEMES[worldId] || WORLD_THEMES[1];
}

export function getWorldIdForLevel(levelId: number): number {
  const w = Math.floor((levelId - 1) / 125) + 1;
  return Math.min(8, Math.max(1, w));
}

export function getChapterInfo(levelId: number): {
  worldId: number;
  chapterIndex: number; // 1 to 5
  chapterName: string;
  levelInChapter: number; // 1 to 25
  levelInWorld: number; // 1 to 125
} {
  const worldId = getWorldIdForLevel(levelId);
  const levelInWorld = ((levelId - 1) % 125) + 1;
  const chapterIndex = Math.min(5, Math.floor((levelInWorld - 1) / 25) + 1);
  const levelInChapter = ((levelInWorld - 1) % 25) + 1;
  const theme = getWorldConfig(worldId);
  const chapterName = theme.chapters?.[chapterIndex - 1] || `Chapter ${chapterIndex}`;
  return { worldId, chapterIndex, chapterName, levelInChapter, levelInWorld };
}
