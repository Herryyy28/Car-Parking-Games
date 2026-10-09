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
  Pause,
  Target,
  Check,
  Palette,
  Wrench,
  Crown,
} from 'lucide-react';
import { BusMadnessArena } from './components/BusMadnessArena.tsx';
import { Hero3DShowcase } from './components/Hero3DShowcase.tsx';
import { Home3DDepotScene } from './components/Home3DDepotScene.tsx';
import { World3DAdventureMap } from './components/World3DAdventureMap.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { BusGarageModal } from './components/BusGarageModal.tsx';
import { DailyRewardModal, DailyRewardDay } from './components/DailyRewardModal.tsx';
import { GameGuideModal } from './components/GameGuideModal.tsx';
import { GameController } from './logic/gameController.ts';
import {
  GameState,
  GameStatus,
  COLOR_MAP,
  Difficulty,
  DIFFICULTY_CONFIGS,
  GameMode,
  GAME_MODE_CONFIGS,
} from './logic/types.ts';
import { LevelRepository } from './logic/levelRepository.ts';
import { PlayerProgress, GraphicsQuality } from './logic/playerProgress.ts';
import { PuzzleSolver } from './logic/puzzleSolver.ts';
import { sounds } from './utils/soundEffects.ts';
import { WORLD_THEMES, getWorldConfig, getWorldIdForLevel } from './logic/worldThemes.ts';

type ScreenMode = 'HOME' | 'LEVEL_SELECT' | 'GAME';

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('HOME');
  const [progress, setProgress] = useState(() => PlayerProgress.get());
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(
    () => progress.preferredGameMode || GameMode.CLASSIC
  );
  const [controller] = useState<GameController>(
    () =>
      new GameController(
        1,
        progress.preferredDifficulty || Difficulty.HARD,
        progress.preferredGameMode || GameMode.CLASSIC
      )
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
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(() => PlayerProgress.getGraphicsQuality());

  // Modals
  const [showGarageModal, setShowGarageModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGridlockModal, setShowGridlockModal] = useState(false);
  const [showOutOfMovesModal, setShowOutOfMovesModal] = useState(false);
  const [showOutOfTimeModal, setShowOutOfTimeModal] = useState(false);
  const [victoryData, setVictoryData] = useState<{ stars: number; rewardCoins: number } | null>(null);
  const [levelIntro, setLevelIntro] = useState<{
    id: number;
    name: string;
    world: number;
    timeLimit: number;
    parMoves: number;
    objective: string;
  } | null>(null);

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
      if (
        screen !== 'GAME' ||
        showPauseModal ||
        showGridlockModal ||
        showOutOfMovesModal ||
        showOutOfTimeModal ||
        showDailyModal ||
        showShopModal ||
        showHelpModal ||
        !!victoryData ||
        !!levelIntro
      ) return;

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
        controller.refreshCoinsFromStorage();
        setProgress({ ...PlayerProgress.get() });
        setVictoryData(victory);
      } else if (step.type === 'OUT_OF_MOVES') {
        sounds.playGameOver();
        setShowOutOfMovesModal(true);
      } else if (step.type === 'GRIDLOCKED') {
        sounds.playGameOver();
        setShowGridlockModal(true);
      }
    }, 420);

    return () => clearInterval(timer);
  }, [
    controller,
    screen,
    showPauseModal,
    showGridlockModal,
    showOutOfMovesModal,
    showOutOfTimeModal,
    showDailyModal,
    showShopModal,
    showHelpModal,
    victoryData,
    levelIntro,
    gameState.levelId,
    gameState.moves,
    gameState.parMoves,
  ]);

  // Level Countdown Timer Loop (Urgency countdown per level)
  useEffect(() => {
    if (screen !== 'GAME') return;

    // Pause timer while modals are active or level is concluded
    const isPaused =
      showPauseModal ||
      showDailyModal ||
      showShopModal ||
      showHelpModal ||
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
    showPauseModal,
    showDailyModal,
    showShopModal,
    showHelpModal,
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

  // Booster action handler with automatic coin fallback
  const handleUseBooster = (type: 'undo' | 'hint' | 'shuffle' | 'extraSpace' | 'passengerSwap') => {
    const costMap = {
      undo: 50,
      hint: 0,
      shuffle: 80,
      extraSpace: 150,
      passengerSwap: 90,
    };
    const cost = costMap[type];
    const available = gameState.availableBoosters[type] || 0;

    if (available <= 0 && cost > 0 && gameState.coins < cost) {
      sounds.playBlocked();
      setShowShopModal(true);
      return false;
    }

    const success = controller.useBooster(type);
    if (success) {
      if (type === 'hint') sounds.playClick();
      else sounds.playEscape();
      if (showGridlockModal) setShowGridlockModal(false);
    } else {
      sounds.playBlocked();
    }
    return success;
  };

  // Handle Player Tap on a Vehicle
  const handleVehicleTap = (vehicleId: string) => {
    const result = controller.requestVehicleMove(vehicleId);
    if (!result.success) {
      if (result.reason === 'ALL_BAYS_FULL') {
        if (PuzzleSolver.isGridlocked(controller.getState())) {
          sounds.playGameOver();
          setShowGridlockModal(true);
        } else {
          sounds.playBump();
        }
      }
    }
    return result;
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
    if (!isDailyReady) return;
    controller.addCoins(reward.coins);
    if (reward.bonus && (reward.bonus as any) in controller.getState().availableBoosters) {
      controller.addBooster(reward.bonus as any, 1);
    }

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
    setProgress({ ...PlayerProgress.get() });

    setTimeout(() => setShowDailyModal(false), 1200);
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    sounds.playClick();
    setSelectedDifficulty(diff);
    PlayerProgress.setPreferredDifficulty(diff);
    setProgress({ ...PlayerProgress.get() });
    controller.setDifficulty(diff);
  };

  const handleGameModeChange = (mode: GameMode) => {
    sounds.playClick();
    setSelectedGameMode(mode);
    PlayerProgress.setPreferredGameMode(mode);
    setProgress({ ...PlayerProgress.get() });
    controller.setGameMode(mode);
  };

  const handleLevelSelect = (levelId: number, diffOverride?: Difficulty, modeOverride?: GameMode) => {
    sounds.playClick();
    const diffToUse = diffOverride || selectedDifficulty;
    const modeToUse = modeOverride || selectedGameMode;
    controller.loadLevel(levelId, diffToUse, modeToUse);
    setVictoryData(null);
    setShowGridlockModal(false);
    setShowOutOfMovesModal(false);
    setShowOutOfTimeModal(false);
    setScreen('GAME');
  };

  const handleOpenLevelIntro = (lvl: {
    id: number;
    name: string;
    world?: number;
    timeLimit: number;
    parMoves: number;
    objective?: string;
  }) => {
    sounds.playClick();
    const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
    const modeConfig = GAME_MODE_CONFIGS[selectedGameMode];
    let time = lvl.timeLimit;
    let moves = lvl.parMoves;
    if (selectedGameMode === GameMode.RUSH_HOUR) time = Math.round(time * 0.7);
    else if (selectedGameMode === GameMode.PUZZLE_MASTER) {
      moves = Math.round(moves * 0.75);
      time = Math.round(time * 1.3);
    }

    setLevelIntro({
      id: lvl.id,
      name: lvl.name,
      world: lvl.world || getWorldIdForLevel(lvl.id),
      timeLimit: Math.max(25, Math.round(time * diffConfig.timeMultiplier)),
      parMoves: Math.max(8, Math.round(moves * diffConfig.moveMultiplier)),
      objective: modeConfig.tagline || lvl.objective || 'CLEAR THE TRAFFIC & MATCH PASSENGERS',
    });
  };

  const allLevels = LevelRepository.getAllLevels();

  return (
    <div className="w-full h-full h-dvh fixed inset-0 overflow-hidden game-bg-pattern text-slate-100 flex flex-col font-['Fredoka',sans-serif] select-none touch-none">
      {/* Screen Router */}
      <main className="flex-1 w-full h-full flex flex-col overflow-hidden relative">
        {/* ========================================================
            SCREEN 1: IMMERSIVE 3D GAME HOME SCREEN
           ======================================================== */}
        {screen === 'HOME' && (
          <div className="relative w-full h-full flex-1 overflow-hidden select-none">
            {/* 1. Full-Viewport 3D Interactive Bus Depot & Miniature City World */}
            <div className="absolute inset-0 w-full h-full z-0">
              <Home3DDepotScene />
            </div>

            {/* Subtle Gradient Overlays for High-Contrast Game UI Text */}
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent pointer-events-none z-10" />

            {/* 2. Floating Game HUD Overlays */}
            <div className="relative z-20 w-full h-full flex flex-col justify-between p-3 sm:p-5 pointer-events-none">
              {/* Top Navigation & Economy Bar */}
              <div className="w-full flex items-center justify-between gap-2 max-w-4xl mx-auto">
                {/* World & Level Progression Pill */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setScreen('LEVEL_SELECT');
                  }}
                  className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-lg active:scale-95 transition-transform"
                  title="Explore World Map"
                >
                  <span className="text-base">
                    {getWorldConfig(gameState.worldId || getWorldIdForLevel(gameState.levelId)).icon}
                  </span>
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-black tracking-wider text-sky-400 block leading-tight">
                      {getWorldConfig(gameState.worldId || getWorldIdForLevel(gameState.levelId)).name}
                    </span>
                    <span className="text-xs font-black text-white leading-tight">
                      Level {progress.unlockedLevel} / {allLevels.length}
                    </span>
                  </div>
                </button>

                {/* Stars Counter */}
                <div className="hidden xs:flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-lg">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
                  <span className="text-xs font-black text-amber-300">
                    {Object.values(progress.stars).reduce((a, b) => a + b, 0)}
                  </span>
                </div>

                {/* Right Actions: Daily Gift + Coin Stash + Settings */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Daily Gift Button */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowDailyModal(true);
                    }}
                    className={`pointer-events-auto relative flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black transition-all game-btn shadow-lg ${
                      isDailyReady
                        ? 'game-btn-amber animate-pulse'
                        : 'game-btn-dark text-amber-300'
                    }`}
                    title="Daily Mystery Reward"
                  >
                    <Gift className={`w-4 h-4 ${isDailyReady ? 'text-slate-950 animate-bounce' : 'text-amber-400'}`} />
                    <span className="hidden sm:inline">Daily</span>
                    {isDailyReady && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-ping" />
                    )}
                  </button>

                  {/* Coin Counter Pill */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowShopModal(true);
                    }}
                    className="pointer-events-auto flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 px-3 py-1.5 rounded-2xl text-xs font-black text-amber-300 active:scale-95 transition-all shadow-lg group"
                    title="Coin Vault"
                  >
                    <span>🪙</span>
                    <span className="font-mono font-black">{gameState.coins.toLocaleString()}</span>
                    <span className="text-amber-400 text-[10px] bg-amber-400/30 px-1.5 py-0.5 rounded-md font-black">+</span>
                  </button>

                  {/* Settings Modal Button */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowSettingsModal(true);
                    }}
                    className="pointer-events-auto w-9 h-9 rounded-2xl game-btn game-btn-dark flex items-center justify-center text-slate-300 hover:text-white shadow-lg active:scale-95"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>

              {/* Center Game Title Banner */}
              <div className="w-full flex flex-col items-center text-center my-auto pointer-events-none">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/70 border border-slate-700/80 shadow-md backdrop-blur-sm mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">
                    3D TRAFFIC & COLOR PUZZLE
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter">
                  BUS GAME 3D
                </h1>
                <p className="text-xs font-black text-sky-300 tracking-wider mt-1 drop-shadow-md">
                  COLOR JAM & PASSENGER SORT
                </p>
              </div>

              {/* Bottom Casual Action Deck */}
              <div className="w-full max-w-md mx-auto space-y-2.5 pb-2">
                {/* PRIMARY PLAY / CONTINUE BUTTON */}
                <button
                  onClick={() => {
                    const currentLvl = LevelRepository.getLevel(gameState.levelId);
                    handleOpenLevelIntro(currentLvl);
                  }}
                  className="pointer-events-auto w-full py-4 rounded-2xl game-btn game-btn-emerald shine-sweep text-white font-black text-lg flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform border-2 border-emerald-300/40"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-6 h-6 fill-white" />
                    <span>PLAY LEVEL {gameState.levelId}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-100 opacity-90 mt-0.5">
                    {LevelRepository.getLevel(gameState.levelId).name} • Par {LevelRepository.getLevel(gameState.levelId).parMoves} Moves
                  </span>
                </button>

                {/* Secondary Feature Navigation Row */}
                <div className="grid grid-cols-4 gap-2">
                  {/* World Map */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setScreen('LEVEL_SELECT');
                    }}
                    className="pointer-events-auto py-2.5 px-1.5 rounded-2xl game-btn game-btn-blue text-white font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow-md"
                    title="World Map"
                  >
                    <Grid className="w-4 h-4" />
                    <span className="truncate">World Map</span>
                  </button>

                  {/* 3D Bus Garage */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowGarageModal(true);
                    }}
                    className="pointer-events-auto py-2.5 px-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 border border-yellow-200/50 group"
                    title="Garage & Mod Shop"
                  >
                    <Palette className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
                    <span className="truncate">Garage</span>
                  </button>

                  {/* Game Mode */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      const modes = Object.values(GameMode);
                      const nextMode = modes[(modes.indexOf(selectedGameMode) + 1) % modes.length];
                      handleGameModeChange(nextMode);
                    }}
                    className="pointer-events-auto py-2.5 px-1.5 rounded-2xl game-btn game-btn-dark text-amber-300 font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow-md"
                    title={`Current Mode: ${GAME_MODE_CONFIGS[selectedGameMode].name} (Tap to Switch)`}
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="truncate">{GAME_MODE_CONFIGS[selectedGameMode].name}</span>
                  </button>

                  {/* How to Play Guide */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowHelpModal(true);
                    }}
                    className="pointer-events-auto py-2.5 px-1.5 rounded-2xl game-btn game-btn-dark text-slate-200 font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow-md"
                    title="How to Play"
                  >
                    <HelpCircle className="w-4 h-4 text-sky-400" />
                    <span className="truncate">Guide</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 2: LEVEL SELECT
           ======================================================== */}
        {screen === 'LEVEL_SELECT' && (
          <World3DAdventureMap
            currentLevelId={gameState.levelId}
            unlockedLevelId={progress.unlockedLevel}
            progressStars={progress.stars}
            coins={gameState.coins}
            selectedDifficulty={selectedDifficulty}
            selectedGameMode={selectedGameMode}
            onSelectLevel={(levelId, diffOverride, modeOverride) => {
              handleLevelSelect(levelId, diffOverride, modeOverride);
            }}
            onBackToHome={() => {
              sounds.playClick();
              setScreen('HOME');
            }}
            initialWorldId={selectedWorldTab}
          />
        )}

        {/* ========================================================
            SCREEN 3: MAIN 3D BOARD GAME SCREEN
           ======================================================== */}
        {screen === 'GAME' && (
          <div className="w-full h-full flex-1 flex flex-col bg-slate-950 overflow-hidden relative select-none">
            {/* FLOATING TOP ARCADE HUD (MATCHING REFERENCE SCREENSHOTS & YOUTUBE SHORT) */}
            <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none pt-[max(env(safe-area-inset-top),10px)] px-3 sm:px-4 flex items-center justify-between select-none">
              {/* Left: Square Blue Squircle Pause Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowPauseModal(true);
                }}
                className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 border-2 border-white/80 shadow-2xl flex items-center justify-center text-white active:scale-95 transition-transform hover:brightness-110 drop-shadow-md"
                title="Pause Game"
              >
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-4.5 bg-white rounded-full shadow-xs" />
                  <div className="w-1.5 h-4.5 bg-white rounded-full shadow-xs" />
                </div>
              </button>

              {/* Center: Bold Clean White LEVEL Title + Subtle Status */}
              <div className="flex flex-col items-center pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-wider font-sans leading-none">
                  LEVEL {gameState.levelId}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border shadow-xs transition-colors ${
                      gameState.timeLeft <= 10
                        ? 'bg-rose-600/90 text-white border-rose-300 animate-pulse'
                        : 'bg-black/55 text-slate-200 border-white/10'
                    }`}
                  >
                    ⏱️ {formatCountdown(gameState.timeLeft)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/55 text-slate-200 border border-white/10 shadow-xs">
                    🎯 {gameState.moves} Moves
                  </span>
                </div>
              </div>

              {/* Right: Blue Rounded Pill with Percentage and Protruding 3D Star */}
              {(() => {
                const totalP = gameState.passengers.length;
                const loadedP = gameState.passengers.filter((p) => p.state === 'LOADED').length;
                const progressPct = totalP > 0 ? Math.round((loadedP / totalP) * 100) : 0;
                return (
                  <div className="pointer-events-auto relative flex items-center pr-3">
                    <div className="h-9 sm:h-10 pl-3.5 pr-5.5 rounded-full bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 border-2 border-white/80 shadow-2xl flex items-center justify-center drop-shadow-md">
                      <span className="text-xs sm:text-sm font-black text-white tracking-wide font-sans drop-shadow-xs">
                        {progressPct}%
                      </span>
                    </div>
                    {/* 3D Gold Star Badge Protruding on Right */}
                    <div className="absolute right-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-yellow-100 border-2 border-white flex items-center justify-center shadow-lg text-base sm:text-lg animate-pulse select-none">
                      ⭐
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3D FULL-SCREEN GAME ARENA */}
            <div ref={arenaContainerRef} className="absolute inset-0 w-full h-full overflow-hidden">
              <BusMadnessArena
                gameState={gameState}
                onVehicleTapRequest={handleVehicleTap}
                onVehicleArrivedAtDock={handleVehicleArrived}
                onDockUnlockClicked={() => controller.useBooster('extraSpace')}
                activeHintId={gameState.activeHintVehicleId}
                isCompleted={!!victoryData || gameState.status === GameStatus.COMPLETED}
                onParkingEvaluated={handleParkingEvaluated}
                graphicsQuality={graphicsQuality}
              />
            </div>

            {/* FLOATING BOTTOM TACTILE BOOSTERS DECK */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 shadow-2xl">
              {/* Hint Booster */}
              <button
                onClick={() => handleUseBooster('hint')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs active:scale-95 transition-transform shadow-md"
                title="Hint: highlights best vehicle move"
              >
                <Lightbulb className="w-3.5 h-3.5 fill-slate-950" />
                <span className="hidden xs:inline">HINT</span>
                <span className="text-[10px] bg-slate-950/30 px-1 rounded font-bold">
                  {gameState.availableBoosters.hint > 0 ? gameState.availableBoosters.hint : 'FREE'}
                </span>
              </button>

              {/* Shuffle Booster */}
              <button
                onClick={() => handleUseBooster('shuffle')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-black text-xs active:scale-95 transition-transform shadow-md"
                title="Shuffle: reverses blocked vehicles to open opposite escape routes"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">SHUFFLE</span>
                <span className="text-[10px] bg-black/30 px-1 rounded font-bold">
                  {gameState.availableBoosters.shuffle > 0 ? gameState.availableBoosters.shuffle : '80🪙'}
                </span>
              </button>

              {/* Passenger Swap / Magnet Booster */}
              <button
                onClick={() => handleUseBooster('passengerSwap')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-xs active:scale-95 transition-transform shadow-md"
                title="Magnet: sorts passengers to match docked buses"
              >
                <Magnet className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">MAGNET</span>
                <span className="text-[10px] bg-black/30 px-1 rounded font-bold">
                  {gameState.availableBoosters.passengerSwap > 0 ? gameState.availableBoosters.passengerSwap : '90🪙'}
                </span>
              </button>

              {/* Undo Booster */}
              <button
                onClick={() => handleUseBooster('undo')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 text-white font-black text-xs active:scale-95 transition-transform shadow-md"
                title="Undo last vehicle move"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">UNDO</span>
                <span className="text-[10px] bg-black/30 px-1 rounded font-bold">
                  {gameState.availableBoosters.undo > 0 ? gameState.availableBoosters.undo : '50🪙'}
                </span>
              </button>

              {/* +Bay Extra Space Booster (if unlocked < 7) */}
              {gameState.unlockedDocksCount < 7 && (
                <button
                  onClick={() => handleUseBooster('extraSpace')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xs active:scale-95 transition-transform shadow-md"
                  title="Unlock Parking Bay"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+BAY ({gameState.unlockedDocksCount}/7)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            MODALS: LEVEL INTRO, PAUSE, VICTORY, GRIDLOCK, OUT OF MOVES, SHOP, DAILY
           ======================================================== */}

        {/* 00. LEVEL INTRO PRE-FLIGHT MODAL */}
        {levelIntro && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm game-modal-3d border-2 border-emerald-400/80 rounded-[36px] p-6 text-center shadow-2xl relative overflow-hidden">
              {/* World District & Game Mode Pills */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-black uppercase tracking-wider">
                  <span>{getWorldConfig(levelIntro.world).icon}</span>
                  <span>{getWorldConfig(levelIntro.world).name}</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <span>{GAME_MODE_CONFIGS[selectedGameMode].icon}</span>
                  <span>{GAME_MODE_CONFIGS[selectedGameMode].name}</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-0.5">
                Level {levelIntro.id}
              </h2>
              <p className="text-xs text-slate-300 font-bold mb-4">
                {levelIntro.name}
              </p>

              {/* Mission Objective Card */}
              <div className="bg-amber-500/15 border border-amber-400/30 rounded-2xl p-3 mb-4 text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block mb-0.5">
                  Target Objective
                </span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {levelIntro.objective}
                </span>
              </div>

              {/* Mission Stats */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-5 flex items-center justify-around shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Time</span>
                  <span className="text-sm font-black text-sky-400">⏱️ {levelIntro.timeLimit}s</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Moves Par</span>
                  <span className="text-sm font-black text-emerald-400">🎯 {levelIntro.parMoves}</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Reward</span>
                  <span className="text-sm font-black text-amber-400">🪙 +50</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    handleLevelSelect(levelIntro.id, selectedDifficulty, selectedGameMode);
                    setLevelIntro(null);
                  }}
                  className="w-full py-4 rounded-2xl game-btn game-btn-emerald shine-sweep text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>START PUZZLE</span>
                </button>

                <button
                  onClick={() => setLevelIntro(null)}
                  className="w-full py-2.5 rounded-2xl bg-transparent hover:bg-slate-800 text-slate-400 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 0. PAUSE MODAL */}
        {showPauseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm game-modal-3d border-2 border-sky-400/80 rounded-[36px] p-6 text-center shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-sky-500/20 border-2 border-sky-400/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/20">
                <Pause className="w-8 h-8 text-sky-400 fill-sky-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-0.5">GAME PAUSED</h2>
              <p className="text-xs text-sky-200 font-bold mb-4">
                Level {gameState.levelId}: {gameState.levelName}
              </p>

              {/* Level Quick Stats */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-5 flex items-center justify-around shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Waiting</span>
                  <span className="text-sm font-black text-rose-400">
                    {gameState.passengers.filter((p) => p.state === 'WAITING').length} Left
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Moves</span>
                  <span className="text-sm font-black text-yellow-400">{gameState.moves}</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Time</span>
                  <span className="text-sm font-black text-sky-400 font-mono">{formatCountdown(gameState.timeLeft)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Resume Button */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowPauseModal(false);
                  }}
                  className="w-full py-3.5 rounded-2xl game-btn game-btn-emerald shine-sweep text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>RESUME GAME</span>
                </button>

                {/* Restart Level */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    controller.loadLevel(gameState.levelId);
                    setShowPauseModal(false);
                  }}
                  className="w-full py-3 rounded-2xl game-btn game-btn-blue text-white font-black text-xs flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>RESTART LEVEL</span>
                </button>

                {/* Sound Toggle */}
                <button
                  onClick={() => {
                    setSoundOn(!soundOn);
                    sounds.playClick();
                  }}
                  className="w-full py-3 rounded-2xl game-btn game-btn-amber text-slate-950 font-black text-xs flex items-center justify-center gap-2"
                >
                  {soundOn ? <Volume2 className="w-4 h-4 text-slate-950" /> : <VolumeX className="w-4 h-4 text-slate-950" />}
                  <span>SOUND: {soundOn ? 'ON' : 'OFF'}</span>
                </button>

                {/* Global Graphics Quality Setting */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-inner text-left">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Graphics Quality
                    </span>
                    <span className="text-[10px] font-semibold text-sky-400">
                      {graphicsQuality === 'HIGH' ? 'High Fidelity' : '60 FPS Mode'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setGraphicsQuality('HIGH');
                        PlayerProgress.setGraphicsQuality('HIGH');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
                        graphicsQuality === 'HIGH'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span>High (with shadows)</span>
                      <span className="text-[9px] font-normal text-slate-400">Crisp 3D Shadows</span>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playClick();
                        setGraphicsQuality('PERFORMANCE');
                        PlayerProgress.setGraphicsQuality('PERFORMANCE');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
                        graphicsQuality === 'PERFORMANCE'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span>Performance (no shadows)</span>
                      <span className="text-[9px] font-normal text-slate-400">Optimized Performance</span>
                    </button>
                  </div>
                </div>

                {/* Select Level */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowPauseModal(false);
                    setScreen('LEVEL_SELECT');
                  }}
                  className="w-full py-2.5 rounded-2xl game-btn game-btn-dark text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Grid className="w-4 h-4 text-sky-400" />
                  <span>SELECT LEVEL</span>
                </button>

                {/* Bus Garage & Mod Shop */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowGarageModal(true);
                  }}
                  className="w-full py-2.5 rounded-2xl game-btn game-btn-dark text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-amber-400/30"
                >
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>BUS GARAGE & MOD SHOP</span>
                </button>

                {/* How to Play & FAQ */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowHelpModal(true);
                  }}
                  className="w-full py-2.5 rounded-2xl game-btn game-btn-dark text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-amber-400/30"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>HOW TO PLAY & FAQ</span>
                </button>

                {/* Main Menu */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowPauseModal(false);
                    setScreen('HOME');
                  }}
                  className="w-full py-2 rounded-2xl bg-transparent hover:bg-slate-800 text-slate-400 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Main Menu</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
                <div className="h-8 w-px bg-slate-800"></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Mode</span>
                  <span className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
                    <span>{GAME_MODE_CONFIGS[gameState.gameMode || selectedGameMode].icon}</span>
                    <span className="truncate max-w-[80px]">{GAME_MODE_CONFIGS[gameState.gameMode || selectedGameMode].name}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    const nextId = gameState.levelId + 1;
                    handleLevelSelect(nextId, selectedDifficulty, selectedGameMode);
                  }}
                  className="w-full py-4 rounded-2xl game-btn game-btn-emerald shine-sweep text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>NEXT PUZZLE (LEVEL {gameState.levelId + 1})</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm game-modal-3d border-2 border-rose-500/80 rounded-[36px] p-6 text-center shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/30 animate-pulse">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">BAYS ARE JAMMED!</h2>
              <p className="text-xs text-slate-300 mb-4">
                All waiting bays are occupied, and none match the color of the front passenger in line.
              </p>

              <div className="flex flex-col gap-2.5">
                {/* 1. Magnet Booster */}
                <button
                  onClick={() => handleUseBooster('passengerSwap')}
                  className="w-full py-3.5 px-4 rounded-2xl game-btn game-btn-blue text-white font-black text-xs flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <Magnet className="w-4 h-4" />
                    <span>Use Magnet (Sorts Line)</span>
                  </div>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-black">
                    {gameState.availableBoosters.passengerSwap > 0
                      ? `${gameState.availableBoosters.passengerSwap} Left`
                      : '90 🪙'}
                  </span>
                </button>

                {/* 2. Extra Bay Booster */}
                {gameState.unlockedDocksCount < 6 && (
                  <button
                    onClick={() => handleUseBooster('extraSpace')}
                    className="w-full py-3 px-4 rounded-2xl game-btn game-btn-emerald text-white font-black text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      <span>Unlock 1 Extra Bay</span>
                    </div>
                    <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-black">
                      {gameState.availableBoosters.extraSpace > 0
                        ? `${gameState.availableBoosters.extraSpace} Left`
                        : '150 🪙'}
                    </span>
                  </button>
                )}

                {/* 3. Undo Booster */}
                <button
                  onClick={() => handleUseBooster('undo')}
                  className="w-full py-3 px-4 rounded-2xl game-btn game-btn-amber text-slate-950 font-black text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Undo2 className="w-4 h-4" />
                    <span>Undo Last Move</span>
                  </div>
                  <span className="text-[10px] bg-black/40 text-amber-300 px-2 py-0.5 rounded-full font-black">
                    {gameState.availableBoosters.undo > 0
                      ? `${gameState.availableBoosters.undo} Left`
                      : '50 🪙'}
                  </span>
                </button>

                {/* 4. Restart Level */}
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
        <GameGuideModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          onPlayNow={() => {
            setShowHelpModal(false);
            setShowPauseModal(false);
            setScreen('GAME');
          }}
        />

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

        {/* 6. BUS GARAGE & 3D MOD SHOP SHOWROOM MODAL */}
        <BusGarageModal
          isOpen={showGarageModal}
          onClose={() => {
            setShowGarageModal(false);
            setProgress({ ...PlayerProgress.get() });
            controller.refreshCoinsFromStorage();
          }}
          onCustomizationChanged={() => {
            setProgress({ ...PlayerProgress.get() });
            controller.refreshCoinsFromStorage();
          }}
        />

        {/* 7. GAME SETTINGS MODAL */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          soundOn={soundOn}
          onToggleSound={() => setSoundOn(!soundOn)}
          graphicsQuality={graphicsQuality}
          onChangeGraphicsQuality={(q) => {
            setGraphicsQuality(q);
            PlayerProgress.setGraphicsQuality(q);
            setProgress({ ...PlayerProgress.get() });
          }}
          selectedDifficulty={selectedDifficulty}
          onChangeDifficulty={handleDifficultyChange}
          onOpenHowToPlay={() => {
            setShowSettingsModal(false);
            setShowHelpModal(true);
          }}
        />
      </main>

      {/* FOOTER WITH LEGAL LINKS & GAME COPY (Only shown on Level Select) */}
      {screen === 'LEVEL_SELECT' && (
        <footer className="w-full border-t border-slate-800/60 bg-slate-950/90 py-2.5 px-4 text-center text-xs text-slate-500 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-400 text-[11px]">
              <span>🚌 Bus Game 3D: Color Jam & Traffic Puzzle</span>
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
      )}
    </div>
  );
}
