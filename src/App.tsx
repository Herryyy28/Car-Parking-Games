import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Shuffle,
  Magnet,
  Plane,
  Undo2,
  ArrowRight,
  Flame,
  Star,
  Coins,
  PlusCircle,
  Play,
  Gift,
  AlertTriangle,
  ShoppingBag,
  Home,
  Grid,
  ChevronLeft,
  Lock,
  Layers,
  Settings,
  HelpCircle,
  Lightbulb,
  Timer,
  Hourglass,
  Gauge,
  Zap,
  Shield,
  Compass,
} from 'lucide-react';
import { BusMadnessArena } from './components/BusMadnessArena.tsx';
import { Hero3DShowcase } from './components/Hero3DShowcase.tsx';
import { DailyRewardModal, DailyRewardDay } from './components/DailyRewardModal.tsx';
import { GameController } from './logic/gameController.ts';
import { GameState, GameStatus, COLOR_MAP, Difficulty, DIFFICULTY_CONFIGS } from './logic/types.ts';
import { LevelRepository } from './logic/levelRepository.ts';
import { PlayerProgress } from './logic/playerProgress.ts';
import { sounds } from './utils/soundEffects.ts';
import { WORLD_THEMES, getWorldConfig, getWorldIdForLevel } from './logic/worldThemes.ts';

type ScreenMode = 'HOME' | 'LEVEL_SELECT' | 'GAME';

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('GAME');
  const [progress, setProgress] = useState(() => PlayerProgress.get());
  const [controller] = useState<GameController>(
    () => new GameController(1, progress.preferredDifficulty || Difficulty.HARD)
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(
    () => progress.preferredDifficulty || Difficulty.HARD
  );
  const [selectedWorldTab, setSelectedWorldTab] = useState<number>(() => {
    return getWorldIdForLevel(controller.getState().levelId);
  });
  const [gameState, setGameState] = useState<GameState>(() => controller.getState());
  const arenaContainerRef = useRef<HTMLDivElement>(null);

  const [soundOn, setSoundOn] = useState(() => progress.soundEnabled);
  const [deviceFrame, setDeviceFrame] = useState<'mobile' | 'studio'>('mobile');

  // Modals
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGridlockModal, setShowGridlockModal] = useState(false);
  const [showOutOfMovesModal, setShowOutOfMovesModal] = useState(false);
  const [showOutOfTimeModal, setShowOutOfTimeModal] = useState(false);
  const [victoryData, setVictoryData] = useState<{ stars: number; rewardCoins: number } | null>(null);

  // Daily cooldown tracking
  const [lastClaimedDaily, setLastClaimedDaily] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bus_game_daily_last_claimed');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [dailyStreak, setDailyStreak] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bus_game_daily_streak');
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const isDailyReady = lastClaimedDaily === 0 || Date.now() - lastClaimedDaily >= COOLDOWN_MS;

  // Subscribe to central GameController
  useEffect(() => {
    const unsubscribe = controller.subscribe((nextState) => {
      setGameState({ ...nextState });
    });
    return unsubscribe;
  }, [controller]);

  // Audio mute sync
  useEffect(() => {
    sounds.soundEnabled = soundOn;
    PlayerProgress.setSound(soundOn);
  }, [soundOn]);

  // Passenger boarding & Game loop tick
  useEffect(() => {
    const timer = setInterval(() => {
      if (screen !== 'GAME') return;

      const step = controller.stepPassengerBoarding();
      if (step.type === 'BOARDED') {
        sounds.playPassengerBoard();
      } else if (step.type === 'DEPARTED') {
        sounds.playEscape();
      } else if (step.type === 'COMPLETED') {
        sounds.playWin();
        const victory = PlayerProgress.recordLevelVictory(
          gameState.levelId,
          gameState.moves,
          gameState.parMoves,
          gameState.difficulty
        );
        setProgress({ ...PlayerProgress.get() });
        setVictoryData(victory);
      } else if (step.type === 'OUT_OF_MOVES') {
        sounds.playGameOver();
        setShowOutOfMovesModal(true);
      } else if (step.type === 'GRIDLOCKED') {
        setShowGridlockModal(true);
      }
    }, 420);

    return () => clearInterval(timer);
  }, [controller, screen, gameState.levelId, gameState.moves, gameState.parMoves]);

  // Level Countdown Timer Loop (Urgency countdown per level)
  useEffect(() => {
    if (screen !== 'GAME') return;

    // Pause timer while modals are active or level is concluded
    const isPaused =
      showDailyModal ||
      showShopModal ||
      showGridlockModal ||
      showOutOfMovesModal ||
      showOutOfTimeModal ||
      !!victoryData ||
      gameState.status === GameStatus.COMPLETED ||
      gameState.status === GameStatus.FAILED ||
      gameState.status === GameStatus.OUT_OF_TIME;

    if (isPaused) return;

    const interval = setInterval(() => {
      const res = controller.tickTimer();
      if (res.type === 'OUT_OF_TIME') {
        sounds.playGameOver();
        setShowOutOfTimeModal(true);
      } else if (res.timeLeft <= 10 && res.timeLeft > 0) {
        if (res.timeLeft === 10) {
          sounds.playTimeWarning();
        } else if (res.timeLeft <= 5) {
          sounds.playTick();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    controller,
    screen,
    showDailyModal,
    showShopModal,
    showGridlockModal,
    showOutOfMovesModal,
    showOutOfTimeModal,
    victoryData,
    gameState.status,
  ]);

  const formatCountdown = (seconds: number) => {
    const safeSec = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle Player Tap on a Vehicle
  const handleVehicleTap = (vehicleId: string) => {
    const result = controller.requestVehicleMove(vehicleId);

    const arenaEl = arenaContainerRef.current?.querySelector('div[class*="select-none"] > div');
    if (!result.success) {
      if (result.reason === 'ALL_BAYS_FULL') {
        setShowGridlockModal(true);
      } else if ((arenaEl as any)?.__triggerBump) {
        (arenaEl as any).__triggerBump(vehicleId, result.blockerId);
      }
    } else if (result.dockIndex !== undefined) {
      if ((arenaEl as any)?.__triggerDriveToDock) {
        (arenaEl as any).__triggerDriveToDock(vehicleId, result.dockIndex);
      }
    }
  };

  // Called when 3D movement reaches parking dock
  const handleVehicleArrived = (vehicleId: string, dockIndex: number) => {
    controller.onVehicleArrivedAtDock(vehicleId, dockIndex);
  };

  const handleParkingEvaluated = (grade: { bonusCoins: number; grade: string }) => {
    if (grade.bonusCoins > 0) {
      controller.addCoins(grade.bonusCoins);
      sounds.playCoin();
    }
  };

  // Daily Claim
  const handleClaimDaily = (reward: DailyRewardDay) => {
    controller.addCoins(reward.coins);
    if (reward.bonus === 'shuffle') controller.useBooster('shuffle');

    const now = Date.now();
    setLastClaimedDaily(now);
    try {
      localStorage.setItem('bus_game_daily_last_claimed', now.toString());
      const nextStreak = (dailyStreak % 7) + 1;
      setDailyStreak(nextStreak);
      localStorage.setItem('bus_game_daily_streak', nextStreak.toString());
    } catch {
      // Ignore
    }

    setTimeout(() => setShowDailyModal(false), 1200);
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    sounds.playClick();
    setSelectedDifficulty(diff);
    PlayerProgress.setPreferredDifficulty(diff);
    setProgress({ ...PlayerProgress.get() });
    controller.setDifficulty(diff);
  };

  const handleLevelSelect = (levelId: number, diffOverride?: Difficulty) => {
    sounds.playClick();
    const diffToUse = diffOverride || selectedDifficulty;
    controller.loadLevel(levelId, diffToUse);
    setVictoryData(null);
    setShowGridlockModal(false);
    setShowOutOfMovesModal(false);
    setShowOutOfTimeModal(false);
    setScreen('GAME');
  };

  const allLevels = LevelRepository.getAllLevels();

  return (
    <div className="min-h-screen game-bg-pattern text-slate-100 flex flex-col font-['Fredoka',sans-serif] select-none overflow-x-hidden">
      {/* Top Universal Arcade App Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {screen !== 'HOME' && (
              <button
                onClick={() => {
                  sounds.playClick();
                  setScreen('HOME');
                }}
                className="w-9 h-9 rounded-xl game-btn game-btn-dark flex items-center justify-center text-slate-200"
                title="Back to Home"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Arcade Title Logo Button */}
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('HOME');
              }}
              className="flex items-center gap-2.5 text-left group active:scale-95 transition-transform"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 p-0.5 shadow-lg shadow-orange-500/20 flex items-center justify-center border border-yellow-200/40">
                <span className="text-xl">🚌</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse"></span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-sm sm:text-base tracking-wide drop-shadow-sm">
                    BUS GAME <span className="text-amber-400">3D</span>
                  </span>
                  <span className="hidden sm:inline-block bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                    BUS JAM
                  </span>
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Daily Gift Button */}
            <button
              onClick={() => {
                sounds.playClick();
                setShowDailyModal(true);
              }}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all game-btn ${
                isDailyReady
                  ? 'game-btn-amber animate-pulse'
                  : 'game-btn-dark text-amber-300'
              }`}
            >
              <Gift className={`w-4 h-4 ${isDailyReady ? 'text-slate-950 animate-bounce' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">{isDailyReady ? 'Daily Gift (Ready!)' : 'Daily Gift'}</span>
              <span className="sm:hidden">Gift</span>
              {isDailyReady && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-ping" />
              )}
            </button>

            {/* Coins Counter with 3D Spinning Coin & Shop */}
            <button
              onClick={() => {
                sounds.playClick();
                setShowShopModal(true);
              }}
              className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 px-3 py-1 rounded-xl text-xs font-black text-amber-300 active:scale-95 transition-all shadow-sm group"
              title="Coin Stash - Tap to open shop"
            >
              <span className="inline-block animate-spin-3d">🪙</span>
              <span className="font-mono font-bold tracking-tight">{gameState.coins.toLocaleString()}</span>
              <span className="text-amber-400 text-[10px] bg-amber-400/30 px-1 rounded-md font-black group-hover:scale-110 transition-transform">
                +
              </span>
            </button>

            {/* Level Select Quick Button */}
            <button
              onClick={() => {
                sounds.playClick();
                setScreen(screen === 'LEVEL_SELECT' ? 'GAME' : 'LEVEL_SELECT');
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all game-btn ${
                screen === 'LEVEL_SELECT' ? 'game-btn-blue' : 'game-btn-dark'
              }`}
              title="Level Select"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* How to Play Help Modal */}
            <button
              onClick={() => {
                sounds.playClick();
                setShowHelpModal(true);
              }}
              className="w-9 h-9 rounded-xl game-btn game-btn-dark flex items-center justify-center text-slate-300"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
            </button>

            {/* Frame View Toggle */}
            <div className="hidden lg:flex items-center bg-slate-800/80 p-0.5 rounded-xl text-xs font-semibold border border-slate-700/60">
              <button
                onClick={() => setDeviceFrame('mobile')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  deviceFrame === 'mobile' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-400'
                }`}
              >
                Mobile View
              </button>
              <button
                onClick={() => setDeviceFrame('studio')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  deviceFrame === 'studio' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-400'
                }`}
              >
                Full Arena
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                setSoundOn(!soundOn);
                sounds.playClick();
              }}
              className="w-9 h-9 rounded-xl game-btn game-btn-dark flex items-center justify-center text-slate-300"
              title="Toggle Audio"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* Screen Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col items-center justify-center">
        {/* ========================================================
            SCREEN 1: HOME SCREEN (3D INTERACTIVE SHOWCASE)
           ======================================================== */}
        {screen === 'HOME' && (
          <div className="max-w-md w-full game-card-3d rounded-[36px] p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            {/* 3D INTERACTIVE BUS TURNTABLE SHOWCASE */}
            <div className="w-full mb-3">
              <Hero3DShowcase />
            </div>

            {/* Game Title with 3D Depth */}
            <div className="mb-4">
              <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wide drop-shadow-md">
                BUS GAME 3D
              </h1>
              <p className="text-xs font-bold text-sky-300 tracking-wide mt-0.5">
                BUS JAM & PASSENGER SORT
              </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3 mb-5">
              <button
                onClick={() => handleLevelSelect(gameState.levelId)}
                className="w-full py-4 rounded-2xl game-btn game-btn-emerald shine-sweep text-white font-black text-base flex items-center justify-center gap-2.5"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>CONTINUE LEVEL {gameState.levelId}</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setScreen('LEVEL_SELECT');
                }}
                className="w-full py-3.5 rounded-2xl game-btn game-btn-blue text-white font-black text-sm flex items-center justify-center gap-2"
              >
                <Grid className="w-4 h-4 text-white" />
                <span>SELECT LEVEL & DIFFICULTY</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowDailyModal(true);
                  }}
                  className="py-3 rounded-2xl game-btn game-btn-amber text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
                >
                  <Gift className="w-4 h-4 text-slate-950" />
                  <span>DAILY CHEST</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowHelpModal(true);
                  }}
                  className="py-3 rounded-2xl game-btn game-btn-dark text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  <span>HOW TO PLAY</span>
                </button>
              </div>
            </div>

            {/* Player Stats 3D Ribbon */}
            <div className="w-full bg-slate-950/70 rounded-2xl p-3.5 flex items-center justify-around border border-slate-800/80 shadow-inner">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Unlocked</span>
                <span className="text-base sm:text-lg font-black text-emerald-400">{progress.unlockedLevel} / {allLevels.length}</span>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Stars</span>
                <span className="text-base sm:text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {Object.values(progress.stars).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Coin Stash</span>
                <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                  {gameState.coins.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 2: LEVEL SELECT
           ======================================================== */}
        {screen === 'LEVEL_SELECT' && (
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-black text-white">Select Puzzle Level</h2>
              </div>
              <button
                onClick={() => setScreen('GAME')}
                className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>

            {/* WORLD THEME SELECTION TABS */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Select World Theme
                </span>
                <span className="text-[11px] font-bold text-sky-400">
                  {getWorldConfig(selectedWorldTab).name}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {Object.values(WORLD_THEMES).map((w) => {
                  const isWorldActive = selectedWorldTab === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        sounds.playClick();
                        setSelectedWorldTab(w.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all active:scale-95 border ${
                        isWorldActive
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-md ring-2 ring-sky-400/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-sm">{w.icon}</span>
                      <span>{w.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 italic mt-1 px-1">
                {getWorldConfig(selectedWorldTab).subtitle}
              </p>
            </div>

            {/* DIFFICULTY SELECTION TIERS */}
            <div className="mb-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Difficulty Tier
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Adjusts Time & Move Limits
                </span>
              </div>

              {/* 3 Tier Selector Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {(Object.values(DIFFICULTY_CONFIGS) as Array<typeof DIFFICULTY_CONFIGS[Difficulty]>).map(
                  (config) => {
                    const isSelected = selectedDifficulty === config.id;
                    const tierIcons = {
                      [Difficulty.CASUAL]: Shield,
                      [Difficulty.HARD]: Compass,
                      [Difficulty.EXPERT]: Zap,
                    };
                    const IconComponent = tierIcons[config.id];

                    return (
                      <button
                        key={config.id}
                        onClick={() => handleDifficultyChange(config.id)}
                        className={`relative p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-95 ${
                          isSelected
                            ? config.id === Difficulty.CASUAL
                              ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30 text-white shadow-md'
                              : config.id === Difficulty.HARD
                              ? 'bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/30 text-white shadow-md'
                              : 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <IconComponent
                              className={`w-3.5 h-3.5 ${
                                isSelected
                                  ? config.id === Difficulty.CASUAL
                                    ? 'text-emerald-400'
                                    : config.id === Difficulty.HARD
                                    ? 'text-blue-400'
                                    : 'text-amber-400'
                                  : 'text-slate-500'
                              }`}
                            />
                            <span
                              className={`text-xs font-black uppercase ${
                                isSelected ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {config.label}
                            </span>
                          </div>
                          {isSelected && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                config.id === Difficulty.CASUAL
                                  ? 'bg-emerald-400'
                                  : config.id === Difficulty.HARD
                                  ? 'bg-blue-400'
                                  : 'bg-amber-400 animate-ping'
                              }`}
                            />
                          )}
                        </div>

                        {/* Modifiers Pill */}
                        <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-black/30 text-slate-200'
                                : 'bg-slate-800/80 text-slate-400'
                            }`}
                          >
                            ⏱️ {Math.round(config.timeMultiplier * 100)}%
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-black/30 text-slate-200'
                                : 'bg-slate-800/80 text-slate-400'
                            }`}
                          >
                            🎯 {Math.round(config.moveMultiplier * 100)}%
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Selected Tier Description & Reward Modifier */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-1.5">
                <span className="font-medium text-slate-300">
                  {DIFFICULTY_CONFIGS[selectedDifficulty].description}
                </span>
                <span className="shrink-0 font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg text-[11px] self-start sm:self-auto">
                  🪙 {Math.round(DIFFICULTY_CONFIGS[selectedDifficulty].coinMultiplier * 100)}% Coin Rewards
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {allLevels.map((lvl) => {
                const isUnlocked = lvl.id <= progress.unlockedLevel;
                const stars = progress.stars[lvl.id] || 0;
                const isCurrent = lvl.id === gameState.levelId;
                const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
                const previewTime = Math.max(25, Math.round(lvl.timeLimit * diffConfig.timeMultiplier));
                const previewMoves = Math.max(10, Math.round(lvl.parMoves * diffConfig.moveMultiplier));

                return (
                  <button
                    key={lvl.id}
                    disabled={!isUnlocked}
                    onClick={() => handleLevelSelect(lvl.id, selectedDifficulty)}
                    className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                      isUnlocked
                        ? isCurrent
                          ? 'game-btn game-btn-emerald border-2 border-emerald-300 shadow-lg text-white'
                          : 'game-btn game-btn-dark border border-slate-700/80 text-slate-100 hover:border-slate-500'
                        : 'bg-slate-950/50 border border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold uppercase mb-0.5 tracking-wide text-slate-300">
                      Level {lvl.id}
                    </div>
                    <div className="text-sm font-black text-white truncate max-w-[140px] mb-1.5 drop-shadow-xs">
                      {lvl.name}
                    </div>

                    {/* Adjusted Time & Moves based on selected difficulty */}
                    {isUnlocked && (
                      <div className="flex items-center gap-1.5 mb-2 text-[10px] font-extrabold text-slate-200 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                        <span className="text-sky-300">⏱️ {previewTime}s</span>
                        <span>•</span>
                        <span className="text-emerald-300">{previewMoves} mvs</span>
                      </div>
                    )}

                    {isUnlocked ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= stars ? 'text-amber-400 fill-amber-400 drop-shadow-xs' : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* PROCEDURAL ENDLESS ENGINE ACTION */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-black text-purple-300 uppercase tracking-wider">
                    Procedural Endless Engine
                  </div>
                  <div className="text-xs font-medium text-slate-300">
                    Play mathematically validated, 100% solvable infinite traffic levels
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const randomLevelId = Math.floor(21 + Math.random() * 80);
                  handleLevelSelect(randomLevelId, selectedDifficulty);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl game-btn game-btn-emerald text-white text-xs font-black flex items-center justify-center gap-2 shrink-0 shadow-md"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>GENERATE LEVEL</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 3: MAIN 3D BOARD GAME SCREEN
           ======================================================== */}
        {screen === 'GAME' && (
          <div
            className={`w-full transition-all duration-300 ${
              deviceFrame === 'mobile'
                ? 'max-w-[430px] bg-slate-950 p-2.5 sm:p-3 rounded-[52px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] border-4 border-slate-700/90 ring-8 ring-slate-900/60'
                : 'max-w-5xl bg-slate-950 p-3 rounded-3xl shadow-2xl border border-slate-800'
            }`}
          >
            <div
              className={`relative w-full overflow-hidden flex flex-col bg-slate-900 ${
                deviceFrame === 'mobile' ? 'rounded-[44px] h-[780px]' : 'rounded-2xl h-[720px]'
              }`}
            >
              {/* TOP TERMINAL HUD */}
              <div className="px-3.5 sm:px-4 pt-3 pb-2.5 bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 z-30 flex items-center justify-between text-white shadow-md border-b border-sky-300/40">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 sm:px-3 py-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 border-2 border-yellow-300 shadow-md flex items-center gap-1.5 animate-pulse">
                    <span className="text-sm font-black text-yellow-300">
                      {gameState.passengers.filter((p) => p.state === 'WAITING').length}
                    </span>
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-tight">Left</span>
                  </div>

                  <div className="text-[11px] font-black text-sky-100 flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setScreen('LEVEL_SELECT');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-sky-950/70 border border-sky-300/40 text-[9px] font-black uppercase text-sky-200 hover:text-white flex items-center gap-1"
                      title="Tap to view Worlds"
                    >
                      <span>{getWorldConfig(gameState.worldId || getWorldIdForLevel(gameState.levelId)).icon}</span>
                      <span>{getWorldConfig(gameState.worldId || getWorldIdForLevel(gameState.levelId)).name}</span>
                    </button>
                    <span>•</span>
                    <span>Lvl {gameState.levelId}: {gameState.levelName}</span>
                    <span>•</span>
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setScreen('LEVEL_SELECT');
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-sm transition-transform active:scale-95 ${
                        gameState.difficulty === Difficulty.CASUAL
                          ? 'bg-emerald-500/90 border-emerald-300 text-white'
                          : gameState.difficulty === Difficulty.EXPERT
                          ? 'bg-amber-400 border-amber-200 text-slate-950 font-black'
                          : 'bg-blue-600/90 border-blue-300 text-white'
                      }`}
                      title="Current Difficulty - Tap to switch"
                    >
                      {gameState.difficulty || 'HARD'}
                    </button>
                    <span>•</span>
                    <span>
                      Bays: {gameState.parkingSlots.filter((s) => s.vehicleId !== null).length}/{gameState.unlockedDocksCount}
                    </span>
                  </div>
                </div>

                {/* Moves, Timer & Restart */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* COUNTDOWN TIMER BADGE */}
                  <div
                    className={`px-2.5 sm:px-3 py-1 rounded-full border text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
                      gameState.timeLeft <= 10
                        ? 'bg-rose-600 border-rose-300 text-white animate-pulse shadow-rose-500/50 ring-2 ring-rose-400/50'
                        : gameState.timeLeft <= 20
                        ? 'bg-amber-500/90 border-amber-200 text-slate-950 font-black animate-pulse'
                        : 'bg-black/35 border-white/20 text-white'
                    }`}
                    title="Level Countdown Timer"
                  >
                    <Timer className={`w-3.5 h-3.5 ${gameState.timeLeft <= 10 ? 'animate-spin text-yellow-300' : ''}`} />
                    <span className="font-mono tracking-tight font-black">{formatCountdown(gameState.timeLeft)}</span>
                  </div>

                  {/* Moves */}
                  <div
                    className={`px-2.5 sm:px-3 py-1 rounded-full backdrop-blur-xs border text-xs font-black transition-colors ${
                      gameState.moves <= 5
                        ? 'bg-red-500/80 border-red-300 text-white animate-pulse'
                        : 'bg-black/30 border-white/20 text-white'
                    }`}
                  >
                    <span>{gameState.moves} Moves</span>
                  </div>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      controller.loadLevel(gameState.levelId);
                      setShowOutOfTimeModal(false);
                      setShowOutOfMovesModal(false);
                      setShowGridlockModal(false);
                    }}
                    className="w-8 h-8 rounded-xl game-btn game-btn-dark flex items-center justify-center text-white"
                    title="Restart Level"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* URGENCY COUNTDOWN PROGRESS BAR */}
              <div className="w-full h-1.5 bg-black/50 overflow-hidden z-30">
                <div
                  className={`h-full transition-all duration-300 ${
                    gameState.timeLeft <= 10
                      ? 'bg-rose-500 animate-pulse'
                      : gameState.timeLeft <= 20
                      ? 'bg-amber-400'
                      : 'bg-cyan-300'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (gameState.timeLeft / (gameState.totalTime || 75)) * 100))}%`,
                  }}
                />
              </div>

              {/* ARCADE STREAK COMBO BANNER */}
              {gameState.comboCount >= 2 && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
                  <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-xs px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 border-2 border-yellow-200">
                    <Flame className="w-4 h-4 text-yellow-200 animate-spin" />
                    <span>{gameState.comboCount}X COMBO! SPEEDY ESCAPE!</span>
                  </div>
                </div>
              )}

              {/* 3D GAME ARENA */}
              <div ref={arenaContainerRef} className="flex-1 relative w-full h-full">
                <BusMadnessArena
                  gameState={gameState}
                  onVehicleTapRequest={handleVehicleTap}
                  onVehicleArrivedAtDock={handleVehicleArrived}
                  onDockUnlockClicked={() => controller.useBooster('extraSpace')}
                  activeHintId={gameState.activeHintVehicleId}
                  isCompleted={!!victoryData || gameState.status === GameStatus.COMPLETED}
                  onParkingEvaluated={handleParkingEvaluated}
                />
              </div>

              {/* HINT BAR */}
              <div className="px-4 py-2 bg-slate-900/95 border-t border-slate-800 z-30 flex items-center justify-between text-xs font-bold text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{gameState.hintMessage}</span>
                </div>

                {gameState.unlockedDocksCount < 6 && (
                  <button
                    onClick={() => controller.useBooster('extraSpace')}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl game-btn game-btn-emerald text-white text-[11px] font-black shrink-0 ml-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Bay ({gameState.unlockedDocksCount}/6)</span>
                  </button>
                )}
              </div>

              {/* CHUNKY BOOSTERS DOCK (TACTILE 3D BUTTONS) */}
              <div className="p-3 bg-slate-950 border-t border-slate-800/80 z-30 flex items-center justify-around gap-2 text-white">
                {/* Hint Booster */}
                <button
                  onClick={() => controller.useBooster('hint')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform group"
                  title="Hint: highlights best vehicle move"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center game-booster-btn border-2 border-yellow-300/40 text-slate-950">
                    <Lightbulb className="w-5 h-5 fill-slate-950" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-sm">
                      {gameState.availableBoosters.hint}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-amber-400">Hint</span>
                </button>

                {/* Shuffle Booster */}
                <button
                  onClick={() => controller.useBooster('shuffle')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform group"
                  title="Shuffle: rotates vehicles to open escape routes"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center game-booster-btn border-2 border-blue-400/40">
                    <Shuffle className="w-5 h-5 text-white" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-sm">
                      {gameState.availableBoosters.shuffle}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-400">Shuffle</span>
                </button>

                {/* Passenger Swap / Magnet Booster */}
                <button
                  onClick={() => controller.useBooster('passengerSwap')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform group"
                  title="Magnet: sorts passengers to match docked buses"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center game-booster-btn border-2 border-purple-400/40">
                    <Magnet className="w-5 h-5 text-white" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-sm">
                      {gameState.availableBoosters.passengerSwap}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-purple-400">Magnet</span>
                </button>

                {/* Undo Booster */}
                <button
                  onClick={() => controller.useBooster('undo')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform group"
                  title="Undo last vehicle move"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center game-booster-btn border-2 border-slate-500/40">
                    <Undo2 className="w-5 h-5 text-white" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-sm">
                      {gameState.availableBoosters.undo}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-300">Undo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODALS: VICTORY, GRIDLOCK, OUT OF MOVES, SHOP, DAILY
           ======================================================== */}

        {/* 1. VICTORY CELEBRATION MODAL */}
        {victoryData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-sm game-modal-3d border-2 border-amber-400/80 rounded-[36px] p-6 text-center shadow-2xl">
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-amber-400/30 border-2 border-yellow-200 animate-float-3d">
                <Trophy className="w-10 h-10 text-slate-950 animate-bounce" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 mb-1">
                VICTORY!
              </h2>
              <p className="text-xs font-semibold text-sky-200 mb-4">
                All vehicles escaped & passengers reached their seats!
              </p>

              {/* 3D Animated Stars */}
              <div className="flex items-center justify-center gap-3 mb-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`transform transition-transform duration-300 ${
                      s <= victoryData.stars ? 'scale-110 animate-bounce' : 'scale-90 opacity-40'
                    }`}
                    style={{ animationDelay: `${s * 150}ms` }}
                  >
                    <Star
                      className={`w-9 h-9 drop-shadow-md ${
                        s <= victoryData.stars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Reward stats */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-5 flex items-center justify-around shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Reward</span>
                  <span className="text-base font-black text-amber-300 flex items-center justify-center gap-1">
                    <span className="animate-spin-3d">🪙</span> +{victoryData.rewardCoins}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Difficulty</span>
                  <span
                    className={`text-xs font-black uppercase px-2 py-0.5 rounded-md inline-block ${
                      gameState.difficulty === Difficulty.CASUAL
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : gameState.difficulty === Difficulty.EXPERT
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {gameState.difficulty}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Moves Left</span>
                  <span className="text-base font-black text-emerald-400">{gameState.moves}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    const nextId = (gameState.levelId % allLevels.length) + 1;
                    handleLevelSelect(nextId);
                  }}
                  className="w-full py-4 rounded-2xl game-btn game-btn-emerald shine-sweep text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>NEXT PUZZLE (LEVEL {(gameState.levelId % allLevels.length) + 1})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setVictoryData(null);
                    setScreen('LEVEL_SELECT');
                  }}
                  className="w-full py-3 rounded-2xl game-btn game-btn-dark text-slate-300 font-bold text-xs"
                >
                  Choose Level
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. GRIDLOCK MODAL */}
        {showGridlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-sm game-modal-3d border-2 border-rose-500/80 rounded-[36px] p-6 text-center shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/30 animate-pulse">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">BAYS ARE JAMMED!</h2>
              <p className="text-xs text-slate-300 mb-4">
                All waiting bays are occupied, and none match the color of the front passenger in line.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    controller.useBooster('passengerSwap');
                    setShowGridlockModal(false);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl game-btn game-btn-blue text-white font-black text-xs flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <Magnet className="w-4 h-4" />
                    <span>Use Magnet (Sorts Line)</span>
                  </div>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-black">
                    {gameState.availableBoosters.passengerSwap > 0 ? `${gameState.availableBoosters.passengerSwap} Left` : '90 🪙'}
                  </span>
                </button>

                {gameState.unlockedDocksCount < 6 && (
                  <button
                    onClick={() => {
                      controller.useBooster('extraSpace');
                      setShowGridlockModal(false);
                    }}
                    className="w-full py-3 px-4 rounded-2xl game-btn game-btn-emerald text-white font-black text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      <span>Unlock 1 Extra Bay</span>
                    </div>
                    <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-black">150 🪙</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowGridlockModal(false);
                    controller.loadLevel(gameState.levelId);
                  }}
                  className="w-full py-2.5 rounded-2xl game-btn game-btn-dark text-slate-300 font-bold text-xs"
                >
                  Restart Level
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. OUT OF MOVES MODAL */}
        {showOutOfMovesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-sm game-modal-3d border-2 border-red-500/80 rounded-[36px] p-6 text-center shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/30 animate-pulse">
                <RotateCcw className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">OUT OF MOVES!</h2>
              <p className="text-xs text-slate-300 mb-4">
                You used all allocated puzzle moves before loading all passengers.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    if (gameState.coins >= 100) {
                      controller.addCoins(-100);
                      controller.addMoves(5);
                      setShowOutOfMovesModal(false);
                    } else {
                      setShowShopModal(true);
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl game-btn game-btn-amber text-slate-950 font-black text-xs flex items-center justify-between shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    <span>Get +5 Moves</span>
                  </div>
                  <span className="text-[11px] bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-full font-black">
                    100 🪙
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowOutOfMovesModal(false);
                    controller.loadLevel(gameState.levelId);
                  }}
                  className="w-full py-2.5 rounded-2xl game-btn game-btn-dark text-slate-300 font-bold text-xs"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3.5. OUT OF TIME MODAL */}
        {showOutOfTimeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-sm game-modal-3d border-2 border-rose-500/80 rounded-[36px] p-6 text-center shadow-2xl">
              {/* Pulsing Timer Icon */}
              <div className="relative w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/30">
                <Timer className="w-8 h-8 text-rose-500 animate-spin" />
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-[10px] font-black text-white border border-rose-300 shadow">
                  00:00
                </span>
              </div>

              <h2 className="text-2xl font-black text-white mb-1 tracking-wide">OUT OF TIME!</h2>
              <p className="text-xs font-medium text-slate-300 mb-4 leading-relaxed">
                The terminal clock hit zero before all passengers could board! Keep your progress by purchasing extra time with coins, or restart the level.
              </p>

              {/* Current Coins Status Bar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 mb-4 flex items-center justify-between px-4">
                <span className="text-xs font-bold text-slate-400">Your Coin Balance</span>
                <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <span className="animate-spin-3d">🪙</span>
                  {gameState.coins.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* 1. Buy +30 Seconds */}
                <button
                  onClick={() => {
                    const cost = 80;
                    if (gameState.coins >= cost) {
                      sounds.playBooster();
                      controller.buyExtraTime(30, cost);
                      setShowOutOfTimeModal(false);
                    } else {
                      sounds.playBlocked();
                      setShowShopModal(true);
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl game-btn game-btn-amber text-slate-950 font-black text-xs flex items-center justify-between shadow-lg"
                >
                  <div className="flex items-center gap-2.5">
                    <Hourglass className="w-4 h-4 text-slate-950" />
                    <div className="text-left">
                      <div className="font-black text-xs leading-tight">Get +30 Seconds</div>
                      <div className="text-[10px] text-amber-950/70 font-semibold">Resume right here</div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-black ${
                      gameState.coins >= 80 ? 'bg-slate-950 text-amber-300' : 'bg-rose-700 text-white'
                    }`}
                  >
                    {gameState.coins >= 80 ? '80 🪙' : 'Need 80 🪙'}
                  </span>
                </button>

                {/* 2. Buy +60 Seconds (Mega Boost) */}
                <button
                  onClick={() => {
                    const cost = 140;
                    if (gameState.coins >= cost) {
                      sounds.playBooster();
                      controller.buyExtraTime(60, cost);
                      setShowOutOfTimeModal(false);
                    } else {
                      sounds.playBlocked();
                      setShowShopModal(true);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl game-btn game-btn-emerald text-white font-black text-xs flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-black text-white">
                      +60s
                    </div>
                    <div className="text-left">
                      <div className="font-black text-xs text-white leading-tight">Get +60 Seconds (Mega Boost)</div>
                      <div className="text-[10px] text-emerald-100 font-semibold">Double time extension</div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-black ${
                      gameState.coins >= 140 ? 'bg-slate-950 text-emerald-300' : 'bg-rose-700 text-white'
                    }`}
                  >
                    {gameState.coins >= 140 ? '140 🪙' : 'Need 140 🪙'}
                  </span>
                </button>

                {/* 3. Restart Level (Free) */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowOutOfTimeModal(false);
                    controller.loadLevel(gameState.levelId);
                  }}
                  className="w-full py-2.5 rounded-2xl game-btn game-btn-dark text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Level (Free)</span>
                </button>

                {/* 4. Choose Level */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowOutOfTimeModal(false);
                    setScreen('LEVEL_SELECT');
                  }}
                  className="w-full py-2 rounded-2xl bg-transparent hover:bg-slate-800 text-slate-400 font-medium text-xs transition-colors"
                >
                  Choose Different Level
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. SHOP MODAL */}
        {showShopModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-sm game-modal-3d border-2 border-amber-400/80 rounded-[36px] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <h3 className="font-black text-white text-base">Booster Supplies</h3>
                </div>
                <button
                  onClick={() => setShowShopModal(false)}
                  className="w-8 h-8 rounded-xl game-btn game-btn-dark text-slate-400 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 mb-4">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-white">Hint Booster</div>
                    <div className="text-[10px] text-slate-400">Highlights optimal move</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 70) {
                        sounds.playBooster();
                        controller.addCoins(-70);
                        gameState.availableBoosters.hint++;
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl game-btn game-btn-amber text-slate-950 font-black text-xs"
                  >
                    70 🪙
                  </button>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-white">Shuffle Directions</div>
                    <div className="text-[10px] text-slate-400">Rotates locked vehicles</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 80) {
                        sounds.playBooster();
                        controller.addCoins(-80);
                        gameState.availableBoosters.shuffle++;
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl game-btn game-btn-amber text-slate-950 font-black text-xs"
                  >
                    80 🪙
                  </button>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-white">Queue Magnet</div>
                    <div className="text-[10px] text-slate-400">Sorts passenger line</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 90) {
                        sounds.playBooster();
                        controller.addCoins(-90);
                        gameState.availableBoosters.passengerSwap++;
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl game-btn game-btn-amber text-slate-950 font-black text-xs"
                  >
                    90 🪙
                  </button>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-white">+30s Extra Time</div>
                    <div className="text-[10px] text-slate-400">Adds 30s to level countdown</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 80) {
                        sounds.playBooster();
                        controller.buyExtraTime(30, 80);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl game-btn game-btn-amber text-slate-950 font-black text-xs"
                  >
                    80 🪙
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playWin();
                  controller.addCoins(500);
                }}
                className="w-full py-3 rounded-2xl game-btn game-btn-emerald shine-sweep text-white text-xs font-black flex items-center justify-center gap-2"
              >
                <Gift className="w-4 h-4 text-white" />
                <span>Claim +500 Free Bonus Coins</span>
              </button>
            </div>
          </div>
        )}

        {/* 4.5. HOW TO PLAY & FAQ GUIDE MODAL */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
            <div className="w-full max-w-lg game-modal-3d border-2 border-sky-400/80 rounded-[36px] p-5 sm:p-6 shadow-2xl text-left my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-900/90 pb-2 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Bus Game 3D Guide & FAQ</h3>
                    <p className="text-[10px] text-sky-300 font-bold">Smart Bus Jam & Color Match Rules</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-8 h-8 rounded-xl game-btn game-btn-dark text-slate-400 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* HOW TO PLAY SECTION */}
              <div className="space-y-2.5 mb-5 text-xs text-slate-300">
                <h4 className="font-black text-amber-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>🚗</span> How to Play This Bus Game
                </h4>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start gap-3">
                  <span className="text-xl shrink-0">🚦</span>
                  <div>
                    <h5 className="font-black text-white mb-0.5">1. Tap to Move Vehicles</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tap any unblocked vehicle to dispatch it along its direction arrows to the waiting docks. Organize the bus traffic carefully!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start gap-3">
                  <span className="text-xl shrink-0">👥</span>
                  <div>
                    <h5 className="font-black text-white mb-0.5">2. Match Passengers by Color</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Color stickmen queue up at the terminal. They only board buses with matching colors (Red, Blue, Green, Yellow, Purple). Efficient seat sorting is key!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start gap-3">
                  <span className="text-xl shrink-0">🅿️</span>
                  <div>
                    <h5 className="font-black text-white mb-0.5">3. Avoid Traffic Jam Gridlock</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      You have 5 active waiting docks (unlock up to 6). If all bays are full with buses that don't match the front waiting passenger, you get gridlocked!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start gap-3">
                  <span className="text-xl shrink-0">🔧</span>
                  <div>
                    <h5 className="font-black text-white mb-0.5">4. Helpful Boosters</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Stuck in a jam? Use <strong>Shuffle</strong> to rearrange passengers, <strong>Magnet</strong> to auto-fill seats, or <strong>Helicopter Rescue</strong> to lift blocked buses out!
                    </p>
                  </div>
                </div>
              </div>

              {/* WHY YOU'LL LOVE THIS LOGIC GAME */}
              <div className="mb-5 p-3.5 bg-gradient-to-br from-indigo-950/50 to-slate-950/80 border border-indigo-500/30 rounded-2xl">
                <h4 className="font-black text-indigo-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>🧠</span> Senior-Friendly & ASMR Relaxing Vibe
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-black text-white block mb-0.5">🥰 Senior-Friendly</span>
                    <span className="text-slate-400 text-[10px]">Big bold colors, tactile feedback, and accessible controls for all ages.</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-black text-white block mb-0.5">⚡ Offline Play</span>
                    <span className="text-slate-400 text-[10px]">No Wi-Fi needed! Solve traffic puzzles and train your brain anywhere.</span>
                  </div>
                </div>
              </div>

              {/* FAQ SECTION */}
              <div className="space-y-2 mb-5">
                <h4 className="font-black text-emerald-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>❓</span> Frequently Asked Questions (FAQ)
                </h4>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-left">
                  <div className="font-black text-white text-[11px] mb-0.5">Q: Is this a difficult sorting game?</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    A: It starts easy but gets tricky! As you progress, the Bus Jam levels become challenging brain teasers that test your logic and strategy skills.
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-left">
                  <div className="font-black text-white text-[11px] mb-0.5">Q: Can I play this Bus Game offline?</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    A: Yes! This is one of the best offline bus games. You can solve traffic puzzles and sort passengers without Wi-Fi or an active internet connection.
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-left">
                  <div className="font-black text-white text-[11px] mb-0.5">Q: Is this puzzle game suitable for seniors?</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    A: Absolutely! With big, bold colors and simple tap controls, it is a great brain training game for seniors that helps memory and logical thinking in a relaxing environment.
                  </div>
                </div>
              </div>

              {/* LEGAL LINKS */}
              <div className="pt-3 border-t border-slate-800/80 mb-4 flex items-center justify-center gap-4 text-[11px] font-bold text-slate-400">
                <a
                  href="https://busmadness.gurugame.ai/policy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 underline underline-offset-2 transition-colors"
                >
                  Privacy Policy
                </a>
                <span>•</span>
                <a
                  href="https://busmadness.gurugame.ai/termsofservice.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 underline underline-offset-2 transition-colors"
                >
                  Terms of Service
                </a>
              </div>

              <button
                onClick={() => {
                  sounds.playClick();
                  setShowHelpModal(false);
                }}
                className="w-full py-3.5 rounded-2xl game-btn game-btn-emerald shine-sweep text-white text-xs font-black flex items-center justify-center gap-2"
              >
                <span>GOT IT! START THE PUZZLE</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. DAILY REWARDS MODAL */}
        <DailyRewardModal
          isOpen={showDailyModal}
          onClose={() => setShowDailyModal(false)}
          streakDay={dailyStreak}
          lastClaimedTimestamp={lastClaimedDaily}
          onClaim={handleClaimDaily}
          onResetCooldownForTesting={() => {
            setLastClaimedDaily(0);
            try {
              localStorage.removeItem('bus_game_daily_last_claimed');
            } catch {
              // Ignore
            }
          }}
        />
      </main>

      {/* FOOTER WITH LEGAL LINKS & GAME COPY */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950/90 py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-400 text-[11px]">
            <span>🚌 Bus Game 3D: Color Jam & Traffic Puzzle</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-slate-500 hidden sm:inline">Clear the Bus Jam & Sort Passengers</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <a
              href="https://busmadness.gurugame.ai/policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-sky-400 transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-slate-700">•</span>
            <a
              href="https://busmadness.gurugame.ai/termsofservice.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-sky-400 transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
