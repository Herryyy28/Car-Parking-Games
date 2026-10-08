import React, { useState, useEffect } from 'react';
import {
  Gift,
  Coins,
  Sparkles,
  CheckCircle2,
  Lock,
  Clock,
  X,
  Plane,
  Shuffle,
  Magnet,
  Flame,
  RotateCcw
} from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';

export interface DailyRewardDay {
  day: number;
  coins: number;
  bonus?: 'shuffle' | 'magnet' | 'airlift';
  bonusLabel?: string;
}

export const DAILY_REWARDS: DailyRewardDay[] = [
  { day: 1, coins: 500 },
  { day: 2, coins: 750 },
  { day: 3, coins: 1000, bonus: 'shuffle', bonusLabel: '+1 Shuffle' },
  { day: 4, coins: 1500 },
  { day: 5, coins: 2000, bonus: 'magnet', bonusLabel: '+1 Magnet' },
  { day: 6, coins: 2500 },
  { day: 7, coins: 5000, bonus: 'airlift', bonusLabel: '+1 VIP Air Lift' },
];

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDay: number; // 1 to 7
  lastClaimedTimestamp: number; // Date.now() timestamp
  onClaim: (reward: DailyRewardDay) => void;
  onResetCooldownForTesting: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  isOpen,
  onClose,
  streakDay,
  lastClaimedTimestamp,
  onClaim,
  onResetCooldownForTesting,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isReady: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isReady: true,
  });
  const [claimedAnimation, setClaimedAnimation] = useState(false);

  // 24 hour cooldown duration in ms
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - lastClaimedTimestamp;
      const remaining = COOLDOWN_MS - elapsed;

      if (remaining <= 0 || lastClaimedTimestamp === 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isReady: true });
      } else {
        const totalSec = Math.floor(remaining / 1000);
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        setTimeLeft({ hours, minutes, seconds, isReady: false });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastClaimedTimestamp]);

  if (!isOpen) return null;

  const currentReward = DAILY_REWARDS[(streakDay - 1) % DAILY_REWARDS.length];

  const handleClaimClick = () => {
    if (!timeLeft.isReady) return;
    sounds.playWin();
    setClaimedAnimation(true);
    setTimeout(() => {
      setClaimedAnimation(false);
      onClaim(currentReward);
    }, 1200);
  };

  const format2Digits = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md game-modal-3d rounded-[36px] border-4 border-amber-400/90 shadow-2xl p-5 text-white overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/20 blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl game-btn game-btn-dark flex items-center justify-center text-slate-300 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="relative w-16 h-16 mx-auto mb-2 flex items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-yellow-200 animate-float-3d">
              <Gift className="w-9 h-9 text-slate-950 animate-bounce" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-amber-300 animate-spin" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
            DAILY REWARD
          </h2>
          <p className="text-xs font-semibold text-slate-300 mt-0.5">
            Claim free coins & boosters every 24 hours to keep your streak alive!
          </p>
        </div>

        {/* 7-Day Rewards Grid Track */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {DAILY_REWARDS.map((item, idx) => {
            const isCompleted = item.day < streakDay;
            const isCurrent = item.day === streakDay;
            const isLocked = item.day > streakDay;
            const isMegaDay = item.day === 7;

            return (
              <div
                key={item.day}
                className={`relative rounded-2xl p-2 flex flex-col items-center justify-between text-center transition-all ${
                  isMegaDay ? 'col-span-2' : 'col-span-1'
                } ${
                  isCurrent
                    ? 'bg-gradient-to-b from-amber-500/30 to-yellow-500/15 border-2 border-amber-400 shadow-md shadow-amber-500/30 scale-102 ring-2 ring-amber-400/40'
                    : isCompleted
                    ? 'bg-slate-950/60 border border-emerald-500/60 opacity-80'
                    : 'bg-slate-950/40 border border-slate-800 opacity-60'
                }`}
              >
                {/* Day Header Badge */}
                <div className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 mb-1">
                  <span>Day {item.day}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isLocked ? (
                    <Lock className="w-3 h-3 text-slate-500" />
                  ) : (
                    <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  )}
                </div>

                {/* Reward Graphic */}
                <div className="my-1 flex items-center justify-center">
                  {item.bonus === 'airlift' ? (
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-red-400 -rotate-45" />
                    </div>
                  ) : item.bonus === 'magnet' ? (
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
                      <Magnet className="w-4 h-4 text-purple-400" />
                    </div>
                  ) : item.bonus === 'shuffle' ? (
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
                      <Shuffle className="w-4 h-4 text-blue-400" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                      <Coins className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </div>

                {/* Value Amount */}
                <div className="text-[11px] font-black text-amber-300">
                  +{item.coins.toLocaleString()}
                </div>

                {item.bonusLabel && (
                  <div className="text-[9px] font-extrabold text-sky-300 leading-tight">
                    {item.bonusLabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Claim / Cooldown Action Zone */}
        <div className="flex flex-col gap-2">
          {timeLeft.isReady ? (
            <button
              onClick={handleClaimClick}
              disabled={claimedAnimation}
              className="w-full py-4 rounded-2xl game-btn game-btn-amber shine-sweep text-slate-950 font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2"
            >
              <Gift className="w-5 h-5" />
              <span>
                {claimedAnimation ? 'REWARD CLAIMED! 🎉' : `CLAIM DAY ${streakDay} REWARD (+${currentReward.coins} COINS)`}
              </span>
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Next Reward Available In:</span>
              </div>
              <div className="font-mono font-black text-xl text-amber-300 tracking-wider">
                {format2Digits(timeLeft.hours)}:{format2Digits(timeLeft.minutes)}:{format2Digits(timeLeft.seconds)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Streak: Day {streakDay} • Come back when the 24h timer expires!
              </span>
            </div>
          )}

          {/* Testing helper to easily reset cooldown */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>24h Cooldown Active</span>
            <button
              onClick={onResetCooldownForTesting}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-300 underline transition-colors"
              title="Reset 24h timer to test claiming"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Test: Reset Timer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
