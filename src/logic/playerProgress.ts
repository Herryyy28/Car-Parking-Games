export interface PlayerProgressData {
  currentLevel: number;
  unlockedLevel: number;
  stars: Record<number, number>; // levelId -> stars 1..3
  coins: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  tutorialCompleted: boolean;
}

const STORAGE_KEY = 'bus_game_player_progress_v2';

export class PlayerProgress {
  private static data: PlayerProgressData = PlayerProgress.load();

  private static load(): PlayerProgressData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }

    return {
      currentLevel: 1,
      unlockedLevel: 1,
      stars: {},
      coins: 1000,
      soundEnabled: true,
      vibrationEnabled: true,
      tutorialCompleted: false,
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

  public static recordLevelVictory(levelId: number, movesLeft: number, parMoves: number): { stars: number; rewardCoins: number } {
    let stars = 1;
    if (movesLeft >= Math.floor(parMoves * 0.4)) stars = 3;
    else if (movesLeft >= Math.floor(parMoves * 0.15)) stars = 2;

    const prevStars = this.data.stars[levelId] || 0;
    if (stars > prevStars) {
      this.data.stars[levelId] = stars;
    }

    // Unlock next level
    if (levelId >= this.data.unlockedLevel) {
      this.data.unlockedLevel = levelId + 1;
    }

    const rewardCoins = 100 + stars * 50;
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
}
