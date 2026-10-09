import { Difficulty, DIFFICULTY_CONFIGS, GameMode } from './types.ts';
import { RadioStation } from '../utils/radioSynthesizer.ts';

export interface PlayerProgressData {
  currentLevel: number;
  unlockedLevel: number;
  stars: Record<number, number>; // levelId -> stars 1..3
  coins: number;
  preferredDifficulty: Difficulty;
  preferredGameMode: GameMode;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  tutorialCompleted: boolean;
  // Garage Customization & Tuning
  activeLivery: string;
  activeUnderglow: string;
  activeRim: string;
  activeHorn: string;
  engineTuningLevel: number; // 0-3
  turningTuningLevel: number; // 0-3
  boardingTuningLevel: number; // 0-3
  unlockedLiveries: string[];
  unlockedUnderglows: string[];
  unlockedRims: string[];
  unlockedHorns: string[];
  // Radio
  radioStation: RadioStation;
  radioVolume: number;
  // Graphics Settings
  graphicsQuality: GraphicsQuality;
}

export type GraphicsQuality = 'HIGH' | 'PERFORMANCE';

const STORAGE_KEY = 'bus_game_player_progress_v3';

export class PlayerProgress {
  private static data: PlayerProgressData = PlayerProgress.load();

  private static load(): PlayerProgressData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('bus_game_player_progress_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.preferredDifficulty) {
          parsed.preferredDifficulty = Difficulty.HARD;
        }
        if (!parsed.preferredGameMode) {
          parsed.preferredGameMode = GameMode.CLASSIC;
        }
        // Defaults for new fields
        parsed.activeLivery = parsed.activeLivery || 'DEFAULT';
        parsed.activeUnderglow = parsed.activeUnderglow || 'NONE';
        parsed.activeRim = parsed.activeRim || 'STANDARD';
        parsed.activeHorn = parsed.activeHorn || 'STANDARD';
        parsed.engineTuningLevel = parsed.engineTuningLevel ?? 0;
        parsed.turningTuningLevel = parsed.turningTuningLevel ?? 0;
        parsed.boardingTuningLevel = parsed.boardingTuningLevel ?? 0;
        parsed.unlockedLiveries = parsed.unlockedLiveries || ['DEFAULT'];
        parsed.unlockedUnderglows = parsed.unlockedUnderglows || ['NONE'];
        parsed.unlockedRims = parsed.unlockedRims || ['STANDARD'];
        parsed.unlockedHorns = parsed.unlockedHorns || ['STANDARD'];
        parsed.radioStation = parsed.radioStation || 'OFF';
        parsed.radioVolume = parsed.radioVolume ?? 0.25;
        parsed.graphicsQuality = parsed.graphicsQuality || 'HIGH';
        return parsed;
      }
    } catch {
      // Fallback
    }

    return {
      currentLevel: 1,
      unlockedLevel: 1,
      stars: {},
      coins: 1000,
      preferredDifficulty: Difficulty.HARD,
      preferredGameMode: GameMode.CLASSIC,
      soundEnabled: true,
      vibrationEnabled: true,
      tutorialCompleted: false,
      activeLivery: 'DEFAULT',
      activeUnderglow: 'NONE',
      activeRim: 'STANDARD',
      activeHorn: 'STANDARD',
      engineTuningLevel: 0,
      turningTuningLevel: 0,
      boardingTuningLevel: 0,
      unlockedLiveries: ['DEFAULT'],
      unlockedUnderglows: ['NONE'],
      unlockedRims: ['STANDARD'],
      unlockedHorns: ['STANDARD'],
      radioStation: 'OFF',
      radioVolume: 0.25,
      graphicsQuality: 'HIGH',
    };
  }

  public static get(): PlayerProgressData {
    return this.data;
  }

  public static save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore
    }
  }

  public static setCustomization(updates: Partial<PlayerProgressData>): void {
    this.data = { ...this.data, ...updates };
    this.save();
  }

  public static unlockItem(type: 'livery' | 'underglow' | 'rim' | 'horn', itemId: string, cost: number): boolean {
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;

    if (type === 'livery' && !this.data.unlockedLiveries.includes(itemId)) {
      this.data.unlockedLiveries.push(itemId);
      this.data.activeLivery = itemId;
    } else if (type === 'underglow' && !this.data.unlockedUnderglows.includes(itemId)) {
      this.data.unlockedUnderglows.push(itemId);
      this.data.activeUnderglow = itemId;
    } else if (type === 'rim' && !this.data.unlockedRims.includes(itemId)) {
      this.data.unlockedRims.push(itemId);
      this.data.activeRim = itemId;
    } else if (type === 'horn' && !this.data.unlockedHorns.includes(itemId)) {
      this.data.unlockedHorns.push(itemId);
      this.data.activeHorn = itemId;
    }
    this.save();
    return true;
  }

  public static upgradeTune(tuneType: 'engine' | 'turning' | 'boarding', cost: number): boolean {
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;

    if (tuneType === 'engine' && this.data.engineTuningLevel < 3) {
      this.data.engineTuningLevel += 1;
    } else if (tuneType === 'turning' && this.data.turningTuningLevel < 3) {
      this.data.turningTuningLevel += 1;
    } else if (tuneType === 'boarding' && this.data.boardingTuningLevel < 3) {
      this.data.boardingTuningLevel += 1;
    }
    this.save();
    return true;
  }

  public static setPreferredDifficulty(difficulty: Difficulty): void {
    this.data.preferredDifficulty = difficulty;
    this.save();
  }

  public static setPreferredGameMode(gameMode: GameMode): void {
    this.data.preferredGameMode = gameMode;
    this.save();
  }

  public static recordLevelVictory(
    levelId: number,
    movesLeft: number,
    parMoves: number,
    difficulty: Difficulty = Difficulty.HARD
  ): { stars: number; rewardCoins: number } {
    let stars = 1;
    if (movesLeft >= Math.floor(parMoves * 0.4)) stars = 3;
    else if (movesLeft >= Math.floor(parMoves * 0.15)) stars = 2;

    const prevStars = this.data.stars[levelId] || 0;
    if (stars > prevStars) {
      this.data.stars[levelId] = stars;
    }

    // Unlock next level (capped at 1000)
    if (levelId >= this.data.unlockedLevel) {
      this.data.unlockedLevel = Math.min(1000, levelId + 1);
    }

    const diffConfig = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS[Difficulty.HARD];
    const baseRewardCoins = 100 + stars * 50;
    const rewardCoins = Math.round(baseRewardCoins * diffConfig.coinMultiplier);
    this.data.coins += rewardCoins;
    this.save();

    return { stars, rewardCoins };
  }

  public static setSound(enabled: boolean): void {
    this.data.soundEnabled = enabled;
    this.save();
  }

  public static setCoins(coins: number): void {
    this.data.coins = coins;
    this.save();
  }

  public static setGraphicsQuality(quality: GraphicsQuality): void {
    this.data.graphicsQuality = quality;
    this.save();
  }

  public static setRadio(station: RadioStation, volume: number): void {
    this.data.radioStation = station;
    this.data.radioVolume = volume;
    this.save();
  }

  public static getGraphicsQuality(): GraphicsQuality {
    return this.data.graphicsQuality || 'HIGH';
  }
}
