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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg game-modal-3d border-2 border-amber-400/60 rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header with Title and Close Button */}
        <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 border-b border-amber-400/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner animate-float-3d">
              🚌
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full text-amber-200">
                  Official Guide
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 px-2 py-0.5 rounded-full text-emerald-200">
                  3D Bus Jam
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-sm">
                Bus Game 3D
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-10 h-10 rounded-2xl bg-black/25 hover:bg-black/40 border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
            aria-label="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900/90 border-b border-slate-800 p-1.5 gap-1 shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('HOW_TO_PLAY');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'HOW_TO_PLAY'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>How to Play</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('FEATURES');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'FEATURES'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-slate-200 text-xs sm:text-sm">
          {activeTab === 'HOW_TO_PLAY' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* Introduction Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-400/30">
                <p className="text-amber-200 font-bold leading-relaxed">
                  Clear the chaotic <span className="text-white font-black">Bus Jam</span>, sort passengers to matching seats, and master this brain-burning 3D traffic escape puzzle!
                </p>
              </div>

              {/* Step by Step Cards */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 font-black text-sm flex items-center justify-center shrink-0 border border-amber-400/30">
                    1
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm flex items-center gap-1.5">
                      Tap Vehicles to Move
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                      Tap any unblocked bus or car. Vehicles drive straight in the direction their headlights point.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-400/20 text-sky-300 font-black text-sm flex items-center justify-center shrink-0 border border-sky-400/30">
                    2
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm flex items-center gap-1.5">
                      Space is Tight - Watch Moves!
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                      Every move matters! Avoid parking lot gridlock by thinking 2 to 3 steps ahead before tapping.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-400/30">
                    3
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm flex items-center gap-1.5">
                      Match Passenger Colors
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                      Waiting passengers in queue will only board matching-color vehicles docked at the boarding bays.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-400/20 text-purple-300 font-black text-sm flex items-center justify-center shrink-0 border border-purple-400/30">
                    4
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm flex items-center gap-1.5">
                      Escape the Traffic Maze
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                      When a bus is fully loaded with its color passengers, it zooms off the dock into the highway, freeing the bay for the next vehicle!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FEATURES' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Smart Bus Mechanics</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">
                    Color Jam + Bus Escape + Traffic Jam logic combined into one fluid experience.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Endless Challenges</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">
                    From simple queues to complex mazes across 8 unique themed 3D worlds.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Tactical Boosters</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">
                    Hint, Shuffle, Passenger Magnet, and Undo save you from tight gridlocks.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">ASMR & Relaxing Vibe</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">
                    Satisfying boarding pops, engine zooms, soothing lo-fi radio, and realistic physics.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Play Offline Anytime</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">
                    Zero Wi-Fi or data required. Jump into your next logic puzzle anywhere, anytime.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400 shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Senior-Friendly Design</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">
                    High contrast, bold color stickmen, big touch targets, and accessible fonts for all ages.
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
                    className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setExpandedFaq(isExpanded ? null : index);
                      }}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${faq.badgeColor}`}>
                          {faq.badge}
                        </span>
                        <h4 className="font-bold text-white text-xs sm:text-sm">
                          {faq.q}
                        </h4>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 text-slate-300 text-xs border-t border-slate-800/60 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tactile Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center gap-2.5">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
              if (onPlayNow) onPlayNow();
            }}
            className="flex-1 py-3.5 rounded-2xl game-btn game-btn-emerald shine-sweep text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>PLAY NOW & ESCAPE JAM!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
