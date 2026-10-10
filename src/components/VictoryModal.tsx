import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/soundEffects.ts';

interface VictoryModalProps {
  levelId: number;
  rewardCoins: number;
  totalCoins: number;
  onContinue: () => void;
  onClose: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  levelId,
  rewardCoins,
  totalCoins,
  onContinue,
  onClose,
}) => {
  // Stage 1: Fireworks + BUS MADNESS logo ('SPLASH')
  // Stage 2: Well Done reward card ('REWARD')
  const [stage, setStage] = useState<'SPLASH' | 'REWARD'>('SPLASH');
  const [progressPercent, setProgressPercent] = useState(25);

  // Play win sounds and auto-advance after 2.5s
  useEffect(() => {
    sounds.playWin();

    // Animate the progress bar from 25% to 44% or higher
    const animTimer = setTimeout(() => {
      setProgressPercent(44);
    }, 400);

    const advanceTimer = setTimeout(() => {
      setStage('REWARD');
      sounds.playCoinCollect();
    }, 2400);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(advanceTimer);
    };
  }, []);

  const handleSkipToReward = () => {
    if (stage === 'SPLASH') {
      setStage('REWARD');
      sounds.playCoinCollect();
    }
  };

  return (
    <div
      onClick={stage === 'SPLASH' ? handleSkipToReward : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none p-4"
    >
      {/* ========================================================
          STAGE 1: FIREWORKS & "BUS MADNESS" LOGO (frame_08.jpg)
          ======================================================== */}
      {stage === 'SPLASH' && (
        <div className="relative w-full max-w-sm flex flex-col items-center justify-center animate-in zoom-in-90 duration-300">
          {/* Night Sky Bursting Fireworks */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 pointer-events-none">
            {/* Left Firework Burst */}
            <div className="absolute top-4 left-6 w-32 h-32 animate-spin" style={{ animationDuration: '12s' }}>
              <div className="w-full h-full relative">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <div
                    key={deg}
                    className="absolute top-1/2 left-1/2 w-1.5 h-12 bg-gradient-to-t from-transparent via-amber-300 to-yellow-100 rounded-full origin-bottom"
                    style={{ transform: `rotate(${deg}deg) translateY(-24px)` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full blur-sm animate-ping"></div>
                </div>
              </div>
            </div>

            {/* Right Firework Burst */}
            <div className="absolute top-2 right-4 w-32 h-32 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }}>
              <div className="w-full h-full relative">
                {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg) => (
                  <div
                    key={deg}
                    className="absolute top-1/2 left-1/2 w-1.5 h-12 bg-gradient-to-t from-transparent via-fuchsia-400 to-pink-200 rounded-full origin-bottom"
                    style={{ transform: `rotate(${deg}deg) translateY(-24px)` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-fuchsia-300 rounded-full blur-sm animate-ping"></div>
                </div>
              </div>
            </div>

            {/* Floating Sparkles */}
            <span className="absolute top-10 left-12 text-yellow-300 text-2xl animate-bounce">✨</span>
            <span className="absolute top-8 right-12 text-amber-200 text-3xl animate-pulse">✨</span>
            <span className="absolute top-28 left-20 text-pink-300 text-xl animate-ping">✨</span>
          </div>

          {/* Central 3D BUS JAM 3D Emblem */}
          <div className="relative z-10 flex flex-col items-center mt-6">
            <img 
              src="/game_icon.jpg" 
              alt="Bus Jam 3D Logo" 
              className="w-56 h-56 object-cover rounded-[2rem] shadow-[0_16px_32px_rgba(0,0,0,0.8)] border-4 border-white/20"
            />
          </div>

          {/* New Feature Progress Bar (frame_08.jpg) */}
          <div className="relative z-10 w-64 mt-12 flex flex-col items-center">
            {/* Pill Banner */}
            <div className="bg-[#FFF8E7] border-2 border-amber-800/40 rounded-full px-5 py-0.5 -mb-2 z-20 shadow-md">
              <span className="text-amber-900 font-black text-xs tracking-wide">
                New Feature
              </span>
            </div>

            {/* Outer Progress Pill */}
            <div className="w-full h-8 bg-[#1e293b] border-[3px] border-[#FFF8E7] rounded-full p-0.5 shadow-xl flex items-center relative overflow-visible mt-2">
              {/* Filled Green Progress Track */}
              <div
                className="h-full bg-gradient-to-r from-[#34d399] via-[#10b981] to-[#059669] rounded-full transition-all duration-700 ease-out flex items-center justify-center shadow-inner"
                style={{ width: `${progressPercent}%` }}
              >
                <span className="text-white font-black text-xs drop-shadow px-2">
                  {progressPercent} %
                </span>
              </div>

              {/* Mystery Bus Lock Medal on Right */}
              <div className="absolute -right-3 w-10 h-10 rounded-full bg-[#64748b] border-[3px] border-[#cbd5e1] shadow-lg flex items-center justify-center overflow-hidden">
                <div className="w-6 h-5 bg-[#94a3b8] rounded-md relative flex items-center justify-center border border-[#cbd5e1]">
                  <div className="text-[#334155] font-black text-[10px]">?</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tap anywhere hint */}
          <div className="text-white/70 text-xs font-bold mt-8 animate-pulse tracking-wide">
            Tap anywhere to continue
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 2: "WELL DONE!" REWARD SCREEN (frame_09.jpg)
          ======================================================== */}
      {stage === 'REWARD' && (
        <div className="relative w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-200">
          {/* Top Bar Coin Pill (matching frame_09.jpg) */}
          <div className="absolute -top-14 left-0 flex items-center bg-[#FFF1D0] border-[3px] border-[#B07B46] rounded-full px-3 py-1 h-9 shadow-md">
            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 border-2 border-yellow-100 flex items-center justify-center -ml-3 shadow-sm">
              <span className="text-amber-900 font-black text-xs">G</span>
            </div>
            <span className="text-[#8B4513] font-black ml-2 pr-2 text-base">
              {totalCoins}
            </span>
          </div>

          {/* Royal Blue Card with Gold Border */}
          <div className="w-80 bg-gradient-to-b from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] border-4 border-yellow-400 rounded-[36px] pt-8 pb-6 px-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
            {/* Header Badge: "Level X" */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] border-2 border-yellow-400 rounded-full px-7 py-1 shadow-md">
              <span
                className="text-white font-black text-lg tracking-wide drop-shadow"
                style={{ WebkitTextStroke: '0.8px #172554' }}
              >
                Level {levelId}
              </span>
            </div>

            {/* Red Circular Close Button (Top-Right) */}
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="absolute -right-3 -top-3 w-8 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              title="Close"
            >
              <span className="text-white font-black text-xl leading-none">×</span>
            </button>

            {/* Title: "Well Done!" */}
            <h2
              className="text-4xl font-black text-[#FBBF24] drop-shadow-[0_3px_0_#78350f] mb-1 tracking-wide"
              style={{
                WebkitTextStroke: '1px #78350f',
                textShadow: '0 4px 8px rgba(0,0,0,0.6)',
              }}
            >
              Well Done!
            </h2>

            {/* Subtitle: "Rewards:" */}
            <p className="text-sky-100 font-bold text-sm mb-4 tracking-wider">
              Rewards:
            </p>

            {/* Center Graphic: Golden Pedestal with 3D Coin Stack & "20" */}
            <div className="relative w-44 h-40 mx-auto mb-6 flex flex-col items-center justify-end">
              {/* Radial Magic Glow */}
              <div className="absolute inset-0 bg-amber-400/25 rounded-full blur-2xl animate-pulse"></div>
              <span className="absolute top-2 left-3 text-yellow-300 text-xl animate-bounce">✨</span>
              <span className="absolute top-4 right-3 text-yellow-100 text-2xl animate-pulse">✨</span>

              {/* 3D Stack of Gold Coins */}
              <div className="relative z-10 flex flex-col items-center mb-1">
                <div className="w-20 h-9 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 rounded-full border-2 border-yellow-100 shadow-md flex items-center justify-center transform -translate-y-3">
                  <span className="text-amber-900 font-black text-sm">G</span>
                </div>
                <div className="w-22 h-9 bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 rounded-full border-2 border-yellow-100 shadow-md flex items-center justify-center -mt-6 transform -translate-y-1">
                  <span className="text-amber-900 font-black text-sm">G</span>
                </div>
                <div className="w-24 h-10 bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 rounded-full border-2 border-yellow-100 shadow-md flex items-center justify-center -mt-6">
                  <span className="text-amber-900 font-black text-base">G</span>
                </div>
              </div>

              {/* Golden Pedestal with Velvet Top */}
              <div className="w-36 h-6 bg-gradient-to-b from-[#FBBF24] to-[#B45309] rounded-full border-2 border-yellow-200 shadow-lg relative z-0 flex items-center justify-center">
                <div className="w-32 h-3.5 bg-purple-700 rounded-full border border-purple-900 -mt-1 shadow-inner"></div>
              </div>

              {/* Reward Amount: "+20" */}
              <div
                className="font-black text-white text-4xl drop-shadow-[0_4px_2px_rgba(0,0,0,0.9)] z-20 -mt-3 tracking-wide"
                style={{ WebkitTextStroke: '1.5px #1E3A8A' }}
              >
                {rewardCoins}
              </div>
            </div>

            {/* Action Button: Lime Green "Continue" */}
            <button
              onClick={() => {
                sounds.playClick();
                onContinue();
              }}
              className="w-full py-3.5 bg-gradient-to-b from-[#84cc16] via-[#65a30d] to-[#4d7c0f] border-[3px] border-[#a3e635] rounded-2xl text-white font-black text-2xl shadow-[0_5px_0_#14532d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
              style={{ WebkitTextStroke: '1px #14532d' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
