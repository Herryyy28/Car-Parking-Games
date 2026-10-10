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
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { EditProfileModal, AVATAR_OPTIONS } from './components/EditProfileModal.tsx';
import { JourneyView } from './components/JourneyView.tsx';
import { BusMadnessArena } from './components/BusMadnessArena.tsx';
import { ArenaErrorBoundary } from './components/ArenaErrorBoundary.tsx';
import { Hero3DShowcase } from './components/Hero3DShowcase.tsx';
import { Home3DDepotScene } from './components/Home3DDepotScene.tsx';
import { World3DAdventureMap } from './components/World3DAdventureMap.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { VictoryModal } from './components/VictoryModal.tsx';
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

type ScreenMode = 'LOADING' | 'HOME' | 'LEVEL_SELECT' | 'GAME';

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('LOADING');
  const [activeTab, setActiveTab] = useState<'SHOP' | 'LEADERBOARD' | 'HOME' | 'JOURNEY' | 'SETTINGS'>('HOME');
  const [progress, setProgress] = useState(() => PlayerProgress.get());
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(
    () => progress.preferredGameMode || GameMode.CLASSIC
  );
  const [controller] = useState<GameController>(
    () =>
      new GameController(
        progress.currentLevel || 3,
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
  const [musicOn, setMusicOn] = useState(false);
  const [colorBlindOn, setColorBlindOn] = useState(false);
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('bus_game_player_name') || 'Player_ARLEQ';
  });
  const [playerAvatarId, setPlayerAvatarId] = useState(() => {
    return localStorage.getItem('bus_game_player_avatar') || 'duck';
  });
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleSaveProfile = (name: string, avatarId: string) => {
    setPlayerName(name);
    setPlayerAvatarId(avatarId);
    localStorage.setItem('bus_game_player_name', name);
    localStorage.setItem('bus_game_player_avatar', avatarId);
    sounds.playClick();
  };

  const currentAvatarOption = AVATAR_OPTIONS.find((a) => a.id === playerAvatarId) || AVATAR_OPTIONS[0];
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
            SCREEN 0: SPLASH / LOADING SCREEN (MATCHING SCREENSHOT 1)
           ======================================================== */}
        {screen === 'LOADING' && (
          <LoadingScreen onComplete={() => setScreen('HOME')} />
        )}
        {/* ========================================================
            SCREEN 1: IMMERSIVE 3D GAME HOME SCREEN
           ======================================================== */}
        {screen === 'HOME' && (
          <div className="relative w-full h-full flex-1 overflow-hidden select-none">
            {/* 1. Full-Viewport 3D Interactive Bus Depot & Miniature City World */}
            <div className="absolute inset-0 w-full h-full z-0">
              <Home3DDepotScene />
            </div>

            {/* 2. Floating Game HUD Overlays */}
            <div className="relative z-20 w-full h-full flex flex-col pointer-events-none">
              
              {/* Main Content Area based on Tab */}
              {activeTab === 'HOME' && (
                <>
                  {/* Top Header: Avatar & Coin Pill (Matching frame_04.jpg) */}
                  <div className="absolute top-4 left-4 z-20 flex items-start pointer-events-none select-none">
                    {/* Left: Avatar with connected Coin Pill */}
                    <div className="pointer-events-auto flex items-center">
                      {/* Avatar Square (Click to Edit Profile - frame_04.jpg) */}
                      <div 
                        onClick={() => {
                          sounds.playClick();
                          setShowProfileModal(true);
                        }}
                        className="w-14 h-14 rounded-2xl border-[3.5px] border-[#93C5FD] bg-gradient-to-b from-[#D946EF] to-[#9333EA] shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center justify-center p-1 relative cursor-pointer active:scale-95 transition-transform z-10"
                        title="Edit Profile"
                      >
                        <div className="absolute inset-0.5 rounded-[12px] border border-white/35 pointer-events-none" />
                        <span className="text-3xl filter drop-shadow select-none">
                          {currentAvatarOption.emoji || '🦆'}
                        </span>
                      </div>

                      {/* Connected Coin Pill (frame_04.jpg) */}
                      <div className="flex items-center bg-[#FFFDF0] border-[3px] border-[#B45309] rounded-full h-10 shadow-[0_4px_10px_rgba(0,0,0,0.25)] -ml-2.5 z-0 pl-1 pr-3.5">
                        {/* 3D Gold Coin with embossed 'G' and green '+' badge */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#FDE047] via-[#F59E0B] to-[#D97706] border-2 border-[#FEF08A] flex items-center justify-center shadow-sm relative -ml-1.5 z-10">
                          <span className="text-[#78350F] font-black text-sm tracking-tighter">G</span>
                          {/* Connected Green Plus Button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              sounds.playClick();
                              setActiveTab('SHOP');
                            }}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#22C55E] border-2 border-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                            title="Buy Coins"
                          >
                            <span className="text-white text-xs font-black leading-none pb-0.5">+</span>
                          </button>
                        </div>
                        {/* Coin Amount */}
                        <span className="text-[#451A03] font-black ml-2.5 text-lg tracking-wide font-sans">
                          {gameState.coins}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Play Button (Matching frame_04.jpg: "Level 3") */}
                  <div className="absolute bottom-[98px] left-0 right-0 z-20 flex justify-center pointer-events-none select-none">
                    <button
                      onClick={() => {
                        sounds.playClick();
                        handleLevelSelect(gameState.levelId, selectedDifficulty, selectedGameMode);
                      }}
                      className="pointer-events-auto cursor-pointer relative overflow-hidden bg-gradient-to-b from-[#84CC16] via-[#65A30D] to-[#4D7C0F] border-[4.5px] border-[#FFFDF0] rounded-[26px] px-14 py-3 shadow-[0_6px_0_#14532D,0_12px_22px_rgba(0,0,0,0.4)] active:translate-y-1.5 active:shadow-[0_1px_0_#14532D] transition-all flex items-center justify-center min-w-[240px]"
                    >
                      {/* Top gloss highlight reflection */}
                      <div className="absolute top-0.5 inset-x-2 h-[45%] bg-gradient-to-b from-white/35 to-transparent rounded-t-[20px] pointer-events-none" />
                      <span 
                        className="text-[32px] sm:text-[35px] font-black text-white relative z-10 tracking-wide drop-shadow-[0_2px_3px_rgba(20,83,45,0.95)]" 
                      >
                        Level {gameState.levelId}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'SHOP' && (
                <div className="absolute inset-0 bg-[#1E3A8A] z-40 pointer-events-auto flex flex-col pt-4 px-4 pb-[105px] overflow-y-auto select-none">
                  {/* Top Header: Coin Counter & Golden 3D "Shop" Title */}
                  <div className="flex items-center justify-between mb-4 border-b-2 border-yellow-400 pb-2">
                    <div className="flex items-center bg-[#FFF1D0] border-[3px] border-[#B07B46] rounded-full px-2.5 py-1 h-8 shadow-md">
                      <div className="w-7 h-7 rounded-full bg-amber-400 border-2 border-yellow-200 flex items-center justify-center -ml-2.5 z-10 shadow-sm relative">
                        <span className="text-[#D97706] font-black text-[12px] absolute">C</span>
                      </div>
                      <span className="text-[#8B4513] font-black ml-1.5 pr-2 text-sm">{gameState.coins}</span>
                      <button className="w-5 h-5 rounded-full bg-[#84cc16] border-2 border-white flex items-center justify-center shadow-sm -mr-1.5">
                        <span className="text-white text-base font-black leading-none mb-0.5">+</span>
                      </button>
                    </div>

                    <h1 
                      className="text-3xl font-black text-[#FBBF24] drop-shadow-[0_2px_0_#B07B46] mr-4" 
                      style={{WebkitTextStroke: '1px #B07B46'}}
                    >
                      Shop
                    </h1>
                    <div className="w-16"></div>
                  </div>
                  
                  {/* 1. Remove Ads Banner Card */}
                  <div className="bg-[#3b82f6]/95 border-2 border-[#60a5fa] rounded-2xl p-4 mb-3.5 relative overflow-hidden shadow-lg flex items-center justify-between">
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      i
                    </div>
                    <div>
                      <div className="text-white font-black text-sm">Remove Banner</div>
                      <div className="text-white font-black text-sm mb-3">and Pop-up Ads</div>
                      <button 
                        onClick={() => sounds.playCoinCollect()}
                        className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-sm px-5 py-1.5 rounded-xl shadow-md active:translate-y-0.5"
                      >
                        ₹1,100.00
                      </button>
                    </div>
                    {/* Glowing Golden ADS Medallion */}
                    <div className="relative mr-2 flex items-center justify-center">
                      <div className="absolute w-24 h-24 bg-amber-400/20 rounded-full blur-lg animate-pulse" />
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-4 border-yellow-200 flex items-center justify-center shadow-xl rotate-12 relative">
                        <span className="text-amber-950 font-black text-2xl tracking-tighter">ADS</span>
                        <div className="absolute w-full h-1 bg-red-600 rotate-45 transform origin-center shadow" />
                      </div>
                    </div>
                  </div>

                  {/* 2. Swift Bundle Card */}
                  <div className="bg-[#FFF1D0] border-4 border-[#B07B46] rounded-2xl mb-3.5 overflow-hidden shadow-md">
                    <div className="p-3.5 flex justify-between items-center border-b-2 border-amber-200">
                      <div className="flex flex-col items-center">
                        <div className="text-3xl mb-0.5">🪙</div>
                        <div className="text-[#8B4513] font-black text-lg" style={{WebkitTextStroke: '0.5px white'}}>4 000</div>
                      </div>
                      <div className="bg-white/80 rounded-xl p-2 border-2 border-amber-200 flex gap-4">
                        <div className="flex flex-col items-center"><span className="text-2xl">🚙</span><span className="text-[#8B4513] font-black text-xs">x1</span></div>
                        <div className="flex flex-col items-center"><span className="text-2xl">🚁</span><span className="text-[#8B4513] font-black text-xs">x1</span></div>
                        <div className="flex flex-col items-center"><span className="text-2xl">🟢</span><span className="text-[#8B4513] font-black text-xs">x1</span></div>
                      </div>
                    </div>
                    <div className="bg-[#1D4ED8] px-4 py-2.5 flex justify-between items-center">
                      <div className="text-white font-black text-base">Swift Bundle</div>
                      <button 
                        onClick={() => sounds.playCoinCollect()}
                        className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-sm px-4 py-1.5 rounded-lg shadow-md active:translate-y-0.5"
                      >
                        ₹550.00
                      </button>
                    </div>
                  </div>
                  
                  {/* 3. Professional Bundle Card */}
                  <div className="bg-[#FFF1D0] border-4 border-[#B07B46] rounded-2xl mb-3.5 overflow-hidden shadow-md">
                    <div className="p-3.5 flex justify-between items-center border-b-2 border-amber-200">
                      <div className="flex flex-col items-center">
                        <div className="text-3xl mb-0.5">🪙</div>
                        <div className="text-[#8B4513] font-black text-lg" style={{WebkitTextStroke: '0.5px white'}}>8 000</div>
                      </div>
                      <div className="bg-white/80 rounded-xl p-2 border-2 border-amber-200 flex gap-4">
                        <div className="flex flex-col items-center"><span className="text-2xl">🚙</span><span className="text-[#8B4513] font-black text-xs">x2</span></div>
                        <div className="flex flex-col items-center"><span className="text-2xl">🚁</span><span className="text-[#8B4513] font-black text-xs">x2</span></div>
                        <div className="flex flex-col items-center"><span className="text-2xl">🟢</span><span className="text-[#8B4513] font-black text-xs">x2</span></div>
                      </div>
                    </div>
                    <div className="bg-[#1D4ED8] px-4 py-2.5 flex justify-between items-center">
                      <div className="text-white font-black text-base">Professional Bundle</div>
                      <button 
                        onClick={() => sounds.playCoinCollect()}
                        className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-sm px-4 py-1.5 rounded-lg shadow-md active:translate-y-0.5"
                      >
                        ₹950.00
                      </button>
                    </div>
                  </div>

                  {/* 4. Popular Master Bundle Card (with red ribbon) */}
                  <div className="bg-[#FFF1D0] border-4 border-[#B07B46] rounded-2xl mb-3.5 overflow-hidden shadow-md relative">
                    {/* Red Corner Ribbon */}
                    <div className="absolute top-0 left-0 bg-red-600 text-white font-black text-[10px] px-3 py-0.5 rounded-br-lg shadow-sm z-10 uppercase tracking-wider">
                      Popular
                    </div>
                    <div className="p-3.5 pt-5 flex justify-between items-center border-b-2 border-amber-200">
                      <div className="flex flex-col items-center">
                        <div className="text-3xl mb-0.5">🪙</div>
                        <div className="text-[#8B4513] font-black text-lg" style={{WebkitTextStroke: '0.5px white'}}>16 000</div>
                      </div>
                      <div className="bg-white/80 rounded-xl p-2 border-2 border-amber-200 flex gap-4">
                        <div className="flex flex-col items-center"><span className="text-2xl">🚙</span><span className="text-[#8B4513] font-black text-xs">x4</span></div>
                        <div className="flex flex-col items-center"><span className="text-2xl">🚁</span><span className="text-[#8B4513] font-black text-xs">x4</span></div>
                        <div className="flex flex-col items-center"><span className="text-2xl">🟢</span><span className="text-[#8B4513] font-black text-xs">x4</span></div>
                      </div>
                    </div>
                    <div className="bg-[#1D4ED8] px-4 py-2.5 flex justify-between items-center">
                      <div className="text-white font-black text-base">Master Bundle</div>
                      <button 
                        onClick={() => sounds.playCoinCollect()}
                        className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-sm px-4 py-1.5 rounded-lg shadow-md active:translate-y-0.5"
                      >
                        ₹1,800.00
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'LEADERBOARD' && (
                <div className="absolute inset-0 bg-[#1E3A8A] z-40 pointer-events-auto flex flex-col pt-4 px-4 pb-[105px] select-none">
                  {/* Top Header: Golden 3D "Leaderboard" Title */}
                  <div className="flex items-center justify-center mb-16 border-b-2 border-yellow-400 pb-3">
                    <h1 
                      className="text-3xl font-black text-[#FBBF24] drop-shadow-[0_2px_0_#B07B46]" 
                      style={{WebkitTextStroke: '1px #B07B46'}}
                    >
                      Leaderboard
                    </h1>
                  </div>

                  {/* Centered Locked State (Padlock & "Unlock after level 30") */}
                  <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                    <div className="w-16 h-20 bg-[#94A3B8] rounded-2xl mb-4 flex items-center justify-center shadow-xl relative border-2 border-slate-300">
                      {/* Arched Shackle */}
                      <div className="w-8 h-10 border-[5px] border-[#64748B] rounded-t-full absolute -top-5"></div>
                      {/* Keyhole */}
                      <div className="w-3 h-5 bg-[#334155] rounded-full"></div>
                    </div>
                    <div className="text-white font-bold text-lg tracking-wide drop-shadow">
                      Unlock after level 30
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'JOURNEY' && (
                <JourneyView
                  currentLevel={gameState.levelId}
                  unlockedLevel={progress.unlockedLevel}
                  onSelectLevel={(levelId) => {
                    const currentLvl = LevelRepository.getLevel(levelId);
                    handleOpenLevelIntro(currentLvl);
                  }}
                />
              )}

              {activeTab === 'SETTINGS' && (
                <div className="absolute inset-0 bg-[#172554] z-40 pointer-events-auto flex flex-col pt-4 pb-[105px] overflow-y-auto select-none">
                  {/* Top Header: Golden 3D "Settings" Title */}
                  <div className="flex items-center justify-center border-b-2 border-yellow-400 pb-3 bg-[#1E3A8A] w-full z-10 shadow-md">
                    <h1 
                      className="text-3xl font-black text-[#FBBF24] drop-shadow-[0_2px_0_#B07B46]" 
                      style={{ WebkitTextStroke: '1px #B07B46' }}
                    >
                      Settings
                    </h1>
                  </div>

                  {/* Main Settings Body */}
                  <div className="flex-1 flex flex-col">
                    {/* 1. Toggle Controls Group */}
                    <div className="bg-[#1e293b]/90 border-b border-slate-700">
                      {/* Row 1: Music */}
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎵</span>
                          <span className="text-white font-bold text-base">Music</span>
                        </div>
                        {/* iOS Toggle Switch */}
                        <button
                          onClick={() => {
                            setMusicOn(!musicOn);
                            sounds.playClick();
                          }}
                          className={`w-13 h-7 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                            musicOn ? 'bg-[#22c55e]' : 'bg-[#334155]'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                              musicOn ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Row 2: Sounds */}
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🔊</span>
                          <span className="text-white font-bold text-base">Sounds</span>
                        </div>
                        <button
                          onClick={() => {
                            setSoundOn(!soundOn);
                            sounds.playClick();
                          }}
                          className={`w-13 h-7 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                            soundOn ? 'bg-[#22c55e]' : 'bg-[#334155]'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                              soundOn ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Row 3: Vibration */}
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📳</span>
                          <span className="text-white font-bold text-base">Vibration</span>
                        </div>
                        <button
                          onClick={() => {
                            const next = !progress.vibrationEnabled;
                            PlayerProgress.setVibrationEnabled(next);
                            setProgress({ ...progress, vibrationEnabled: next });
                            if (next && navigator.vibrate) navigator.vibrate(50);
                            sounds.playClick();
                          }}
                          className={`w-13 h-7 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                            progress.vibrationEnabled ? 'bg-[#22c55e]' : 'bg-[#334155]'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                              progress.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Row 4: Color Blind */}
                      <div className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">👁️</span>
                          <span className="text-white font-bold text-base">Color Blind</span>
                        </div>
                        <button
                          onClick={() => {
                            setColorBlindOn(!colorBlindOn);
                            sounds.playClick();
                          }}
                          className={`w-13 h-7 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                            colorBlindOn ? 'bg-[#22c55e]' : 'bg-[#334155]'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                              colorBlindOn ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* 2. INFORMATION Section */}
                    <div className="pt-4">
                      <div className="px-5 pb-1.5 text-slate-400 font-black text-xs uppercase tracking-wider">
                        Information
                      </div>
                      <div 
                        onClick={() => setShowHelpModal(true)}
                        className="bg-[#1e293b]/90 border-y border-slate-700 px-5 py-3.5 flex items-center justify-between cursor-pointer active:bg-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">✉️</span>
                          <span className="text-white font-bold text-base">Contact Us</span>
                        </div>
                        <span className="text-slate-400 font-bold text-lg">&gt;</span>
                      </div>
                    </div>

                    {/* 3. SIGN IN Section */}
                    <div className="pt-4">
                      <div className="px-5 pb-1.5 text-slate-400 font-black text-xs uppercase tracking-wider">
                        Sign In
                      </div>
                      <div 
                        onClick={() => sounds.playClick()}
                        className="bg-[#1e293b]/90 border-y border-slate-700 px-5 py-3.5 flex items-center justify-between cursor-pointer active:bg-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎮</span>
                          <span className="text-white font-bold text-base">Sign in with Play Games</span>
                        </div>
                        <span className="text-slate-400 font-bold text-lg">&gt;</span>
                      </div>
                    </div>

                    {/* 4. App Version & Policy Links */}
                    <div className="mt-auto pt-8 pb-4 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                      <span className="font-semibold tracking-wider">3.10.0-26092472</span>
                      <div className="flex gap-2 text-slate-500 font-medium">
                        <span className="cursor-pointer hover:underline">Privacy Policy</span>
                        <span>·</span>
                        <span className="cursor-pointer hover:underline">Terms of Service</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Navigation Bar (Matching frame_04.jpg) */}
            <div className="absolute bottom-0 left-0 right-0 h-[82px] bg-[#1E40AF] border-t-[3.5px] border-[#F59E0B] z-50 flex items-end justify-between px-2 pb-1 pointer-events-auto select-none shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
              {/* Tab 1: SHOP */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('SHOP'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'SHOP' 
                    ? '-mt-4.5 pt-1 pb-1 px-1 bg-[#1E40AF] rounded-t-2xl border-t-[3.5px] border-x-[3.5px] border-[#F59E0B] shadow-md' 
                    : 'pb-2 opacity-95 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'SHOP' ? (
                  <div className="w-12 h-10 bg-[#FFFDF0] rounded-xl border-[2.5px] border-[#B45309] flex items-center justify-center shadow-sm">
                    <span className="text-2xl filter drop-shadow-sm">🏪</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-10">
                    <span className="text-3xl filter drop-shadow-sm">🏪</span>
                  </div>
                )}
                {activeTab === 'SHOP' && (
                  <span className="text-white font-black text-[11px] tracking-wide mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Shop
                  </span>
                )}
              </button>
              
              {/* Tab 2: LEADERBOARD */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('LEADERBOARD'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'LEADERBOARD' 
                    ? '-mt-4.5 pt-1 pb-1 px-1 bg-[#1E40AF] rounded-t-2xl border-t-[3.5px] border-x-[3.5px] border-[#F59E0B] shadow-md' 
                    : 'pb-2 opacity-95 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'LEADERBOARD' ? (
                  <div className="w-12 h-10 bg-[#FFFDF0] rounded-xl border-[2.5px] border-[#B45309] flex items-center justify-center shadow-sm">
                    <span className="text-2xl filter drop-shadow-sm">🏆</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-10">
                    <span className="text-3xl filter drop-shadow-sm">🏆</span>
                  </div>
                )}
                {activeTab === 'LEADERBOARD' && (
                  <span className="text-white font-black text-[11px] tracking-wide mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Ranking
                  </span>
                )}
              </button>
              
              {/* Tab 3: HOME (Elevated Arched Tab in frame_04.jpg) */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('HOME'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'HOME' 
                    ? '-mt-4.5 pt-1 pb-1 px-1 bg-[#1E40AF] rounded-t-2xl border-t-[3.5px] border-x-[3.5px] border-[#F59E0B] shadow-md' 
                    : 'pb-2 opacity-95 hover:opacity-100 active:scale-95'
                }`}
              >
                <div className="w-12 h-10 bg-[#FFFDF0] rounded-xl border-[2.5px] border-[#B45309] flex items-center justify-center shadow-sm">
                  <span className="text-2xl text-red-500 filter drop-shadow-sm">🏠</span>
                </div>
                {activeTab === 'HOME' && (
                  <span className="text-white font-black text-[11px] tracking-wide mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Home
                  </span>
                )}
              </button>
              
              {/* Tab 4: JOURNEY */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('JOURNEY'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'JOURNEY' 
                    ? '-mt-4.5 pt-1 pb-1 px-1 bg-[#1E40AF] rounded-t-2xl border-t-[3.5px] border-x-[3.5px] border-[#F59E0B] shadow-md' 
                    : 'pb-2 opacity-95 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'JOURNEY' ? (
                  <div className="w-12 h-10 bg-[#FFFDF0] rounded-xl border-[2.5px] border-[#B45309] flex items-center justify-center shadow-sm">
                    <span className="text-2xl filter drop-shadow-sm">📷</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-10">
                    <span className="text-3xl filter drop-shadow-sm">📷</span>
                  </div>
                )}
                {activeTab === 'JOURNEY' && (
                  <span className="text-white font-black text-[11px] tracking-wide mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Journey
                  </span>
                )}
              </button>
              
              {/* Tab 5: SETTINGS */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('SETTINGS'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'SETTINGS' 
                    ? '-mt-4.5 pt-1 pb-1 px-1 bg-[#1E40AF] rounded-t-2xl border-t-[3.5px] border-x-[3.5px] border-[#F59E0B] shadow-md' 
                    : 'pb-2 opacity-95 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'SETTINGS' ? (
                  <div className="w-12 h-10 bg-[#FFFDF0] rounded-xl border-[2.5px] border-[#B45309] flex items-center justify-center shadow-sm">
                    <span className="text-2xl filter drop-shadow-sm">⚙️</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-10">
                    <span className="text-3xl text-amber-400 filter drop-shadow-sm">⚙️</span>
                  </div>
                )}
                {activeTab === 'SETTINGS' && (
                  <span className="text-white font-black text-[11px] tracking-wide mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Settings
                  </span>
                )}
              </button>
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
          <div className="w-full h-full flex-1 flex flex-col bg-[#bfe0f7] overflow-hidden relative select-none">
            {/* FLOATING TOP ARCADE HUD (MATCHING REFERENCE SCREENSHOTS frame_05.jpg & frame_06.jpg) */}
            <div className="absolute top-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between select-none">
              {/* Left: Back to Home button (invisible touch target matching frame_05.jpg & frame_06.jpg) */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setScreen('HOME');
                }}
                className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center cursor-pointer opacity-0 active:opacity-20"
                title="Back to Home"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              {/* Center: Level Pill Badge (Matching Reference Screenshots 1, 2, 3) */}
              <div className="pointer-events-none flex items-center justify-center">
                <div className="bg-[#1d4ed8] border-[3.5px] border-[#fbbf24] shadow-[0_4px_12px_rgba(0,0,0,0.35)] rounded-full px-8 py-1.5 flex items-center justify-center">
                  <span
                    className="text-lg sm:text-xl font-black text-white tracking-wide"
                    style={{ WebkitTextStroke: '0.5px #1e3a8a', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                  >
                    Level {gameState.levelId}
                  </span>
                </div>
              </div>

              {/* Right: Settings Gear Icon (Matching Reference Screenshots 1, 2, 3) */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowPauseModal(true);
                }}
                className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1d4ed8] border-[3px] border-[#fbbf24] shadow-[0_4px_10px_rgba(0,0,0,0.35)] flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
                title="Settings"
              >
                <span className="text-xl">⚙️</span>
              </button>
            </div>


            {/* 3D FULL-SCREEN GAME ARENA */}
            <div ref={arenaContainerRef} className="absolute inset-0 w-full h-full overflow-hidden">
              <ArenaErrorBoundary onReset={() => controller.loadLevel(gameState.levelId, selectedDifficulty, selectedGameMode)}>
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
              </ArenaErrorBoundary>
            </div>

            {/* FLOATING BOTTOM TACTILE BOOSTERS DECK (MATCHING SCREENSHOTS frame_05.jpg & frame_06.jpg) */}
            <div className="absolute bottom-5 left-0 right-0 z-30 pointer-events-auto flex items-end justify-center gap-4 px-4 select-none">
              
              {/* 1. Shuffle Booster */}
              <button
                onClick={() => handleUseBooster('shuffle')}
                className="relative flex flex-col items-center justify-center w-24 h-16 sm:w-26 sm:h-17 bg-gradient-to-b from-[#38bdf8] via-[#2563eb] to-[#1e40af] rounded-2xl border-2 border-white shadow-[0_6px_16px_rgba(30,58,138,0.45)] active:scale-95 active:translate-y-0.5 transition-all group"
                title="Shuffle puzzle vehicles"
              >
                {/* Green '+' Circular Badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#22c55e] rounded-full border-2 border-white flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-black leading-none mb-0.5">+</span>
                </div>
                {/* Green Van with Swirl Arrows */}
                <div className="flex items-center justify-center h-8 mb-0.5 relative">
                  <svg className="w-10 h-7" viewBox="0 0 40 28" fill="none">
                    {/* Orbiting yellow curved arrows */}
                    <path d="M6 14 C6 7 14 3 20 3 C25 3 31 6 33 10" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
                    <polygon points="34,7 35,12 30,11" fill="#facc15" />
                    <path d="M34 14 C34 21 26 25 20 25 C15 25 9 22 7 18" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
                    <polygon points="6,21 5,16 10,17" fill="#facc15" />
                    {/* Cute green car */}
                    <rect x="10" y="8" width="20" height="12" rx="3.5" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                    <rect x="13" y="10" width="6" height="4" rx="1" fill="#e0f2fe" />
                    <rect x="21" y="10" width="6" height="4" rx="1" fill="#e0f2fe" />
                    <circle cx="14" cy="20" r="2.2" fill="#1e293b" />
                    <circle cx="26" cy="20" r="2.2" fill="#1e293b" />
                  </svg>
                </div>
                <span className="text-white font-black text-xs tracking-wide" style={{WebkitTextStroke: '0.5px #1e3a8a', textShadow: '0 1px 2px rgba(0,0,0,0.8)'}}>
                  Shuffle
                </span>
              </button>

              {/* 2. Clear (Helicopter) Booster */}
              <button
                onClick={() => handleUseBooster('extraSpace')}
                className="relative flex flex-col items-center justify-center w-24 h-16 sm:w-26 sm:h-17 bg-gradient-to-b from-[#38bdf8] via-[#2563eb] to-[#1e40af] rounded-2xl border-2 border-white shadow-[0_6px_16px_rgba(30,58,138,0.45)] active:scale-95 active:translate-y-0.5 transition-all group"
                title="Clear vehicle with helicopter"
              >
                {/* Green '+' Circular Badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#22c55e] rounded-full border-2 border-white flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-black leading-none mb-0.5">+</span>
                </div>
                {/* Yellow Helicopter Icon */}
                <div className="flex items-center justify-center h-8 mb-0.5">
                  <svg className="w-10 h-7" viewBox="0 0 40 28" fill="none">
                    {/* Propeller rotor */}
                    <rect x="8" y="3" width="24" height="2" rx="1" fill="#f97316" />
                    <rect x="19" y="4" width="2" height="3" fill="#64748b" />
                    {/* Helicopter body */}
                    <ellipse cx="20" cy="13" rx="10" ry="7" fill="#facc15" stroke="#d97706" strokeWidth="1" />
                    {/* Window */}
                    <path d="M14 11 Q17 8 22 9 L21 14 Q16 14 14 11 Z" fill="#e0f2fe" />
                    {/* Tail beam & tail rotor */}
                    <path d="M28 13 L36 10" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="36" cy="10" r="1.5" fill="#f97316" />
                    {/* Landing skids */}
                    <line x1="13" y1="23" x2="27" y2="23" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="16" y1="19" x2="15" y2="23" stroke="#64748b" strokeWidth="1.4" />
                    <line x1="24" y1="19" x2="25" y2="23" stroke="#64748b" strokeWidth="1.4" />
                  </svg>
                </div>
                <span className="text-white font-black text-xs tracking-wide" style={{WebkitTextStroke: '0.5px #1e3a8a', textShadow: '0 1px 2px rgba(0,0,0,0.8)'}}>
                  Clear
                </span>
              </button>

              {/* 3. Sort (Magnet / Jelly Crowd) Booster */}
              <button
                onClick={() => handleUseBooster('passengerSwap')}
                className="relative flex flex-col items-center justify-center w-24 h-16 sm:w-26 sm:h-17 bg-gradient-to-b from-[#38bdf8] via-[#2563eb] to-[#1e40af] rounded-2xl border-2 border-white shadow-[0_6px_16px_rgba(30,58,138,0.45)] active:scale-95 active:translate-y-0.5 transition-all group"
                title="Sort commuter queue"
              >
                {/* Green '+' Circular Badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#22c55e] rounded-full border-2 border-white flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-black leading-none mb-0.5">+</span>
                </div>
                {/* Green & Purple Chibi Commuters with Orbiting Arrows */}
                <div className="flex items-center justify-center h-8 mb-0.5">
                  <svg className="w-10 h-7" viewBox="0 0 40 28" fill="none">
                    {/* Orbiting yellow arrows */}
                    <path d="M8 14 C8 7 15 3 20 3 C25 3 32 7 32 14" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
                    <polygon points="33,11 34,16 29,15" fill="#facc15" />
                    <path d="M32 14 C32 21 25 25 20 25 C15 25 8 21 8 14" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
                    <polygon points="7,17 6,12 11,13" fill="#facc15" />
                    {/* Green chibi */}
                    <circle cx="15" cy="11" r="3.2" fill="#22c55e" />
                    <rect x="12" y="14" width="6" height="7" rx="2" fill="#22c55e" />
                    {/* Purple/Magenta chibi */}
                    <circle cx="25" cy="11" r="3.2" fill="#d946ef" />
                    <rect x="22" y="14" width="6" height="7" rx="2" fill="#d946ef" />
                  </svg>
                </div>
                <span className="text-white font-black text-xs tracking-wide" style={{WebkitTextStroke: '0.5px #1e3a8a', textShadow: '0 1px 2px rgba(0,0,0,0.8)'}}>
                  Sort
                </span>
              </button>
            </div>

            {/* LEVEL 1 TUTORIAL OVERLAYS (MATCHING SCREENSHOTS 1 & 2) */}
            {gameState.levelId === 1 && gameState.moves === 0 && (
              <div className="absolute top-[28%] left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xs pointer-events-none">
                <div className="bg-[#FFFDF0] border-[3px] border-[#B07B46] rounded-2xl px-5 py-3.5 shadow-2xl relative text-center">
                  <p className="text-[#1E3A8A] font-bold text-sm sm:text-base leading-snug">
                    Vehicles can only move in the direction of the arrows.
                  </p>
                </div>
                {/* Bouncing Hand Pointer Tapping on Vehicle (Matching Screenshot 1) */}
                <div className="flex justify-center mt-10 animate-bounce">
                  <span className="text-5xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] transform -rotate-12">👆</span>
                </div>
              </div>
            )}

            {gameState.levelId === 1 && gameState.moves === 1 && (
              <div className="absolute top-[28%] left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xs pointer-events-none">
                <div className="bg-[#FFFDF0] border-[3px] border-[#B07B46] rounded-2xl px-5 py-3.5 shadow-2xl relative text-center">
                  {/* Top equation: [Van] = 6 [Passenger] (Matching Screenshot 2) */}
                  <div className="flex justify-center items-center gap-3 mb-2">
                    {/* Stylized Green Van Icon */}
                    <div className="w-12 h-6 bg-[#22c55e] rounded-md border-2 border-[#15803d] shadow-sm flex items-center justify-between px-1 relative">
                      <div className="w-3 h-2 bg-sky-200 rounded-sm" />
                      <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full" />
                    </div>
                    <span className="text-[#1E3A8A] font-black text-2xl leading-none">= 6</span>
                    {/* Stylized Green Passenger Pin */}
                    <div className="flex flex-col items-center">
                      <div className="w-3.5 h-3.5 bg-[#22c55e] rounded-full border border-white shadow-sm" />
                      <div className="w-4 h-3 bg-[#22c55e] rounded-t-sm -mt-0.5 border-x border-t border-white" />
                    </div>
                  </div>
                  <p className="text-[#1E3A8A] font-bold text-sm sm:text-base leading-snug">
                    Van can carry 6 people of the same color.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            MODALS: LEVEL INTRO, PAUSE, VICTORY, GRIDLOCK, OUT OF MOVES, SHOP, DAILY
           ======================================================== */}

        {/* EDIT PROFILE MODAL (EXACT SAME AS REFERENCE SCREENSHOT 1) */}
        <EditProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentName={playerName}
          currentAvatarId={playerAvatarId}
          onSave={handleSaveProfile}
        />

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

        {/* 0. IN-GAME SETTINGS MODAL (EXACT SAME AS REFERENCE IMAGE 1 - frame_07.jpg) */}
        <SettingsModal
          isOpen={showPauseModal}
          onClose={() => setShowPauseModal(false)}
          soundOn={soundOn}
          onToggleSound={() => setSoundOn(!soundOn)}
          onGoHome={() => {
            setShowPauseModal(false);
            setScreen('HOME');
          }}
          onRetry={() => {
            setShowPauseModal(false);
            controller.loadLevel(gameState.levelId);
          }}
          graphicsQuality={graphicsQuality}
          onChangeGraphicsQuality={setGraphicsQuality}
          selectedDifficulty={selectedDifficulty}
          onChangeDifficulty={setSelectedDifficulty}
          onOpenHowToPlay={() => setShowHelpModal(true)}
        />

        {/* 1. VICTORY CELEBRATION MODAL (MATCHING frame_08.jpg & frame_09.jpg) */}
        {victoryData && (
          <VictoryModal
            levelId={gameState.levelId}
            rewardCoins={victoryData.rewardCoins || 20}
            totalCoins={gameState.coins}
            onContinue={() => {
              const nextId = gameState.levelId + 1;
              setVictoryData(null);
              handleLevelSelect(nextId, selectedDifficulty, selectedGameMode);
            }}
            onClose={() => {
              setVictoryData(null);
              setScreen('HOME');
            }}
          />
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
