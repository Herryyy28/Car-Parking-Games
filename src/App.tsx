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
  Lightbulb
} from 'lucide-react';
import { BusMadnessArena } from './components/BusMadnessArena.tsx';
import { DailyRewardModal, DailyRewardDay } from './components/DailyRewardModal.tsx';
import { GameController } from './logic/gameController.ts';
import { GameState, GameStatus, COLOR_MAP } from './logic/types.ts';
import { LevelRepository } from './logic/levelRepository.ts';
import { PlayerProgress } from './logic/playerProgress.ts';
import { sounds } from './utils/soundEffects.ts';

type ScreenMode = 'HOME' | 'LEVEL_SELECT' | 'GAME';

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('GAME');
  const [controller] = useState<GameController>(() => new GameController(1));
  const [gameState, setGameState] = useState<GameState>(() => controller.getState());
  const arenaContainerRef = useRef<HTMLDivElement>(null);

  // Player progress & settings
  const [progress, setProgress] = useState(() => PlayerProgress.get());
  const [soundOn, setSoundOn] = useState(() => progress.soundEnabled);
  const [deviceFrame, setDeviceFrame] = useState<'mobile' | 'studio'>('mobile');

  // Modals
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showGridlockModal, setShowGridlockModal] = useState(false);
  const [showOutOfMovesModal, setShowOutOfMovesModal] = useState(false);
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
          gameState.parMoves
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

  const handleLevelSelect = (levelId: number) => {
    sounds.playClick();
    controller.loadLevel(levelId);
    setVictoryData(null);
    setShowGridlockModal(false);
    setShowOutOfMovesModal(false);
    setScreen('GAME');
  };

  const allLevels = LevelRepository.getAllLevels();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Universal App Header */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {screen !== 'HOME' && (
              <button
                onClick={() => {
                  sounds.playClick();
                  setScreen('HOME');
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                title="Back to Home"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-md flex items-center justify-center">
              <span className="text-lg">🦆</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm sm:text-base tracking-wide">BUS GAME 3D</span>
                <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                  Offline Mode
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Daily Gift */}
            <button
              onClick={() => {
                sounds.playClick();
                setShowDailyModal(true);
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-md active:scale-95 transition-all ${
                isDailyReady
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 animate-pulse border border-yellow-200'
                  : 'bg-slate-800 text-amber-300 border border-slate-700'
              }`}
            >
              <Gift className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span className="hidden sm:inline">{isDailyReady ? 'Daily Gift (Ready!)' : 'Daily Gift'}</span>
              <span className="sm:hidden">Gift</span>
            </button>

            {/* Coins Counter & Shop */}
            <button
              onClick={() => setShowShopModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-black text-amber-300 active:scale-95 transition-all"
            >
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{gameState.coins.toLocaleString()}</span>
              <span className="text-amber-400 text-[10px] bg-amber-400/20 px-1 rounded-full">+</span>
            </button>

            {/* Level Select Icon */}
            <button
              onClick={() => {
                sounds.playClick();
                setScreen(screen === 'LEVEL_SELECT' ? 'GAME' : 'LEVEL_SELECT');
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                screen === 'LEVEL_SELECT' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Level Select"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Frame View Toggle */}
            <div className="hidden md:flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setDeviceFrame('mobile')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  deviceFrame === 'mobile' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'
                }`}
              >
                Mobile View
              </button>
              <button
                onClick={() => setDeviceFrame('studio')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  deviceFrame === 'studio' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'
                }`}
              >
                Full Canvas
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                setSoundOn(!soundOn);
                sounds.playClick();
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
              title="Toggle Audio"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* Screen Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col items-center justify-center">
        {/* ========================================================
            SCREEN 1: HOME SCREEN
           ======================================================== */}
        {screen === 'HOME' && (
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-xl border-2 border-white/20">
              <span className="text-4xl">🚌</span>
            </div>

            <h1 className="text-3xl font-black text-white tracking-wide mb-1">BUS GAME 3D</h1>
            <p className="text-xs font-bold text-slate-400 mb-6">Traffic Parking & Passenger Sort Puzzle</p>

            <div className="w-full space-y-3 mb-6">
              <button
                onClick={() => handleLevelSelect(gameState.levelId)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:brightness-110 text-white font-black text-base shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>CONTINUE LEVEL {gameState.levelId}</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setScreen('LEVEL_SELECT');
                }}
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Grid className="w-4 h-4 text-blue-400" />
                <span>SELECT LEVEL</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setShowDailyModal(true);
                }}
                className="w-full py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-amber-400/30 transition-colors"
              >
                <Gift className="w-4 h-4 text-amber-400" />
                <span>DAILY REWARDS CHEST</span>
              </button>
            </div>

            <div className="w-full bg-slate-950/60 rounded-2xl p-4 flex items-center justify-around border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Unlocked</span>
                <span className="text-lg font-black text-emerald-400">{progress.unlockedLevel} / {allLevels.length}</span>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Stars</span>
                <span className="text-lg font-black text-amber-400 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {Object.values(progress.stars).reduce((a, b) => a + b, 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SCREEN 2: LEVEL SELECT
           ======================================================== */}
        {screen === 'LEVEL_SELECT' && (
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-black text-white">Select Puzzle Level</h2>
              </div>
              <button
                onClick={() => setScreen('GAME')}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {allLevels.map((lvl) => {
                const isUnlocked = lvl.id <= progress.unlockedLevel;
                const stars = progress.stars[lvl.id] || 0;
                const isCurrent = lvl.id === gameState.levelId;

                return (
                  <button
                    key={lvl.id}
                    disabled={!isUnlocked}
                    onClick={() => handleLevelSelect(lvl.id)}
                    className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                      isUnlocked
                        ? isCurrent
                          ? 'bg-blue-600/30 border-2 border-blue-500 shadow-lg text-white hover:bg-blue-600/40'
                          : 'bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200'
                        : 'bg-slate-950/40 border border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-slate-400 uppercase mb-1">
                      Level {lvl.id}
                    </div>
                    <div className="text-sm font-black text-white truncate max-w-[140px] mb-2">
                      {lvl.name}
                    </div>

                    {isUnlocked ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
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
          </div>
        )}

        {/* ========================================================
            SCREEN 3: MAIN 3D BOARD GAME SCREEN
           ======================================================== */}
        {screen === 'GAME' && (
          <div
            className={`w-full transition-all duration-300 ${
              deviceFrame === 'mobile'
                ? 'max-w-[430px] bg-slate-950 p-2.5 rounded-[50px] shadow-2xl border-4 border-slate-800'
                : 'max-w-5xl bg-slate-950 p-3 rounded-3xl shadow-xl border border-slate-800'
            }`}
          >
            <div
              className={`relative w-full overflow-hidden flex flex-col bg-slate-900 ${
                deviceFrame === 'mobile' ? 'rounded-[42px] h-[780px]' : 'rounded-2xl h-[720px]'
              }`}
            >
              {/* TOP TERMINAL HUD */}
              <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-sky-400/90 to-blue-500/90 backdrop-blur-md z-30 flex items-center justify-between text-white shadow-sm border-b border-sky-300/40">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 border-2 border-yellow-300 shadow-md flex items-center gap-1.5">
                    <span className="text-sm font-black text-yellow-300">
                      {gameState.passengers.filter((p) => p.state === 'WAITING').length}
                    </span>
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-tight">Left</span>
                  </div>

                  <div className="text-[11px] font-black text-sky-100 flex items-center gap-1">
                    <span>Lvl {gameState.levelId}: {gameState.levelName}</span>
                    <span>•</span>
                    <span>
                      Bays: {gameState.parkingSlots.filter((s) => s.vehicleId !== null).length}/{gameState.unlockedDocksCount}
                    </span>
                  </div>
                </div>

                {/* Moves & Restart */}
                <div className="flex items-center gap-2">
                  <div
                    className={`px-3 py-1 rounded-full backdrop-blur-xs border text-xs font-black transition-colors ${
                      gameState.moves <= 5
                        ? 'bg-red-500/80 border-red-300 text-white animate-pulse'
                        : 'bg-black/30 border-white/20 text-white'
                    }`}
                  >
                    <span>{gameState.moves} Moves</span>
                  </div>
                  <button
                    onClick={() => controller.loadLevel(gameState.levelId)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    title="Restart Level"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-black shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 ml-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Bay ({gameState.unlockedDocksCount}/6)</span>
                  </button>
                )}
              </div>

              {/* CHUNKY BOOSTERS DOCK */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 z-30 flex items-center justify-around gap-2 text-white">
                {/* Hint Booster */}
                <button
                  onClick={() => controller.useBooster('hint')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  title="Hint: highlights best vehicle move"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-md border-2 border-yellow-300/30 text-slate-950">
                    <Lightbulb className="w-5 h-5 fill-slate-950" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-black flex items-center justify-center border-2 border-slate-950">
                      {gameState.availableBoosters.hint}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">Hint</span>
                </button>

                {/* Shuffle Booster */}
                <button
                  onClick={() => controller.useBooster('shuffle')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  title="Shuffle: rotates vehicles to open escape routes"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md border-2 border-blue-400/30">
                    <Shuffle className="w-5 h-5 text-white" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950">
                      {gameState.availableBoosters.shuffle}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">Shuffle</span>
                </button>

                {/* Passenger Swap / Magnet Booster */}
                <button
                  onClick={() => controller.useBooster('passengerSwap')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  title="Magnet: sorts passengers to match docked buses"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-md border-2 border-purple-400/30">
                    <Magnet className="w-5 h-5 text-white" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950">
                      {gameState.availableBoosters.passengerSwap}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">Magnet</span>
                </button>

                {/* Undo Booster */}
                <button
                  onClick={() => controller.useBooster('undo')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                  title="Undo last vehicle move"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center shadow-md border-2 border-slate-500/30">
                    <Undo2 className="w-5 h-5 text-white" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-slate-950">
                      {gameState.availableBoosters.undo}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">Undo</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-400/30">
                <Trophy className="w-8 h-8 text-amber-950" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">LEVEL COMPLETE!</h2>
              <p className="text-xs font-semibold text-slate-400 mb-4">
                All vehicles escaped & all passengers boarded their seats!
              </p>

              {/* Stars */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-8 h-8 drop-shadow-md ${
                      s <= victoryData.stars
                        ? 'text-amber-400 fill-amber-400 animate-pulse'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Reward stats */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 mb-5 flex items-center justify-around">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Reward</span>
                  <span className="text-base font-black text-amber-300 flex items-center justify-center gap-1">
                    <Coins className="w-4 h-4 text-amber-400" /> +{victoryData.rewardCoins}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Moves Remaining</span>
                  <span className="text-base font-black text-emerald-400">{gameState.moves} Left</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    const nextId = (gameState.levelId % allLevels.length) + 1;
                    handleLevelSelect(nextId);
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>NEXT PUZZLE (LEVEL {(gameState.levelId % allLevels.length) + 1})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setVictoryData(null);
                    setScreen('LEVEL_SELECT');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Choose Level
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. GRIDLOCK MODAL */}
        {showGridlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">BAYS ARE JAMMED!</h2>
              <p className="text-xs text-slate-400 mb-4">
                All waiting bays are occupied, and none match the color of the front passenger in line.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    controller.useBooster('passengerSwap');
                    setShowGridlockModal(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs flex items-center justify-between active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Magnet className="w-4 h-4" />
                    <span>Use Magnet (Sorts Line)</span>
                  </div>
                  <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-black">
                    {gameState.availableBoosters.passengerSwap > 0 ? `${gameState.availableBoosters.passengerSwap} Left` : '90 🪙'}
                  </span>
                </button>

                {gameState.unlockedDocksCount < 6 && (
                  <button
                    onClick={() => {
                      controller.useBooster('extraSpace');
                      setShowGridlockModal(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-between active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      <span>Unlock 1 Extra Bay</span>
                    </div>
                    <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-black">150 🪙</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowGridlockModal(false);
                    controller.loadLevel(gameState.levelId);
                  }}
                  className="w-full py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Restart Level
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. OUT OF MOVES MODAL */}
        {showOutOfMovesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500 rounded-3xl p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">OUT OF MOVES!</h2>
              <p className="text-xs text-slate-400 mb-4">
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
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-between shadow-lg active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    <span>Get +5 Moves</span>
                  </div>
                  <span className="text-[11px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-black">
                    100 🪙
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowOutOfMovesModal(false);
                    controller.loadLevel(gameState.levelId);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. SHOP MODAL */}
        {showShopModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <h3 className="font-black text-white text-base">Booster Supplies</h3>
                </div>
                <button
                  onClick={() => setShowShopModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="p-3 bg-slate-800/80 rounded-2xl flex items-center justify-between">
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
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                  >
                    70 🪙
                  </button>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-2xl flex items-center justify-between">
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
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                  >
                    80 🪙
                  </button>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-2xl flex items-center justify-between">
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
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                  >
                    90 🪙
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playWin();
                  controller.addCoins(500);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-black flex items-center justify-center gap-2 border border-amber-400/30"
              >
                <Gift className="w-4 h-4 text-amber-400" />
                <span>Claim +500 Free Bonus Coins</span>
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
    </div>
  );
}
