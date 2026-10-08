export interface LiveryConfig {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  price: number;
  unlockedByDefault?: boolean;
  stripeColor: number;
  roofColor: number;
  accentColor: number;
  finish: 'gloss' | 'metallic' | 'cyber' | 'matte';
  roughness: number;
  metalness: number;
  patternType: 'default' | 'racing_stripes' | 'cyber_circuit' | 'school_bus' | 'heritage_cap' | 'gold_chrome';
}

export interface UnderglowConfig {
  id: string;
  name: string;
  colorHex: number;
  glowCss: string;
  intensity: number;
  price: number;
  unlockedByDefault?: boolean;
}

export interface RimConfig {
  id: string;
  name: string;
  type: 'standard' | 'chrome' | 'turbine' | 'gold' | 'carbon';
  colorHex: number;
  metalness: number;
  roughness: number;
  price: number;
  unlockedByDefault?: boolean;
}

export interface HornConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  unlockedByDefault?: boolean;
}

export interface TuningConfig {
  engineLevel: number; // 0-3 (Boosts travel speed along trajectory)
  turningLevel: number; // 0-3 (Sharper cornering response)
  boardingLevel: number; // 0-3 (Faster boarding hydraulic kneel)
}

export const LIVERIES: LiveryConfig[] = [
  {
    id: 'DEFAULT',
    name: 'Stock Factory Color',
    subtitle: 'Standard transit fleet appearance',
    badge: 'STANDARD',
    price: 0,
    unlockedByDefault: true,
    stripeColor: 0xffffff,
    roofColor: 0x1e293b,
    accentColor: 0xffffff,
    finish: 'gloss',
    roughness: 0.28,
    metalness: 0.15,
    patternType: 'default',
  },
  {
    id: 'RETRO_STRIPES',
    name: '80s Turbo GT Stripes',
    subtitle: 'Twin racing stripes with aerodynamic high-gloss finish',
    badge: 'SPORT',
    price: 250,
    stripeColor: 0xf8fafc,
    roofColor: 0x0f172a,
    accentColor: 0xef4444,
    finish: 'gloss',
    roughness: 0.18,
    metalness: 0.35,
    patternType: 'racing_stripes',
  },
  {
    id: 'CYBER_NEON',
    name: 'Neon Matrix Grid',
    subtitle: 'High-tech glowing circuit trim with iridescent specular reflection',
    badge: 'CYBER',
    price: 500,
    stripeColor: 0x00f0ff,
    roofColor: 0x090d16,
    accentColor: 0xff007f,
    finish: 'cyber',
    roughness: 0.12,
    metalness: 0.75,
    patternType: 'cyber_circuit',
  },
  {
    id: 'SCHOOL_BUS',
    name: 'Classic Yellow Cab',
    subtitle: 'Heritage black-band stripes and reflective roof signal strip',
    badge: 'RETRO',
    price: 350,
    stripeColor: 0x111827,
    roofColor: 0x0f172a,
    accentColor: 0xf59e0b,
    finish: 'gloss',
    roughness: 0.3,
    metalness: 0.2,
    patternType: 'school_bus',
  },
  {
    id: 'LONDON_RED',
    name: 'Metropolitan Heritage',
    subtitle: 'Vintage royal coach white roof crown and silver beltlines',
    badge: 'ROYAL',
    price: 450,
    stripeColor: 0xf1f5f9,
    roofColor: 0xffffff,
    accentColor: 0xe2e8f0,
    finish: 'gloss',
    roughness: 0.2,
    metalness: 0.4,
    patternType: 'heritage_cap',
  },
  {
    id: 'GOLDEN_VIP',
    name: '24K Golden Sovereign',
    subtitle: 'Ultra-luxurious mirrored titanium gold wrap for elite operators',
    badge: 'LEGENDARY',
    price: 800,
    stripeColor: 0xfef08a,
    roofColor: 0x78350f,
    accentColor: 0xfde047,
    finish: 'metallic',
    roughness: 0.08,
    metalness: 0.95,
    patternType: 'gold_chrome',
  },
];

export const UNDERGLOWS: UnderglowConfig[] = [
  {
    id: 'NONE',
    name: 'No Underglow',
    colorHex: 0x000000,
    glowCss: 'transparent',
    intensity: 0,
    price: 0,
    unlockedByDefault: true,
  },
  {
    id: 'CYAN_PULSE',
    name: 'Cyan Cyberline',
    colorHex: 0x00f0ff,
    glowCss: '#00f0ff',
    intensity: 1.8,
    price: 180,
  },
  {
    id: 'MAGENTA_GLOW',
    name: 'Synthwave Magenta',
    colorHex: 0xff007f,
    glowCss: '#ff007f',
    intensity: 1.9,
    price: 220,
  },
  {
    id: 'NEON_LIME',
    name: 'Toxic Lime Acid',
    colorHex: 0x10b981,
    glowCss: '#10b981',
    intensity: 1.7,
    price: 200,
  },
  {
    id: 'ELECTRIC_BLUE',
    name: 'Deep Electric Blue',
    colorHex: 0x3b82f6,
    glowCss: '#3b82f6',
    intensity: 1.85,
    price: 200,
  },
  {
    id: 'SUNSET_AMBER',
    name: 'Solar Sunset Flare',
    colorHex: 0xf59e0b,
    glowCss: '#f59e0b',
    intensity: 2.0,
    price: 240,
  },
  {
    id: 'GOLD_LUXURY',
    name: 'Imperial Golden Halo',
    colorHex: 0xfacc15,
    glowCss: '#facc15',
    intensity: 2.2,
    price: 350,
  },
];

export const RIMS: RimConfig[] = [
  {
    id: 'STANDARD',
    name: 'OEM Steel Wheels',
    type: 'standard',
    colorHex: 0xe2e8f0,
    metalness: 0.6,
    roughness: 0.35,
    price: 0,
    unlockedByDefault: true,
  },
  {
    id: 'CHROME_HUB',
    name: 'High-Mirror Chrome',
    type: 'chrome',
    colorHex: 0xffffff,
    metalness: 0.95,
    roughness: 0.08,
    price: 150,
  },
  {
    id: 'NEON_TURBINE',
    name: 'Aero Neon Turbine',
    type: 'turbine',
    colorHex: 0x00f0ff,
    metalness: 0.85,
    roughness: 0.15,
    price: 300,
  },
  {
    id: 'GOLD_SPOKES',
    name: 'Vintage Gold Mesh',
    type: 'gold',
    colorHex: 0xfbbf24,
    metalness: 0.9,
    roughness: 0.2,
    price: 280,
  },
  {
    id: 'STEALTH_CARBON',
    name: 'Forged Carbon Stealth',
    type: 'carbon',
    colorHex: 0x18181b,
    metalness: 0.4,
    roughness: 0.1,
    price: 220,
  },
];

export const HORNS: HornConfig[] = [
  {
    id: 'STANDARD',
    name: 'Standard Dual Beep',
    icon: '🎺',
    description: 'Crisp factory dual-tone city transit horn',
    price: 0,
    unlockedByDefault: true,
  },
  {
    id: 'AIR_HORN',
    name: 'Heavy Train Air Horn',
    icon: '📢',
    description: 'Deep resonant double-blast locomotive air horn with valve hiss',
    price: 200,
  },
  {
    id: 'TRAM_BELL',
    name: 'Melodic European Tram Bell',
    icon: '🔔',
    description: 'Pleasant chiming ding-ding sound popular on historic streetcars',
    price: 180,
  },
  {
    id: 'LONDON_KLAXON',
    name: 'Heritage Bus Klaxon',
    icon: '📯',
    description: 'Classic vintage brass bulb "AWOOGA" klaxon horn',
    price: 260,
  },
  {
    id: 'PARTY_BOING',
    name: 'Party Comic Chime',
    icon: '🎉',
    description: 'High-pitched spring boing & confetti trumpet sound',
    price: 220,
  },
];

export const TUNING_COSTS = [120, 250, 450]; // Levels 1, 2, 3
