import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Car,
  Users,
  Compass,
  Sparkles,
  Zap,
  Volume2,
  WifiOff,
  Heart,
  ChevronDown,
  ChevronUp,
  Brain,
  Play,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';

interface GameGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayNow?: () => void;
}

type GuideTab = 'HOW_TO_PLAY' | 'FEATURES' | 'FAQ';

export const GameGuideModal: React.FC<GameGuideModalProps> = ({
  isOpen,
  onClose,
  onPlayNow,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('HOW_TO_PLAY');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Is this a difficult sorting game?',
      a: 'It starts easy but gets tricky! As you progress, the Bus Jam levels become challenging brain teasers. It acts as a fun IQ test that trains your logic and strategy skills.',
      badge: '🧠 IQ Training',
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    },
    {
      q: 'Can I play this Bus Game offline?',
      a: 'Yes! This is one of the best offline bus games. You can solve traffic puzzles and sort passengers without Wi-Fi or an internet connection. Perfect for travel and daily commutes!',
      badge: '⚡ 100% Offline',
      badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    },
    {
      q: 'Is this puzzle game suitable for seniors?',
      a: 'Absolutely! With big, bold colors, large tap areas, and simple controls, it is a great brain training game for seniors. It helps improve memory and logical thinking in a relaxing, stress-free environment.',
      badge: '🥰 Senior-Friendly',
      badgeColor: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] border-4 border-yellow-400 rounded-[36px] pt-7 pb-5 px-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[90vh]">
        
        {/* Top Header Tab: "Guide" */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] border-2 border-yellow-400 rounded-full px-7 py-1 shadow-md z-10">
          <span 
            className="text-white font-black text-xl tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
            style={{ WebkitTextStroke: '0.8px #172554' }}
          >
            How to Play
          </span>
        </div>

        {/* Red Circular Close Button (Top-Right) */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute -right-3 -top-3 w-8 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform z-10"
          title="Close"
        >
          <span className="text-white font-black text-xl leading-none">×</span>
        </button>

        {/* Tab Navigation */}
        <div className="flex bg-[#1e3a8a]/50 border-2 border-[#1e3a8a] rounded-2xl p-1 gap-1 shrink-0 mt-3 mb-3 shadow-inner">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('HOW_TO_PLAY');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'HOW_TO_PLAY'
                ? 'bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] text-amber-950 shadow-md border-b-2 border-[#b45309]'
                : 'text-sky-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('FEATURES');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'FEATURES'
                ? 'bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] text-amber-950 shadow-md border-b-2 border-[#b45309]'
                : 'text-sky-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Features</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('FAQ');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'FAQ'
                ? 'bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] text-amber-950 shadow-md border-b-2 border-[#b45309]'
                : 'text-sky-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 space-y-3 text-slate-800 text-xs sm:text-sm bg-transparent rounded-2xl custom-scrollbar pr-1">
          {activeTab === 'HOW_TO_PLAY' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Introduction Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-200 to-yellow-100 border-2 border-amber-400 shadow-sm text-center">
                <p className="text-amber-900 font-bold leading-relaxed text-xs">
                  Clear the chaotic <span className="font-black text-amber-700">Bus Jam</span>, sort passengers to matching seats, and master this 3D puzzle!
                </p>
              </div>

              {/* Step by Step Cards */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-3 shadow-sm text-left">
                  <div className="w-8 h-8 rounded-full bg-[#3b82f6] text-white font-black text-sm flex items-center justify-center shrink-0 border-2 border-blue-200 shadow-inner">
                    1
                  </div>
                  <div>
                    <h4 className="font-black text-sky-900 text-[13px] mb-0.5 flex items-center gap-1.5">
                      Tap to Move
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                      Tap any unblocked vehicle. It drives straight in the direction it's facing.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-3 shadow-sm text-left">
                  <div className="w-8 h-8 rounded-full bg-[#f59e0b] text-white font-black text-sm flex items-center justify-center shrink-0 border-2 border-yellow-200 shadow-inner">
                    2
                  </div>
                  <div>
                    <h4 className="font-black text-sky-900 text-[13px] mb-0.5 flex items-center gap-1.5">
                      Space is Tight
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                      Every move matters! Avoid gridlock by thinking 2 to 3 steps ahead.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-3 shadow-sm text-left">
                  <div className="w-8 h-8 rounded-full bg-[#10b981] text-white font-black text-sm flex items-center justify-center shrink-0 border-2 border-green-200 shadow-inner">
                    3
                  </div>
                  <div>
                    <h4 className="font-black text-sky-900 text-[13px] mb-0.5 flex items-center gap-1.5">
                      Match Colors
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                      Waiting passengers only board matching-color vehicles docked at the bays.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-3 shadow-sm text-left">
                  <div className="w-8 h-8 rounded-full bg-[#8b5cf6] text-white font-black text-sm flex items-center justify-center shrink-0 border-2 border-purple-200 shadow-inner">
                    4
                  </div>
                  <div>
                    <h4 className="font-black text-sky-900 text-[13px] mb-0.5 flex items-center gap-1.5">
                      Escape the Jam
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                      When a bus is fully loaded, it zooms off the dock into the highway!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FEATURES' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in duration-150 text-left">
              <div className="p-3 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-2.5 shadow-sm">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600 shrink-0 shadow-inner">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sky-900 text-[11px] mb-0.5">Smart Mechanics</h4>
                  <p className="text-slate-600 text-[10px] leading-tight font-semibold">
                    Color Jam + Bus Escape combined into one experience.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-2.5 shadow-sm">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-500 shrink-0 shadow-inner">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sky-900 text-[11px] mb-0.5">Endless Challenges</h4>
                  <p className="text-slate-600 text-[10px] leading-tight font-semibold">
                    From simple queues to complex mazes across 3D worlds.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-2.5 shadow-sm">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-500 shrink-0 shadow-inner">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sky-900 text-[11px] mb-0.5">Tactical Boosters</h4>
                  <p className="text-slate-600 text-[10px] leading-tight font-semibold">
                    Hint, Shuffle, Passenger Magnet save you from gridlocks.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 flex items-start gap-2.5 shadow-sm">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-500 shrink-0 shadow-inner">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sky-900 text-[11px] mb-0.5">Offline Play</h4>
                  <p className="text-slate-600 text-[10px] leading-tight font-semibold">
                    Zero Wi-Fi required. Jump into your next puzzle anywhere.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FAQ' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {faqs.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl bg-[#FFF8E7] border-2 border-[#D97706]/30 overflow-hidden transition-all shadow-sm"
                  >
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setExpandedFaq(isExpanded ? null : index);
                      }}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-white/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white shadow-inner ${faq.badgeColor}`}>
                          {faq.badge}
                        </span>
                        <h4 className="font-black text-sky-900 text-[13px]">
                          {faq.q}
                        </h4>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 text-slate-600 text-[11px] font-semibold border-t border-amber-900/10 leading-relaxed text-left">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Play Action (Matches Settings Modal button) */}
        <div className="mt-4 pt-1 shrink-0 flex items-center justify-center">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
              if (onPlayNow) onPlayNow();
            }}
            className="w-full py-3 bg-gradient-to-b from-[#84cc16] via-[#65a30d] to-[#4d7c0f] border-[3px] border-[#365314] rounded-2xl text-white font-black text-xl shadow-[0_4px_0_#14532d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
            style={{ WebkitTextStroke: '1px #14532d' }}
          >
            PLAY NOW!
          </button>
        </div>
      </div>
    </div>
  );
};
