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
  const [customizationVersion, setCustomizationVersion] = useState(0);
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
                  {/* Top Header: Avatar & Coin Pill (Matching HUD Screenshot) */}
                  <div className="absolute top-4 left-4 z-20 flex items-center pointer-events-none select-none">
                    
                    {/* 1. Avatar Square */}
                    <div className="relative z-20">
                      <div 
                        onClick={() => { sounds.playClick(); setShowProfileModal(true); }}
                        className="pointer-events-auto w-[54px] h-[54px] rounded-[18px] border-[3px] border-[#93D7FB] bg-gradient-to-b from-[#C446FF] to-[#9F13EC] shadow-[0_4px_8px_rgba(0,0,0,0.2)] flex items-center justify-center p-1 cursor-pointer active:scale-95 transition-transform relative"
                        title="Edit Profile"
                      >
                        {/* Inner Lighter Purple Ring */}
                        <div className="absolute inset-[1.5px] rounded-[13px] border-[1.5px] border-[#DD7EFF] pointer-events-none" />
                        <span className="text-[32px] filter drop-shadow-md select-none relative z-10">
                          {currentAvatarOption.emoji || '🦆'}
                        </span>
                      </div>
                    </div>

                    {/* 2. Connected Coin Pill */}
                    <div className="pointer-events-auto relative z-10 flex items-center bg-[#FFF8EC] border-[3px] border-[#B26B22] rounded-r-full h-[38px] shadow-[0_4px_6px_rgba(0,0,0,0.15)] -ml-[12px] pl-[14px] pr-[16px]">
                      {/* 3D Gold Coin with embossed 'G' */}
                      <div className="relative w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[#FDE047] via-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-inner mr-1.5 border border-[#FEF08A]">
                        <span className="text-[#844309] font-black text-[15px] tracking-tighter" style={{ WebkitTextStroke: '0.5px #A1580E' }}>G</span>
                        {/* Connected Green Plus Button */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); sounds.playClick(); setActiveTab('SHOP'); }}
                          className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#1BD954] border-[2px] border-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                          title="Buy Coins"
                        >
                          <span className="text-white text-[14px] font-black leading-none pb-[1px]">+</span>
                        </button>
                      </div>
                      {/* Coin Amount */}
                      <span className="text-[#592608] font-black text-[18px] tracking-wide mt-0.5">
                        {gameState.coins}
                      </span>
                    </div>

                    {/* 3. Garage / Bus Mod Shop Button */}
                    <div className="relative z-20 ml-3">
                      <button
                        onClick={() => { sounds.playClick(); setShowGarageModal(true); }}
                        className="pointer-events-auto w-[52px] h-[52px] rounded-[18px] border-[3px] border-[#93D7FB] bg-gradient-to-b from-[#3492FA] to-[#0D55DE] shadow-[0_4px_8px_rgba(0,0,0,0.2)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform relative"
                        title="Bus Garage & Customization"
                      >
                        {/* Inner Lighter Blue Ring */}
                        <div className="absolute inset-[1.5px] rounded-[13px] border-[1.5px] border-[#7CBDFE] pointer-events-none" />
                        <span className="text-[30px] filter drop-shadow-md select-none relative z-10">🚌</span>
                      </button>
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
                <div className="absolute inset-0 bg-[#24368E] z-40 pointer-events-auto flex flex-col pt-4 px-3 pb-[105px] overflow-y-auto select-none overflow-x-hidden">
                  
                  {/* Top Header: Coin Counter & Golden 3D "Shop" Title */}
                  <div className="flex items-center justify-between mb-2 pb-2 relative z-10 px-2">
                    {/* 2. Connected Coin Pill */}
                    <div className="relative flex items-center bg-[#FFF8EC] border-[3px] border-[#B26B22] rounded-full h-[38px] shadow-[0_4px_6px_rgba(0,0,0,0.15)] pl-[2px] pr-[16px]">
                      {/* 3D Gold Coin with embossed 'C' */}
                      <div className="relative w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[#FDE047] via-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-inner mr-1.5 border border-[#FEF08A]">
                        <span className="text-[#844309] font-black text-[15px] tracking-tighter" style={{ WebkitTextStroke: '0.5px #A1580E' }}>C</span>
                        {/* Connected Green Plus Button */}
                        <div className="absolute -bottom-1 -right-1 w-[16px] h-[16px] rounded-full bg-[#1BD954] border-[2px] border-white flex items-center justify-center shadow-md">
                          <span className="text-white text-[14px] font-black leading-none pb-[1px]">+</span>
                        </div>
                      </div>
                      {/* Coin Amount */}
                      <span className="text-[#592608] font-black text-[15px] tracking-wide mt-0.5 font-sans">
                        {gameState.coins}
                      </span>
                    </div>

                    <h1 
                      className="text-[36px] font-black text-[#FFDF3E] tracking-wide absolute left-1/2 -translate-x-1/2" 
                      style={{
                        WebkitTextStroke: '1.5px #B67115',
                        textShadow: '0 3px 0 #924C03',
                        fontFamily: "'Comic Sans MS', cursive, sans-serif"
                      }}
                    >
                      Shop
                    </h1>
                  </div>

                  {/* Horizontal Yellow Line */}
                  <div className="w-[120%] -ml-6 h-[2px] bg-[#FFDF3E] mb-5 shadow-[0_1px_0_#924C03] z-0"></div>
                  
                  {/* 1. Remove Ads Banner Card */}
                  <div className="bg-[#4988EE] border-[3px] border-[#72A6F6] rounded-[24px] p-4 mb-4 relative shadow-[0_4px_10px_rgba(0,0,0,0.2)] flex items-center justify-between mx-1 h-[110px]">
                    <div className="absolute top-3 right-3 w-[20px] h-[20px] bg-[#97C5FB] rounded-full flex items-center justify-center text-[#2A5E9E] text-[12px] font-black shadow-sm">
                      i
                    </div>
                    <div className="flex flex-col justify-between h-full py-1">
                      <div className="text-white font-black text-[15px] leading-tight mt-1">Remove Banner<br/>and Pop-up Ads</div>
                      <div className="bg-[#78BA10] border-b-[4px] border-[#538209] border-x-[2px] border-x-[#68A20D] text-white font-black text-[13px] px-4 py-1 rounded-[16px] shadow-md w-fit -ml-1 mt-1">
                        ₹1,100.00
                      </div>
                    </div>
                    {/* Glowing ADS Medallion */}
                    <div className="relative mr-5">
                      <div className="absolute w-[80px] h-[80px] bg-[#E53B25]/20 rounded-full blur-xl animate-pulse -inset-2" />
                      <div className="w-[70px] h-[70px] rounded-full bg-[#E53B25] border-[4px] border-[#FAD635] flex items-center justify-center shadow-lg relative overflow-hidden">
                        <span className="text-[#351A03] font-black text-[22px] tracking-tighter" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.3)' }}>ADS</span>
                        {/* Red Slash */}
                        <div className="absolute w-full h-[6px] bg-[#C11803] -rotate-45 transform origin-center shadow-sm" />
                      </div>
                    </div>
                  </div>

                  {/* 2. Bundle 4000 */}
                  <div className="bg-[#194FD1] rounded-[28px] mb-4 shadow-[0_6px_0_#103597] flex flex-col mx-1 relative h-[140px]">
                    <div className="bg-[#FFF6DC] rounded-[24px] h-[105px] flex items-center justify-between px-6 z-10 border-b-[3px] border-[#D6C59E]">
                      <div className="flex flex-col items-center">
                        <div className="w-[50px] h-[50px] bg-[#FAD425] rounded-full flex items-center justify-center shadow-sm mb-1 mt-1 border-[2px] border-[#FFF1A0]">
                          <span className="text-white font-black text-[20px] opacity-80" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.2)' }}>🏛️</span>
                        </div>
                        <div className="text-[#592608] font-black text-[16px]">4 000</div>
                      </div>
                      <div className="bg-white rounded-[20px] px-3 py-2 flex gap-4 h-[70px] items-center shadow-sm">
                        <div className="flex flex-col items-center"><span className="text-[26px]">🚙</span><span className="text-[#7B3708] font-black text-[11px]">x1</span></div>
                        <div className="flex flex-col items-center"><span className="text-[26px]">🚁</span><span className="text-[#7B3708] font-black text-[11px]">x1</span></div>
                        <div className="flex flex-col items-center"><span className="text-[26px]">🌳</span><span className="text-[#7B3708] font-black text-[11px]">x1</span></div>
                      </div>
                    </div>
                    {/* Bottom Blue Base with Green Button Top Edge */}
                    <div className="h-[35px] w-full flex items-end justify-end px-6 relative overflow-hidden">
                       <div className="w-[110px] h-[22px] bg-[#78BA10] rounded-t-[16px] border-t-[3px] border-x-[3px] border-[#91DA15]" />
                    </div>
                  </div>
                  
                  {/* 3. Bundle 8000 */}
                  <div className="bg-[#194FD1] rounded-[28px] mb-4 shadow-[0_6px_0_#103597] flex flex-col mx-1 relative h-[140px]">
                    <div className="bg-[#FFF6DC] rounded-[24px] h-[105px] flex items-center justify-between px-6 z-10 border-b-[3px] border-[#D6C59E]">
                      <div className="flex flex-col items-center">
                        <div className="w-[50px] h-[50px] bg-[#FAD425] rounded-full flex items-center justify-center shadow-sm mb-1 mt-1 border-[2px] border-[#FFF1A0]">
                          <span className="text-white font-black text-[20px] opacity-80" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.2)' }}>🏛️</span>
                        </div>
                        <div className="text-[#592608] font-black text-[16px]">8 000</div>
                      </div>
                      <div className="bg-white rounded-[20px] px-3 py-2 flex gap-4 h-[70px] items-center shadow-sm">
                        <div className="flex flex-col items-center"><span className="text-[26px]">🚙</span><span className="text-[#7B3708] font-black text-[11px]">x2</span></div>
                        <div className="flex flex-col items-center"><span className="text-[26px]">🚁</span><span className="text-[#7B3708] font-black text-[11px]">x2</span></div>
                        <div className="flex flex-col items-center"><span className="text-[26px]">🌳</span><span className="text-[#7B3708] font-black text-[11px]">x2</span></div>
                      </div>
                    </div>
                    <div className="h-[35px] w-full flex items-end justify-end px-6 relative overflow-hidden">
                       <div className="w-[110px] h-[22px] bg-[#78BA10] rounded-t-[16px] border-t-[3px] border-x-[3px] border-[#91DA15]" />
                    </div>
                  </div>

                  {/* 4. Popular Master Bundle (18000) */}
                  <div className="bg-[#194FD1] rounded-[28px] mb-4 shadow-[0_6px_0_#103597] flex flex-col mx-1 relative h-[140px]">
                    <div className="absolute top-1.5 left-5 z-20">
                      <div className="bg-[#D82A27] text-white font-black text-[10px] px-3 py-1 rounded-full shadow-sm tracking-wider">
                        POPULAR
                      </div>
                    </div>
                    <div className="bg-[#FFF6DC] rounded-[24px] h-[105px] flex items-center justify-between px-6 z-10 border-b-[3px] border-[#D6C59E] pt-4">
                      <div className="flex flex-col items-center">
                        <div className="w-[50px] h-[50px] bg-[#FAD425] rounded-full flex items-center justify-center shadow-sm mb-1 mt-1 border-[2px] border-[#FFF1A0]">
                          <span className="text-white font-black text-[20px] opacity-80" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.2)' }}>🏛️</span>
                        </div>
                        <div className="text-[#592608] font-black text-[16px]">18 000</div>
                      </div>
                      <div className="bg-white rounded-[20px] px-3 py-2 flex gap-4 h-[70px] items-center shadow-sm">
                        <div className="flex flex-col items-center"><span className="text-[26px]">🚙</span><span className="text-[#7B3708] font-black text-[11px]">x4</span></div>
                        <div className="flex flex-col items-center"><span className="text-[26px]">🚁</span><span className="text-[#7B3708] font-black text-[11px]">x4</span></div>
                        <div className="flex flex-col items-center"><span className="text-[26px]">🌳</span><span className="text-[#7B3708] font-black text-[11px]">x4</span></div>
                      </div>
                    </div>
                    <div className="h-[35px] w-full flex items-end justify-end px-6 relative overflow-hidden">
                       <div className="w-[110px] h-[22px] bg-[#78BA10] rounded-t-[16px] border-t-[3px] border-x-[3px] border-[#91DA15]" />
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

            {/* Bottom Navigation Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[76px] bg-[#173EB4] border-t-[3.5px] border-[#FFB00B] z-50 flex items-end justify-between px-2 pb-1 pointer-events-auto select-none shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
              {/* Tab 1: SHOP */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('SHOP'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'SHOP' 
                    ? '-mt-[22px] h-[90px] pt-2 pb-1 bg-[#173EB4] rounded-t-[20px] border-t-[3.5px] border-x-[3.5px] border-[#FFB00B] shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-10' 
                    : 'h-[72.5px] justify-center opacity-85 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'SHOP' ? (
                  <>
                    <div className="bg-white rounded-[10px] border-[2px] border-[#E84120] w-[46px] h-[40px] flex items-center justify-center shadow-sm mb-1">
                      <span className="text-[26px] filter drop-shadow-sm select-none leading-none pt-1">🏪</span>
                    </div>
                    <span className="text-white font-black text-[13px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">Shop</span>
                  </>
                ) : (
                  <span className="text-[34px] filter drop-shadow-sm select-none">🏪</span>
                )}
              </button>
              
              {/* Tab 2: LEADERBOARD / TROPHY */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('LEADERBOARD'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'LEADERBOARD' 
                    ? '-mt-[22px] h-[90px] pt-2 pb-1 bg-[#173EB4] rounded-t-[20px] border-t-[3.5px] border-x-[3.5px] border-[#FFB00B] shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-10' 
                    : 'h-[72.5px] justify-center opacity-85 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'LEADERBOARD' ? (
                  <>
                    <div className="bg-white rounded-[10px] border-[2px] border-[#D97706] w-[46px] h-[40px] flex items-center justify-center shadow-sm mb-1">
                      <span className="text-[26px] filter drop-shadow-sm select-none leading-none pt-1">🏆</span>
                    </div>
                    <span className="text-white font-black text-[12px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">Ranking</span>
                  </>
                ) : (
                  <span className="text-[34px] filter drop-shadow-sm select-none">🏆</span>
                )}
              </button>
              
              {/* Tab 3: HOME */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('HOME'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'HOME' 
                    ? '-mt-[22px] h-[90px] pt-2 pb-1 bg-[#173EB4] rounded-t-[20px] border-t-[3.5px] border-x-[3.5px] border-[#FFB00B] shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-10' 
                    : 'h-[72.5px] justify-center opacity-85 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'HOME' ? (
                  <>
                    <div className="bg-white rounded-[10px] border-[2px] border-[#D97706] w-[46px] h-[40px] flex items-center justify-center shadow-sm mb-1">
                      <span className="text-[26px] filter drop-shadow-sm select-none leading-none pt-1">🏠</span>
                    </div>
                    <span className="text-white font-black text-[12px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">Home</span>
                  </>
                ) : (
                  <span className="text-[34px] filter drop-shadow-sm select-none">🏠</span>
                )}
              </button>
              
              {/* Tab 4: JOURNEY */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('JOURNEY'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'JOURNEY' 
                    ? '-mt-[22px] h-[90px] pt-2 pb-1 bg-[#173EB4] rounded-t-[20px] border-t-[3.5px] border-x-[3.5px] border-[#FFB00B] shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-10' 
                    : 'h-[72.5px] justify-center opacity-85 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'JOURNEY' ? (
                  <>
                    <div className="bg-white rounded-[10px] border-[2px] border-[#D97706] w-[46px] h-[40px] flex items-center justify-center shadow-sm mb-1">
                      <span className="text-[26px] filter drop-shadow-sm select-none leading-none pt-1">📷</span>
                    </div>
                    <span className="text-white font-black text-[12px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">Journey</span>
                  </>
                ) : (
                  <span className="text-[34px] filter drop-shadow-sm select-none">📷</span>
                )}
              </button>
              
              {/* Tab 5: SETTINGS */}
              <button 
                onClick={() => { sounds.playClick(); setActiveTab('SETTINGS'); }} 
                className={`flex flex-col items-center justify-end w-1/5 relative transition-all ${
                  activeTab === 'SETTINGS' 
                    ? '-mt-[22px] h-[90px] pt-2 pb-1 bg-[#173EB4] rounded-t-[20px] border-t-[3.5px] border-x-[3.5px] border-[#FFB00B] shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-10' 
                    : 'h-[72.5px] justify-center opacity-85 hover:opacity-100 active:scale-95'
                }`}
              >
                {activeTab === 'SETTINGS' ? (
                  <>
                    <div className="bg-white rounded-[10px] border-[2px] border-[#D97706] w-[46px] h-[40px] flex items-center justify-center shadow-sm mb-1">
                      <span className="text-[26px] filter drop-shadow-sm select-none leading-none pt-1">⚙️</span>
                    </div>
                    <span className="text-white font-black text-[12px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">Settings</span>
                  </>
                ) : (
                  <span className="text-[34px] filter drop-shadow-sm select-none">⚙️</span>
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
          <div className="w-full h-full flex-1 flex flex-col bg-[#D4D8DC] overflow-hidden relative select-none">
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
                  customizationVersion={customizationVersion}
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

        {/* 00. LEVEL INTRO PRE-FLIGHT MODAL (BLUE THEME) */}
        {levelIntro && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm busjam-modal-card pt-10 pb-6 px-6 text-center relative">
              {/* Header Tab */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 busjam-modal-header-tab">
                <span className="text-white font-black text-xl tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  Level {levelIntro.id}
                </span>
              </div>
              {/* Close X */}
              <button
                onClick={() => setLevelIntro(null)}
                className="absolute -right-3 -top-3 w-8 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <span className="text-white font-black text-xl leading-none">×</span>
              </button>

              {/* World & Mode pills */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-400/25 border border-sky-300/50 text-sky-200 text-xs font-black uppercase tracking-wider">
                  <span>{getWorldConfig(levelIntro.world).icon}</span>
                  <span>{getWorldConfig(levelIntro.world).name}</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-xs font-black uppercase tracking-wider">
                  <span>{GAME_MODE_CONFIGS[selectedGameMode].icon}</span>
                  <span>{GAME_MODE_CONFIGS[selectedGameMode].name}</span>
                </div>
              </div>

              {/* Level Name */}
              <p className="text-sky-100 font-bold text-sm mb-4 tracking-wide">{levelIntro.name}</p>

              {/* Mission Stats — cream inner card */}
              <div className="bg-[#FFF8E7] border-2 border-[#D97706]/40 rounded-2xl p-4 mb-5 flex items-center justify-around shadow-inner">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-black text-[#B45309] block">Time</span>
                  <span className="text-sm font-black text-[#7C3AED]">⏱️ {levelIntro.timeLimit}s</span>
                </div>
                <div className="h-8 w-px bg-amber-200" />
                <div className="text-center">
                  <span className="text-[10px] uppercase font-black text-[#B45309] block">Par Moves</span>
                  <span className="text-sm font-black text-[#065F46]">🎯 {levelIntro.parMoves}</span>
                </div>
                <div className="h-8 w-px bg-amber-200" />
                <div className="text-center">
                  <span className="text-[10px] uppercase font-black text-[#B45309] block">Reward</span>
                  <span className="text-sm font-black text-[#92400E]">🪙 +50</span>
                </div>
              </div>

              {/* Objective */}
              <div className="bg-[#1e3a8a]/80 border border-yellow-400/40 rounded-2xl p-3 mb-5 text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-yellow-300 block mb-0.5">Objective</span>
                <span className="text-xs font-bold text-white">{levelIntro.objective}</span>
              </div>

              {/* Start Button — green */}
              <button
                onClick={() => {
                  handleLevelSelect(levelIntro.id, selectedDifficulty, selectedGameMode);
                  setLevelIntro(null);
                }}
                className="w-full py-3.5 bg-gradient-to-b from-[#84cc16] via-[#65a30d] to-[#4d7c0f] border-[3px] border-[#a3e635] rounded-2xl text-white font-black text-xl shadow-[0_5px_0_#14532d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                style={{ WebkitTextStroke: '1px #14532d' }}
              >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
                START LEVEL
              </button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-80 busjam-modal-card pt-10 pb-6 px-6 text-center relative">
              {/* Header Tab */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 busjam-modal-header-tab">
                <span className="text-white font-black text-xl tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Stuck!</span>
              </div>
              {/* Close X */}
              <button
                onClick={() => setShowGridlockModal(false)}
                className="absolute -right-3 -top-3 w-8 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <span className="text-white font-black text-xl leading-none">×</span>
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-rose-500/25 border-2 border-rose-400/50 flex items-center justify-center mx-auto mb-3 animate-pulse">
                <AlertTriangle className="w-7 h-7 text-rose-300" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">BAYS ARE JAMMED!</h2>
              <p className="text-xs text-sky-100/80 mb-5">
                All waiting bays are occupied and none match the front passenger's color.
              </p>

              {/* Actions — cream inner card */}
              <div className="bg-[#FFF8E7] border-2 border-[#D97706]/40 rounded-2xl p-3 mb-4 flex flex-col gap-2.5 shadow-inner">
                <button
                  onClick={() => handleUseBooster('passengerSwap')}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-b from-[#38bdf8] via-[#2563eb] to-[#1e40af] border-2 border-white text-white font-black text-xs flex items-center justify-between shadow-md active:translate-y-0.5"
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

                {gameState.unlockedDocksCount < 6 && (
                  <button
                    onClick={() => handleUseBooster('extraSpace')}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-b from-[#84cc16] via-[#65a30d] to-[#4d7c0f] border-2 border-[#a3e635] text-white font-black text-xs flex items-center justify-between shadow-md active:translate-y-0.5"
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

                <button
                  onClick={() => handleUseBooster('undo')}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[3px] border-[#b45309] text-white font-black text-xs flex items-center justify-between shadow-md active:translate-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <Undo2 className="w-4 h-4" />
                    <span>Undo Last Move</span>
                  </div>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-black">
                    {gameState.availableBoosters.undo > 0
                      ? `${gameState.availableBoosters.undo} Left`
                      : '50 🪙'}
                  </span>
                </button>
              </div>

              {/* Restart — orange button */}
              <button
                onClick={() => {
                  setShowGridlockModal(false);
                  controller.loadLevel(gameState.levelId);
                }}
                className="w-full py-3 bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[3px] border-[#b45309] rounded-2xl text-white font-black text-xl shadow-[0_4px_0_#92400e] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
                style={{ WebkitTextStroke: '1px #b45309' }}
              >
                Restart Level
              </button>
            </div>
          </div>
        )}

        {/* 3. OUT OF MOVES MODAL */}
        {showOutOfMovesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-80 busjam-modal-card pt-10 pb-6 px-6 text-center relative">
              {/* Header Tab */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 busjam-modal-header-tab">
                <span className="text-white font-black text-xl tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Out of Moves!</span>
              </div>
              {/* Close X */}
              <button
                onClick={() => {
                  setShowOutOfMovesModal(false);
                  controller.loadLevel(gameState.levelId);
                }}
                className="absolute -right-3 -top-3 w-8 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <span className="text-white font-black text-xl leading-none">×</span>
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-red-500/25 border-2 border-red-400/50 flex items-center justify-center mx-auto mb-3 animate-pulse">
                <RotateCcw className="w-7 h-7 text-red-300" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">OUT OF MOVES!</h2>
              <p className="text-xs text-sky-100/80 mb-5">
                You used all moves before loading all passengers.
              </p>

              {/* Cream inner card */}
              <div className="bg-[#FFF8E7] border-2 border-[#D97706]/40 rounded-2xl p-3 mb-4 flex flex-col gap-2.5 shadow-inner">
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[3px] border-[#b45309] text-white font-black text-xs flex items-center justify-between shadow-md active:translate-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    <span>Get +5 Moves</span>
                  </div>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-black">100 🪙</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowOutOfMovesModal(false);
                  controller.loadLevel(gameState.levelId);
                }}
                className="w-full py-3 bg-gradient-to-b from-[#84cc16] via-[#65a30d] to-[#4d7c0f] border-[3px] border-[#a3e635] rounded-2xl text-white font-black text-xl shadow-[0_5px_0_#14532d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
                style={{ WebkitTextStroke: '1px #14532d' }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* 3.5. OUT OF TIME MODAL (BLUE THEME) */}
        {showOutOfTimeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-80 busjam-modal-card pt-10 pb-6 px-6 text-center relative">
              {/* Header Tab */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 busjam-modal-header-tab">
                <span className="text-white font-black text-xl tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Time's Up!</span>
              </div>
              {/* Close X */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowOutOfTimeModal(false);
                  controller.loadLevel(gameState.levelId);
                }}
                className="absolute -right-3 -top-3 w-8 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <span className="text-white font-black text-xl leading-none">×</span>
              </button>

              {/* Icon */}
              <div className="relative w-14 h-14 rounded-2xl bg-rose-500/25 border-2 border-rose-400/50 flex items-center justify-center mx-auto mb-3">
                <Timer className="w-7 h-7 text-rose-300 animate-spin" />
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-[10px] font-black text-white border border-rose-300 shadow">00:00</span>
              </div>
              <h2 className="text-xl font-black text-white mb-1">OUT OF TIME!</h2>
              <p className="text-xs text-sky-100/80 mb-3">
                The terminal clock hit zero before all passengers boarded!
              </p>

              {/* Coin balance row */}
              <div className="flex items-center justify-between bg-[#1e3a8a]/70 border border-yellow-400/30 rounded-xl px-4 py-2 mb-4">
                <span className="text-xs font-bold text-sky-200">Your Balance</span>
                <span className="text-sm font-black text-yellow-300">🪙 {gameState.coins.toLocaleString()}</span>
              </div>

              {/* Cream inner card */}
              <div className="bg-[#FFF8E7] border-2 border-[#D97706]/40 rounded-2xl p-3 mb-4 flex flex-col gap-2.5 shadow-inner">
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[3px] border-[#b45309] text-white font-black text-xs flex items-center justify-between shadow-md active:translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Hourglass className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-black text-xs leading-tight">Get +30 Seconds</div>
                      <div className="text-[10px] text-amber-950/70 font-semibold">Resume right here</div>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-black ${
                    gameState.coins >= 80 ? 'bg-black/40 text-white' : 'bg-rose-700 text-white'
                  }`}>
                    {gameState.coins >= 80 ? '80 🪙' : 'Need 80 🪙'}
                  </span>
                </button>

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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-b from-[#38bdf8] via-[#2563eb] to-[#1e40af] border-2 border-white text-white font-black text-xs flex items-center justify-between shadow-md active:translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-black text-white text-[10px]">+60s</div>
                    <div className="text-left">
                      <div className="font-black text-xs text-white leading-tight">Get +60 Seconds (Mega)</div>
                      <div className="text-[10px] text-sky-200 font-semibold">Double time extension</div>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-black ${
                    gameState.coins >= 140 ? 'bg-black/40 text-white' : 'bg-rose-700 text-white'
                  }`}>
                    {gameState.coins >= 140 ? '140 🪙' : 'Need 140 🪙'}
                  </span>
                </button>
              </div>

              {/* Restart — green button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowOutOfTimeModal(false);
                  controller.loadLevel(gameState.levelId);
                }}
                className="w-full py-3 bg-gradient-to-b from-[#84cc16] via-[#65a30d] to-[#4d7c0f] border-[3px] border-[#a3e635] rounded-2xl text-white font-black text-xl shadow-[0_5px_0_#14532d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center mb-3"
                style={{ WebkitTextStroke: '1px #14532d' }}
              >
                Restart Level
              </button>

              {/* Choose Different Level Link (Goes to Journey) */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowOutOfTimeModal(false);
                  setScreen('HOME');
                  setActiveTab('JOURNEY');
                }}
                className="text-sky-200 font-bold text-[13px] tracking-wide hover:text-white transition-colors"
              >
                Choose Different Level
              </button>
            </div>
          </div>
        )}

        {/* 4. SHOP MODAL */}
        {showShopModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-80 busjam-modal-card pt-10 pb-6 px-5 relative">
              {/* Header Tab */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 busjam-modal-header-tab">
                <span className="text-white font-black text-xl tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Booster Shop</span>
              </div>
              {/* Close X */}
              <button
                onClick={() => setShowShopModal(false)}
                className="absolute -right-3 -top-3 w-8 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <span className="text-white font-black text-xl leading-none">×</span>
              </button>

              {/* Cream inner card with items */}
              <div className="bg-[#FFF8E7] border-2 border-[#D97706]/40 rounded-2xl p-3 mb-4 flex flex-col gap-2.5 shadow-inner">
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-xs font-black text-[#1E3A8A]">Hint Booster</div>
                    <div className="text-[10px] text-[#78350F]/70">Highlights optimal move</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 70) {
                        sounds.playBooster();
                        controller.addCoins(-70);
                        gameState.availableBoosters.hint++;
                      }
                    }}
                    className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-md active:translate-y-0.5"
                  >
                    70 🪙
                  </button>
                </div>
                <div className="h-px bg-amber-200" />
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-xs font-black text-[#1E3A8A]">Shuffle Directions</div>
                    <div className="text-[10px] text-[#78350F]/70">Rotates locked vehicles</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 80) {
                        sounds.playBooster();
                        controller.addCoins(-80);
                        gameState.availableBoosters.shuffle++;
                      }
                    }}
                    className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-md active:translate-y-0.5"
                  >
                    80 🪙
                  </button>
                </div>
                <div className="h-px bg-amber-200" />
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-xs font-black text-[#1E3A8A]">Queue Magnet</div>
                    <div className="text-[10px] text-[#78350F]/70">Sorts passenger line</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 90) {
                        sounds.playBooster();
                        controller.addCoins(-90);
                        gameState.availableBoosters.passengerSwap++;
                      }
                    }}
                    className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-md active:translate-y-0.5"
                  >
                    90 🪙
                  </button>
                </div>
                <div className="h-px bg-amber-200" />
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-xs font-black text-[#1E3A8A]">+30s Extra Time</div>
                    <div className="text-[10px] text-[#78350F]/70">Adds 30s to countdown</div>
                  </div>
                  <button
                    onClick={() => {
                      if (gameState.coins >= 80) {
                        sounds.playBooster();
                        controller.buyExtraTime(30, 80);
                      }
                    }}
                    className="bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#bef264] text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-md active:translate-y-0.5"
                  >
                    80 🪙
                  </button>
                </div>
              </div>

              {/* Claim free coins — orange button */}
              <button
                onClick={() => {
                  sounds.playWin();
                  controller.addCoins(500);
                }}
                className="w-full py-3 bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[3px] border-[#b45309] rounded-2xl text-white font-black text-base shadow-[0_4px_0_#92400e] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                style={{ WebkitTextStroke: '0.5px #b45309' }}
              >
                <Gift className="w-4 h-4 text-white" />
                Claim +500 Free Coins
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
            setCustomizationVersion((v) => v + 1);
            setProgress({ ...PlayerProgress.get() });
            controller.refreshCoinsFromStorage();
          }}
          onCustomizationChanged={() => {
            setCustomizationVersion((v) => v + 1);
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
