import React, { useEffect, useRef } from 'react';
import { sounds } from '../utils/soundEffects.ts';

interface JourneyMilestone {
  level: number;
  type: 'reward' | 'place';
  rewardIcon?: string;
  rewardCount?: string;
  placeName?: string;
  placeSubtitle?: string;
  placeIcon?: string;
  placeImage?: string;
  placeBgGradient?: string;
}

const JOURNEY_ITEMS: JourneyMilestone[] = [
  // Top World 10: Galaxy Spaceport (Level 200)
  {
    level: 200,
    type: 'place',
    placeName: 'Galaxy Spaceport',
    placeSubtitle: 'Orbit Launchpads & Observatories',
    placeIcon: '🚀',
    placeBgGradient: 'from-violet-900 via-indigo-900 to-black',
  },
  { level: 195, type: 'reward', rewardIcon: '🪙', rewardCount: '1 500' },
  { level: 190, type: 'reward', rewardIcon: '🚁', rewardCount: 'x5' },
  { level: 185, type: 'reward', rewardIcon: '🚙', rewardCount: 'x5' },
  { level: 180, type: 'reward', rewardIcon: '🪙', rewardCount: '1 200' },

  // World 9: Historic Clocktower (Level 175)
  {
    level: 175,
    type: 'place',
    placeName: 'Old Town Clocktower',
    placeSubtitle: 'Cobblestone Avenues & Historic Spires',
    placeIcon: '🏛️',
    placeBgGradient: 'from-amber-700 via-yellow-800 to-stone-900',
  },
  { level: 170, type: 'reward', rewardIcon: '🟢', rewardCount: 'x4' },
  { level: 165, type: 'reward', rewardIcon: '🚁', rewardCount: 'x4' },
  { level: 160, type: 'reward', rewardIcon: '🪙', rewardCount: '1 000' },
  { level: 155, type: 'reward', rewardIcon: '🚙', rewardCount: 'x4' },

  // World 8: Sunset Valley (Level 150)
  {
    level: 150,
    type: 'place',
    placeName: 'Sunset Valley',
    placeSubtitle: 'Golden Dunes & Oasis Palaces',
    placeIcon: '🌄',
    placeBgGradient: 'from-orange-600 via-rose-600 to-purple-900',
  },
  { level: 145, type: 'reward', rewardIcon: '🪙', rewardCount: '800' },
  { level: 140, type: 'reward', rewardIcon: '🚁', rewardCount: 'x3' },
  { level: 135, type: 'reward', rewardIcon: '🚙', rewardCount: 'x3' },
  { level: 130, type: 'reward', rewardIcon: '🟢', rewardCount: 'x3' },

  // World 7: Alpine Ski Resort (Level 125)
  {
    level: 125,
    type: 'place',
    placeName: 'Alpine Ski Resort',
    placeSubtitle: 'Snowy Peaks & Cableway Stations',
    placeIcon: '🏔️',
    placeBgGradient: 'from-sky-300 via-blue-500 to-indigo-800',
  },
  { level: 120, type: 'reward', rewardIcon: '🪙', rewardCount: '700' },
  { level: 115, type: 'reward', rewardIcon: '🚁', rewardCount: 'x3' },
  { level: 110, type: 'reward', rewardIcon: '🚙', rewardCount: 'x3' },
  { level: 105, type: 'reward', rewardIcon: '🪙', rewardCount: '600' },

  // World 6: Skyline Metropolis (Level 100)
  {
    level: 100,
    type: 'place',
    placeName: 'Skyline Metropolis',
    placeSubtitle: 'Neon Skyscrapers & Highrises',
    placeIcon: '🏙️',
    placeBgGradient: 'from-indigo-600 via-purple-600 to-pink-600',
  },
  { level: 95, type: 'reward', rewardIcon: '🪙', rewardCount: '500' },
  { level: 90, type: 'reward', rewardIcon: '🚁', rewardCount: 'x3' },
  { level: 85, type: 'reward', rewardIcon: '🚙', rewardCount: 'x3' },

  // World 5: Wonderland Theme Park (Level 80)
  {
    level: 80,
    type: 'place',
    placeName: 'Wonderland Theme Park',
    placeSubtitle: 'Ferris Wheel & Carnival Plaza',
    placeIcon: '🎡',
    placeImage: '/place_amusement_park.jpg',
    placeBgGradient: 'from-pink-500 via-rose-500 to-amber-500',
  },
  { level: 75, type: 'reward', rewardIcon: '🪙', rewardCount: '350' },
  { level: 70, type: 'reward', rewardIcon: '🟢', rewardCount: 'x2' },
  { level: 65, type: 'reward', rewardIcon: '🚁', rewardCount: 'x2' },

  // World 4: Palm Beach Harbor (Level 60)
  {
    level: 60,
    type: 'place',
    placeName: 'Palm Beach Harbor',
    placeSubtitle: 'Sunny Marina & Yacht Boardwalk',
    placeIcon: '🏖️',
    placeImage: '/place_harbor.jpg',
    placeBgGradient: 'from-cyan-500 via-teal-500 to-amber-400',
  },
  { level: 55, type: 'reward', rewardIcon: '🚙', rewardCount: 'x2' },
  { level: 50, type: 'reward', rewardIcon: '🪙', rewardCount: '250' },
  { level: 45, type: 'reward', rewardIcon: '🚁', rewardCount: 'x2' },

  // World 3: Downtown Plaza (Level 40)
  {
    level: 40,
    type: 'place',
    placeName: 'Downtown Plaza',
    placeSubtitle: 'Bustling Avenues & Shopping Hub',
    placeIcon: '🏬',
    placeImage: '/place_downtown.jpg',
    placeBgGradient: 'from-purple-600 via-pink-500 to-rose-500',
  },
  { level: 35, type: 'reward', rewardIcon: '🚙', rewardCount: 'x2' },
  { level: 30, type: 'reward', rewardIcon: '🪙', rewardCount: '150' },
  { level: 25, type: 'reward', rewardIcon: '🟢', rewardCount: 'x1' },

  // World 2: Transit Terminal (Level 20)
  {
    level: 20,
    type: 'place',
    placeName: 'Transit Terminal',
    placeSubtitle: 'Metro Concourse & High-Speed Rails',
    placeIcon: '🚊',
    placeImage: '/place_train_station.jpg',
    placeBgGradient: 'from-blue-600 via-indigo-600 to-cyan-500',
  },
  { level: 15, type: 'reward', rewardIcon: '🪙', rewardCount: '50' },
  { level: 10, type: 'reward', rewardIcon: '🚙', rewardCount: 'x1' },
  { level: 5, type: 'reward', rewardIcon: '🪙', rewardCount: '25' },

  // World 1: Airport (Level 1)
  {
    level: 1,
    type: 'place',
    placeName: 'Airport',
    placeSubtitle: 'Sunny Terminals & Parking Bays',
    placeIcon: '✈️',
    placeImage: '/place_airport.jpg',
    placeBgGradient: 'from-sky-500 via-blue-600 to-indigo-700',
  },
];

interface JourneyViewProps {
  currentLevel: number;
  unlockedLevel: number;
  onSelectLevel: (levelId: number) => void;
}

export const JourneyView: React.FC<JourneyViewProps> = ({
  currentLevel,
  unlockedLevel,
  onSelectLevel,
}) => {
  const currentLevelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const roadTrackRef = useRef<HTMLDivElement>(null);

  // Smoothly center the player's current active level on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentLevelRef.current && scrollContainerRef.current) {
        const target = currentLevelRef.current;
        const container = scrollContainerRef.current;
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate smooth scroll offset
        const offset = targetRect.top - containerRect.top - (containerRect.height / 2) + (targetRect.height / 2);
        container.scrollBy({ top: offset, behavior: 'smooth' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [currentLevel]);

  // Jump to active level helper
  const scrollToCurrentLevel = () => {
    sounds.playClick();
    if (currentLevelRef.current && scrollContainerRef.current) {
      const target = currentLevelRef.current;
      const container = scrollContainerRef.current;
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top - (containerRect.height / 2) + (targetRect.height / 2);
      container.scrollBy({ top: offset, behavior: 'smooth' });
    }
  };

  // Jump to top of map helper
  const scrollToTop = () => {
    sounds.playClick();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Find closest item to current level for car rendering
  const activeItemIndex = JOURNEY_ITEMS.findIndex((item) => currentLevel >= item.level);
  const activeLevelItem = JOURNEY_ITEMS[activeItemIndex >= 0 ? activeItemIndex : JOURNEY_ITEMS.length - 1];

  return (
    <div className="absolute inset-0 bg-[#2884F8] z-40 pointer-events-auto flex flex-col pt-0 pb-[90px] overflow-hidden select-none">
      
      {/* ========================================================
          1. TOP FIXED HEADER: 3D GOLDEN "JOURNEY" TITLE (MATCHING SCREENSHOT)
         ======================================================== */}
      <div className="flex items-center justify-center border-b-2 border-yellow-400 py-3 bg-[#1A2C68] w-full z-30 shadow-lg relative flex-shrink-0">
        <h1
          className="text-3xl font-black text-[#FEE034] tracking-wide"
          style={{
            WebkitTextStroke: '1.5px #8B4513',
            textShadow: '0 3px 0 #78350F, 0 5px 8px rgba(0,0,0,0.4)',
          }}
        >
          Journey
        </h1>
      </div>

      {/* ========================================================
          2. SCROLLABLE GAME WORLD MAP
         ======================================================== */}
      <div
        ref={scrollContainerRef}
        className="relative w-full flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-28 px-2 sm:px-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {/* Background Island & Landscape Illustrations (Matching Reference Screenshot) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Top-Right Island Hill */}
          <div className="absolute -top-12 -right-16 w-56 h-56 rounded-full bg-[#38A137] border-8 border-[#277A28] opacity-80 shadow-2xl" />
          <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-[#48C726] opacity-70" />

          {/* Side Island Hills along the route */}
          <div className="absolute top-[28%] -right-20 w-64 h-64 rounded-full bg-[#38A137] border-8 border-[#277A28] opacity-70" />
          <div className="absolute top-[52%] -left-20 w-60 h-60 rounded-full bg-[#38A137] border-8 border-[#277A28] opacity-65" />
          <div className="absolute top-[75%] -right-24 w-72 h-72 rounded-full bg-[#38A137] border-8 border-[#277A28] opacity-75" />

          {/* Cartoon Clouds */}
          <div className="absolute top-12 left-6 text-3xl opacity-80 filter drop-shadow">☁️</div>
          <div className="absolute top-[35%] right-8 text-4xl opacity-75 filter drop-shadow">☁️</div>
          <div className="absolute top-[65%] left-12 text-4xl opacity-80 filter drop-shadow">☁️</div>
          <div className="absolute top-[88%] right-10 text-3xl opacity-70 filter drop-shadow">☁️</div>
        </div>

        {/* Content Wrap: Max width mobile column */}
        <div className="relative max-w-sm mx-auto z-10 flex">
          
          {/* ========================================================
              CONTINUOUS ROAD TRACK (LEFT COLUMN)
             ======================================================== */}
          <div
            ref={roadTrackRef}
            className="w-13 sm:w-16 bg-[#16254A] rounded-2xl border-4 border-[#0F1B38] shadow-2xl relative flex-shrink-0 flex flex-col items-center ml-1"
          >
            {/* Dashed White Center Line */}
            <div className="absolute inset-y-0 w-1 border-r-2 border-dashed border-white/70 left-1/2 -translate-x-1/2 z-1" />

            {/* Neon Green Completed Road Fill (Fills from bottom to active level) */}
            <div
              className="absolute bottom-0 inset-x-0 bg-[#35C834] border-t-4 border-[#1E8A1E] z-2 transition-all duration-700 shadow-[0_0_15px_#35C834]"
              style={{
                // Calculate height based on active item index
                height: `${Math.max(
                  5,
                  Math.min(
                    100,
                    ((JOURNEY_ITEMS.length - 1 - (activeItemIndex >= 0 ? activeItemIndex : JOURNEY_ITEMS.length - 1)) /
                      (JOURNEY_ITEMS.length - 1)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>

          {/* ========================================================
              RIGHT CONTENT COLUMN: MILESTONES & WORLD POSTCARDS
             ======================================================== */}
          <div className="flex-1 flex flex-col gap-6 ml-3 sm:ml-4 pb-16">
            
            {/* Top Summit Button (Matching Screenshot "Top" Pill) */}
            <div className="flex justify-center -mb-2">
              <button
                onClick={scrollToTop}
                className="bg-[#1E3A8A] border-2 border-[#FBBF24] rounded-lg px-6 py-1 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                Top
              </button>
            </div>

            {/* List of Milestones & Places in descending order (Level 200 at top down to Level 1 at bottom) */}
            {JOURNEY_ITEMS.map((item) => {
              const isCurrent = activeLevelItem.level === item.level;
              const isUnlocked = unlockedLevel >= item.level;
              const isCompleted = currentLevel > item.level;

              // Place Postcard (Landmarks like Airport, Train Station, Downtown, etc.)
              if (item.type === 'place') {
                return (
                  <div
                    key={`place_${item.level}`}
                    ref={isCurrent ? currentLevelRef : undefined}
                    onClick={() => {
                      if (isUnlocked) {
                        sounds.playClick();
                        onSelectLevel(item.level);
                      }
                    }}
                    className={`relative cursor-pointer transition-transform active:scale-98 ${
                      !isUnlocked ? 'opacity-85' : ''
                    }`}
                  >
                    {/* Top-Left Banner Tab: "[🏠 ✓]" or "[🔒 Level X]" (Matching Screenshot) */}
                    <div className="flex items-center gap-1.5 -mb-1 relative z-20 pl-2">
                      {isCompleted || isCurrent ? (
                        <div className="bg-[#35C834] border-2 border-white/80 rounded-t-lg px-2.5 py-0.5 flex items-center gap-1 shadow-sm">
                          <span className="text-[11px]">🏠</span>
                          <span className="text-white text-xs font-black">✓</span>
                        </div>
                      ) : (
                        <div className="bg-slate-700 border border-slate-600 rounded-t-lg px-2.5 py-0.5 flex items-center gap-1 shadow-sm">
                          <span className="text-slate-200 text-[10px] font-bold">🔒 Level {item.level}</span>
                        </div>
                      )}
                    </div>

                    {/* Left Speech-Bubble Pointer towards the Road */}
                    <div
                      className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[9px] border-y-transparent border-r-[11px] border-r-[#FFF1D0] z-20"
                      style={{ filter: 'drop-shadow(-2px 0 0 #B07B46)' }}
                    />

                    {/* Postcard Container (Matching Image 3: White/Cream Box with Brown/Gold Border) */}
                    <div className={`bg-[#FFF1D0] border-4 rounded-2xl p-2.5 shadow-xl relative z-10 text-center ${
                      isCurrent
                        ? 'border-yellow-400 ring-4 ring-yellow-400/50 shadow-yellow-400/30'
                        : 'border-[#B07B46]'
                    }`}>
                      {/* Red Pushpin in Top-Right Corner (Matching Screenshot) */}
                      <div className="absolute -top-3.5 -right-2 text-2xl z-30 filter drop-shadow">
                        📍
                      </div>

                      {/* Photo / Artwork Canvas */}
                      <div
                        className={`w-full h-32 sm:h-36 rounded-xl mb-2 overflow-hidden relative border-2 border-amber-300 shadow-inner flex items-center justify-center bg-gradient-to-br ${item.placeBgGradient}`}
                        style={
                          item.placeImage
                            ? {
                                backgroundImage: `url('${item.placeImage}')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }
                            : undefined
                        }
                      >
                        <div className="absolute inset-0 bg-black/20" />
                        
                        {/* Fallback Icon if image not loaded or for high levels */}
                        {!item.placeImage && (
                          <div className="relative z-10 flex flex-col items-center">
                            <span className="text-4xl filter drop-shadow mb-1">
                              {item.placeIcon}
                            </span>
                            <div className="bg-black/60 backdrop-blur-sm px-4 py-0.5 rounded-full text-white font-black text-xs tracking-widest border border-white/40 uppercase">
                              {item.placeName}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Caption Box (Matching Screenshot: Bold Dark Title & "Level 1" Subtitle) */}
                      <div className="text-[#1E3A8A] font-black text-base sm:text-lg leading-tight tracking-wide">
                        {item.placeName}
                      </div>
                      <div className="text-[#475569] font-bold text-xs mt-0.5">
                        Level {item.level}
                      </div>
                    </div>

                    {/* ========================================================
                        CURRENT LEVEL MARKER ON ROAD: RED CAR + "3" CIRCLE BADGE
                       ======================================================== */}
                    {isCurrent && (
                      <div className="absolute -left-[64px] sm:-left-[76px] top-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center">
                        {/* 1. Circular Badge with Arrow Pointing at Car */}
                        <div className="relative flex items-center">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFFBEB] border-[3px] border-[#92400E] flex items-center justify-center shadow-2xl relative z-10">
                            <span className="text-[#78350F] font-black text-sm sm:text-base leading-none">
                              {currentLevel}
                            </span>
                          </div>
                          {/* Triangle Arrow Tab pointing right towards the road */}
                          <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-[#FFFBEB] -ml-0.5 z-10" />
                        </div>

                        {/* 2. Red Car sitting on the Road (Matching Screenshot) */}
                        <div className="w-8 h-10 sm:w-9 sm:h-11 ml-1 bg-red-600 rounded-md border-2 border-red-800 shadow-xl flex flex-col items-center justify-between py-1 relative z-20 animate-pulse">
                          {/* Front Windshield */}
                          <div className="w-6 h-2.5 bg-sky-300 rounded-sm border border-sky-400" />
                          {/* Headlights */}
                          <div className="w-full flex justify-between px-1">
                            <div className="w-1.5 h-1 bg-yellow-300 rounded-full" />
                            <div className="w-1.5 h-1 bg-yellow-300 rounded-full" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Milestone Reward Card (Level 20, 15, 10, etc. - Matching Screenshot)
              return (
                <div
                  key={`reward_${item.level}`}
                  ref={isCurrent ? currentLevelRef : undefined}
                  onClick={() => {
                    if (isUnlocked) {
                      sounds.playClick();
                      onSelectLevel(item.level);
                    }
                  }}
                  className={`relative flex items-center cursor-pointer transition-transform active:scale-98 ${
                    !isUnlocked ? 'opacity-75' : ''
                  }`}
                >
                  {/* Left Speech-Bubble Pointer towards the Road */}
                  <div
                    className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-r-[10px] border-r-[#FFF1D0] z-20"
                    style={{ filter: 'drop-shadow(-2px 0 0 #B07B46)' }}
                  />

                  {/* Milestone Card Container */}
                  <div
                    className={`w-full bg-[#FFF1D0] border-4 rounded-2xl p-2.5 px-4 flex items-center justify-between shadow-lg relative z-10 ${
                      isCurrent
                        ? 'border-yellow-400 ring-4 ring-yellow-400/50 shadow-yellow-400/30'
                        : 'border-[#B07B46]'
                    }`}
                  >
                    {/* Left: Level Number + "Level" Text */}
                    <div className="flex flex-col items-center min-w-[46px]">
                      <span className="text-xl sm:text-2xl font-black text-[#1E3A8A] leading-tight">
                        {item.level}
                      </span>
                      <span className="text-[11px] font-bold text-[#1E3A8A]">Level</span>
                    </div>

                    {/* Vertical Dashed Divider */}
                    <div className="w-px h-8 border-r-2 border-dashed border-amber-300/80 mx-2" />

                    {/* Right: Reward Icon + Quantity */}
                    <div className="flex items-center gap-2 pr-1">
                      <span className="text-3xl filter drop-shadow">{item.rewardIcon}</span>
                      <span
                        className="text-[#8B4513] font-black text-lg sm:text-xl"
                        style={{ WebkitTextStroke: '0.5px white' }}
                      >
                        {item.rewardCount}
                      </span>
                    </div>

                    {/* Completed Checkmark Stamp */}
                    {isCompleted && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#35C834] border-2 border-white rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-black">✓</span>
                      </div>
                    )}
                  </div>

                  {/* ========================================================
                      CURRENT LEVEL MARKER ON ROAD: RED CAR + "3" CIRCLE BADGE
                     ======================================================== */}
                  {isCurrent && (
                    <div className="absolute -left-[64px] sm:-left-[76px] top-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center">
                      {/* 1. Circular Badge with Arrow Pointing at Car */}
                      <div className="relative flex items-center">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFFBEB] border-[3px] border-[#92400E] flex items-center justify-center shadow-2xl relative z-10">
                          <span className="text-[#78350F] font-black text-sm sm:text-base leading-none">
                            {currentLevel}
                          </span>
                        </div>
                        {/* Triangle Arrow Tab */}
                        <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-[#FFFBEB] -ml-0.5 z-10" />
                      </div>

                      {/* 2. Red Car sitting on the Road */}
                      <div className="w-8 h-10 sm:w-9 sm:h-11 ml-1 bg-red-600 rounded-md border-2 border-red-800 shadow-xl flex flex-col items-center justify-between py-1 relative z-20 animate-pulse">
                        <div className="w-6 h-2.5 bg-sky-300 rounded-sm border border-sky-400" />
                        <div className="w-full flex justify-between px-1">
                          <div className="w-1.5 h-1 bg-yellow-300 rounded-full" />
                          <div className="w-1.5 h-1 bg-yellow-300 rounded-full" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Quick Action Button: "📍 Level {currentLevel}" to Jump Instantly to Current Road Position */}
        <button
          onClick={scrollToCurrentLevel}
          className="fixed bottom-24 right-4 z-40 bg-[#1E3A8A] border-2 border-[#FBBF24] text-white px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <span className="text-sm">📍</span>
          <span className="font-black text-xs tracking-wide text-[#FBBF24]">Level {currentLevel}</span>
        </button>
      </div>
    </div>
  );
};
