import * as THREE from 'three';

export type WeatherType = 'SUNNY' | 'SUNSET' | 'RAIN' | 'SNOW' | 'FOG' | 'NIGHT_NEON' | 'DESERT_HAZE' | 'SPRING_BLOSSOM';

export interface WeatherCondition {
  type: WeatherType;
  name: string;
  icon: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  skyFillColor: number;
  skyFillIntensity: number;
  roadRoughness: number;    // wet roads have low roughness and high specular shine
  roadMetalness: number;
  puddleOpacity: number;
  particleType: 'none' | 'rain' | 'snow' | 'fog_mist' | 'neon_sparkle' | 'petals';
  particleCount: number;
  particleSize: number;
  particleColor: number;
  particleOpacity: number;
  particleSpeed: number;
  windX: number;
  windZ: number;
}

export const WEATHER_CONDITIONS: Record<WeatherType, WeatherCondition> = {
  SUNNY: {
    type: 'SUNNY',
    name: 'Clear Sunlight',
    icon: '☀️',
    skyColor: 0x0a101d,
    fogColor: 0x0a101d,
    fogDensity: 0.011,
    sunColor: 0xfff8db,
    sunIntensity: 1.85,
    ambientColor: 0xffffff,
    ambientIntensity: 1.15,
    skyFillColor: 0x38bdf8,
    skyFillIntensity: 0.8,
    roadRoughness: 0.88,
    roadMetalness: 0.1,
    puddleOpacity: 0.0,
    particleType: 'none',
    particleCount: 0,
    particleSize: 0,
    particleColor: 0xffffff,
    particleOpacity: 0,
    particleSpeed: 0,
    windX: 0,
    windZ: 0,
  },
  SUNSET: {
    type: 'SUNSET',
    name: 'Golden Sunset',
    icon: '🌅',
    skyColor: 0x2d1218,
    fogColor: 0x2d1218,
    fogDensity: 0.014,
    sunColor: 0xf97316,
    sunIntensity: 2.1,
    ambientColor: 0xfecdd3,
    ambientIntensity: 1.05,
    skyFillColor: 0xf43f5e,
    skyFillIntensity: 0.9,
    roadRoughness: 0.75,
    roadMetalness: 0.2,
    puddleOpacity: 0.0,
    particleType: 'none',
    particleCount: 0,
    particleSize: 0,
    particleColor: 0xffffff,
    particleOpacity: 0,
    particleSpeed: 0,
    windX: 0,
    windZ: 0,
  },
  RAIN: {
    type: 'RAIN',
    name: 'Thunder Rain & Wet Asphalt',
    icon: '🌧️',
    skyColor: 0x0b1320,
    fogColor: 0x162235,
    fogDensity: 0.024,
    sunColor: 0x94a3b8,
    sunIntensity: 1.15,
    ambientColor: 0x64748b,
    ambientIntensity: 0.95,
    skyFillColor: 0x38bdf8,
    skyFillIntensity: 0.6,
    roadRoughness: 0.18, // mirror-like wet asphalt reflection
    roadMetalness: 0.6,
    puddleOpacity: 0.9,
    particleType: 'rain',
    particleCount: 750,
    particleSize: 0.22,
    particleColor: 0x93c5fd,
    particleOpacity: 0.75,
    particleSpeed: 28,
    windX: 3.5,
    windZ: -1.2,
  },
  SNOW: {
    type: 'SNOW',
    name: 'Alpine Blizzard & Flurries',
    icon: '❄️',
    skyColor: 0x0b1e2c,
    fogColor: 0x1e3a52,
    fogDensity: 0.026,
    sunColor: 0xe0f2fe,
    sunIntensity: 1.5,
    ambientColor: 0xbae6fd,
    ambientIntensity: 1.25,
    skyFillColor: 0x7dd3fc,
    skyFillIntensity: 0.75,
    roadRoughness: 0.65,
    roadMetalness: 0.35,
    puddleOpacity: 0.4,
    particleType: 'snow',
    particleCount: 650,
    particleSize: 0.35,
    particleColor: 0xffffff,
    particleOpacity: 0.85,
    particleSpeed: 5.5,
    windX: 2.2,
    windZ: 1.5,
  },
  FOG: {
    type: 'FOG',
    name: 'Dense Coastal Fog & Mist',
    icon: '🌫️',
    skyColor: 0x1e293b,
    fogColor: 0x334155,
    fogDensity: 0.042, // very dense atmospheric mist
    sunColor: 0xf1f5f9,
    sunIntensity: 1.0,
    ambientColor: 0x94a3b8,
    ambientIntensity: 1.1,
    skyFillColor: 0x64748b,
    skyFillIntensity: 0.5,
    roadRoughness: 0.45,
    roadMetalness: 0.3,
    puddleOpacity: 0.5,
    particleType: 'fog_mist',
    particleCount: 380,
    particleSize: 0.8,
    particleColor: 0xcfd8dc,
    particleOpacity: 0.28,
    particleSpeed: 2.0,
    windX: 1.2,
    windZ: 0.8,
  },
  NIGHT_NEON: {
    type: 'NIGHT_NEON',
    name: 'Cyberpunk Neon Drizzle',
    icon: '🌃',
    skyColor: 0x050711,
    fogColor: 0x090d1f,
    fogDensity: 0.016,
    sunColor: 0x22d3ee,
    sunIntensity: 1.2,
    ambientColor: 0xa855f7,
    ambientIntensity: 0.9,
    skyFillColor: 0xf43f5e,
    skyFillIntensity: 1.1,
    roadRoughness: 0.25, // neon glossy wet street
    roadMetalness: 0.55,
    puddleOpacity: 0.75,
    particleType: 'neon_sparkle',
    particleCount: 420,
    particleSize: 0.26,
    particleColor: 0x38bdf8,
    particleOpacity: 0.8,
    particleSpeed: 18,
    windX: 2.0,
    windZ: 0.5,
  },
  DESERT_HAZE: {
    type: 'DESERT_HAZE',
    name: 'Desert Sun Haze & Dust',
    icon: '🏜️',
    skyColor: 0x27190c,
    fogColor: 0x3d2511,
    fogDensity: 0.018,
    sunColor: 0xfde047,
    sunIntensity: 2.3,
    ambientColor: 0xfef08a,
    ambientIntensity: 1.25,
    skyFillColor: 0xf97316,
    skyFillIntensity: 0.8,
    roadRoughness: 0.95,
    roadMetalness: 0.05,
    puddleOpacity: 0.0,
    particleType: 'fog_mist',
    particleCount: 220,
    particleSize: 0.45,
    particleColor: 0xd97706,
    particleOpacity: 0.22,
    particleSpeed: 3.5,
    windX: 4.0,
    windZ: 1.2,
  },
  SPRING_BLOSSOM: {
    type: 'SPRING_BLOSSOM',
    name: 'Festival Petal Breeze',
    icon: '🌸',
    skyColor: 0x1f102b,
    fogColor: 0x2e143f,
    fogDensity: 0.013,
    sunColor: 0xfef08a,
    sunIntensity: 2.0,
    ambientColor: 0xfce7f3,
    ambientIntensity: 1.2,
    skyFillColor: 0xf472b6,
    skyFillIntensity: 0.85,
    roadRoughness: 0.8,
    roadMetalness: 0.15,
    puddleOpacity: 0.1,
    particleType: 'petals',
    particleCount: 300,
    particleSize: 0.38,
    particleColor: 0xf472b6,
    particleOpacity: 0.85,
    particleSpeed: 4.2,
    windX: 2.8,
    windZ: -1.8,
  },
};

/**
 * Determines appropriate default weather condition for each world theme.
 */
export function getDefaultWeatherForWorld(worldId: number): WeatherType {
  switch (worldId) {
    case 1: // City Parking -> Clear sunny day
      return 'SUNNY';
    case 2: // Bus Station Hub -> Rain over transit terminal
      return 'RAIN';
    case 3: // Downtown Skyline -> Foggy metropolitan morning
      return 'FOG';
    case 4: // Palm Beach Harbor -> Golden coastal sunset
      return 'SUNSET';
    case 5: // Airport Express -> Clear sunny runway
      return 'SUNNY';
    case 6: // Carnival Fairground -> Floating festival petals
      return 'SPRING_BLOSSOM';
    case 7: // Neon Cyber City -> Wet cyberpunk drizzle
      return 'NIGHT_NEON';
    case 8: // Alpine Mountain Pass -> Mountain snow flurries
      return 'SNOW';
    default:
      return 'SUNNY';
  }
}

/**
 * WeatherTimeSystem (Weather Manager)
 * Handles dynamic particle weather (rain, snow, fog mist, petals, neon drizzle),
 * smooth environmental lighting transitions, and wet asphalt shader updates.
 */
export class WeatherTimeSystem {
  private scene: THREE.Scene;
  private particleSystem: THREE.Points | null = null;
  private particleVelocities: Float32Array | null = null;
  private particleInitialParams: { count: number; speed: number; windX: number; windZ: number } = {
    count: 0,
    speed: 0,
    windX: 0,
    windZ: 0,
  };
  private currentWeather: WeatherType = 'SUNNY';

  // Lightning effect references for rain storms
  private lightningLight: THREE.PointLight | null = null;
  private nextLightningTime: number = 0;
  private lightningFlashDuration: number = 0;

  // Registered arena elements for smooth material / lighting updates
  private registeredElements?: {
    roadMaterial?: THREE.MeshStandardMaterial;
    asphaltMaterial?: THREE.MeshStandardMaterial;
    sunLight?: THREE.DirectionalLight;
    ambientLight?: THREE.AmbientLight;
    skyFill?: THREE.DirectionalLight;
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setupLightning();
  }

  private setupLightning(): void {
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 80, 2);
    this.lightningLight.position.set(0, 26, 0);
    this.scene.add(this.lightningLight);
    this.scheduleNextLightning();
  }

  private scheduleNextLightning(): void {
    // Random lightning flash between 6 to 14 seconds during rain storms
    this.nextLightningTime = performance.now() + 6000 + Math.random() * 8000;
  }

  public registerElements(elements: {
    roadMaterial?: THREE.MeshStandardMaterial;
    asphaltMaterial?: THREE.MeshStandardMaterial;
    sunLight?: THREE.DirectionalLight;
    ambientLight?: THREE.AmbientLight;
    skyFill?: THREE.DirectionalLight;
  }): void {
    this.registeredElements = elements;
  }

  public getWeather(): WeatherType {
    return this.currentWeather;
  }

  public getWeatherConfig(): WeatherCondition {
    return WEATHER_CONDITIONS[this.currentWeather];
  }

  /**
   * Set or switch weather condition dynamically.
   */
  public setWeather(
    weather: WeatherType,
    customElements?: {
      roadMaterial?: THREE.MeshStandardMaterial;
      asphaltMaterial?: THREE.MeshStandardMaterial;
      sunLight?: THREE.DirectionalLight;
      ambientLight?: THREE.AmbientLight;
      skyFill?: THREE.DirectionalLight;
    }
  ): void {
    this.currentWeather = weather;
    const cfg = WEATHER_CONDITIONS[weather];
    const elements = customElements || this.registeredElements;

    // 1. Atmosphere: Background & Fog
    this.scene.background = new THREE.Color(cfg.skyColor);
    // Linear fog ensures gameplay board (0-65m) has 100% crystal-clear clarity with zero fog washout
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.set(cfg.fogColor);
      this.scene.fog.near = 75;
      this.scene.fog.far = 160;
    } else {
      this.scene.fog = new THREE.Fog(cfg.fogColor, 75, 160);
    }

    // 2. Dynamic Lighting: Sun, Ambient, and Sky Fill
    if (elements?.sunLight) {
      elements.sunLight.color.set(cfg.sunColor);
      elements.sunLight.intensity = cfg.sunIntensity;
    }

    if (elements?.ambientLight) {
      elements.ambientLight.color.set(cfg.ambientColor);
      elements.ambientLight.intensity = cfg.ambientIntensity;
    }

    if (elements?.skyFill) {
      elements.skyFill.color.set(cfg.skyFillColor);
      elements.skyFill.intensity = cfg.skyFillIntensity;
    }

    // 3. Road & Asphalt materials: Wetness, Roughness & Reflectivity
    if (elements?.roadMaterial) {
      elements.roadMaterial.roughness = cfg.roadRoughness;
      elements.roadMaterial.metalness = cfg.roadMetalness;
      elements.roadMaterial.needsUpdate = true;
    }

    if (elements?.asphaltMaterial) {
      elements.asphaltMaterial.roughness = cfg.roadRoughness;
      elements.asphaltMaterial.metalness = cfg.roadMetalness;
      elements.asphaltMaterial.needsUpdate = true;
    }

    // 4. Rebuild or adjust Particle System
    this.rebuildParticles(cfg);
  }

  /**
   * Build particles tailored for Rain, Snow, Fog Mist, or Petals.
   */
  private rebuildParticles(cfg: WeatherCondition): void {
    // Clean up existing particles
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
      this.particleVelocities = null;
    }

    if (cfg.particleType === 'none' || cfg.particleCount <= 0) {
      return;
    }

    const count = cfg.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count);

    // Initial boundary distribution
    const spreadXZ = 48;
    const spreadY = 28;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadXZ;
      positions[i * 3 + 1] = Math.random() * spreadY + 1.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spreadXZ;

      // Add speed variation per particle
      const speedVariation = (Math.random() * 0.4 + 0.8) * cfg.particleSpeed;
      this.particleVelocities[i] = speedVariation;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle texture / style
    const material = new THREE.PointsMaterial({
      color: cfg.particleColor,
      size: cfg.particleSize,
      transparent: true,
      opacity: cfg.particleOpacity,
      depthWrite: false,
      blending: cfg.particleType === 'neon_sparkle' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleInitialParams = {
      count,
      speed: cfg.particleSpeed,
      windX: cfg.windX,
      windZ: cfg.windZ,
    };

    this.scene.add(this.particleSystem);
  }

  /**
   * Update particle kinematics, wind drift, and storm lightning each frame.
   */
  public update(delta: number): void {
    const cfg = WEATHER_CONDITIONS[this.currentWeather];

    // 1. Particle Kinematics Update
    if (this.particleSystem && this.particleVelocities) {
      const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
      const count = this.particleInitialParams.count;
      const now = performance.now() * 0.001;

      for (let i = 0; i < count; i++) {
        const velY = this.particleVelocities[i];

        if (cfg.particleType === 'snow') {
          // Soft fluttering gentle descent
          const flutter = Math.sin(now * 3 + i) * 1.5;
          positions[i * 3 + 1] -= velY * delta;
          positions[i * 3] += (cfg.windX + flutter) * delta;
          positions[i * 3 + 2] += (cfg.windZ + Math.cos(now * 2 + i)) * delta;
        } else if (cfg.particleType === 'petals') {
          // Floating petal swaying in gentle breeze
          const sway = Math.sin(now * 2.5 + i * 0.7) * 2.2;
          positions[i * 3 + 1] -= velY * delta;
          positions[i * 3] += (cfg.windX + sway) * delta;
          positions[i * 3 + 2] += (cfg.windZ + Math.cos(now * 1.8 + i)) * delta;
        } else if (cfg.particleType === 'fog_mist') {
          // Slow drifting ambient clouds
          positions[i * 3 + 1] += Math.sin(now + i) * 0.15 * delta;
          positions[i * 3] += cfg.windX * delta;
          positions[i * 3 + 2] += cfg.windZ * delta;
        } else {
          // Fast rain or neon drizzle
          positions[i * 3 + 1] -= velY * delta;
          positions[i * 3] += cfg.windX * delta;
          positions[i * 3 + 2] += cfg.windZ * delta;
        }

        // Loop / Wrap bounds
        if (positions[i * 3 + 1] < 0.2) {
          positions[i * 3 + 1] = 25 + Math.random() * 4;
          positions[i * 3] = (Math.random() - 0.5) * 48;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 48;
        }
        if (Math.abs(positions[i * 3]) > 26) {
          positions[i * 3] = -Math.sign(positions[i * 3]) * 24;
        }
        if (Math.abs(positions[i * 3 + 2]) > 26) {
          positions[i * 3 + 2] = -Math.sign(positions[i * 3 + 2]) * 24;
        }
      }

      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Storm Lightning Effect (active during RAIN)
    if (this.lightningLight) {
      const now = performance.now();
      if (cfg.type === 'RAIN') {
        if (now > this.nextLightningTime) {
          this.lightningLight.intensity = 2.8 + Math.random() * 2.2;
          this.lightningFlashDuration = 120 + Math.random() * 80;
          this.scheduleNextLightning();
        } else if (this.lightningFlashDuration > 0) {
          this.lightningFlashDuration -= delta * 1000;
          if (this.lightningFlashDuration <= 0) {
            this.lightningLight.intensity = 0;
          }
        }
      } else {
        this.lightningLight.intensity = 0;
      }
    }
  }

  public dispose(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
    }
    if (this.lightningLight) {
      this.scene.remove(this.lightningLight);
      this.lightningLight = null;
    }
  }
}
