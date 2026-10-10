import React, { useEffect, useRef } from 'react';
import { sounds } from '../utils/soundEffects.ts';

interface JourneyMilestone {
  level: number;
  type: 'reward' | 'place';
  rewardIcon?: string;
  rewardCount?: string;
  placeName?: string;
  img?: string;
  x: number;
  y: number;
}

const JOURNEY_ITEMS: JourneyMilestone[] = [
  { level: 31, type: 'place', placeName: 'New York', img: '/place_downtown.jpg', x: 25, y: 10 },
  { level: 25, type: 'reward', rewardIcon: '🔀', rewardCount: 'x1', x: 75, y: 26 },
  { level: 20, type: 'reward', rewardIcon: '🚁', rewardCount: 'x1', x: 25, y: 42 },
  { level: 15, type: 'reward', rewardIcon: '🪙', rewardCount: '50', x: 75, y: 58 },
  { level: 10, type: 'reward', rewardIcon: '🚙', rewardCount: 'x1', x: 25, y: 74 },
  { level: 1, type: 'place', placeName: 'Airport', img: '/place_airport.jpg', x: 75, y: 90 },
];

interface JourneyViewProps {
  currentLevel: number;
  unlockedLevel: number;
  onSelectLevel: (levelId: number) => void;
  onClose?: () => void;
}

export const JourneyView: React.FC<JourneyViewProps> = ({
  currentLevel,
  unlockedLevel,
  onSelectLevel,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to active level on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const activeItem = JOURNEY_ITEMS.find(i => i.level === currentLevel) || JOURNEY_ITEMS[JOURNEY_ITEMS.length - 1];
        // Calculate scroll offset based on percentage height
        const totalHeight = 1000;
        const yPos = (activeItem.y / 100) * totalHeight;
        const offset = yPos - (container.clientHeight / 2);
        container.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [currentLevel]);

  return (
    <div className="absolute inset-0 bg-[#2DA3FB] z-40 pointer-events-auto flex flex-col pt-0 pb-[76px] overflow-hidden select-none">
      
      {/* HEADER */}
      <div className="flex items-center justify-center border-b-4 border-[#FCD34D] py-3 bg-[#1A3175] w-full z-30 shadow-[0_4px_12px_rgba(0,0,0,0.3)] relative flex-shrink-0">
        <h1
          className="text-[34px] font-black text-[#FCD34D] tracking-wide"
          style={{
            WebkitTextStroke: '1.5px #B45309',
            textShadow: '0 4px 0 #92400E, 0 6px 12px rgba(0,0,0,0.5)',
            fontFamily: "'Comic Sans MS', cursive, sans-serif"
          }}
        >
          Journey
        </h1>
      </div>

      {/* MAP SCROLL AREA */}
      <div
        ref={scrollContainerRef}
        className="relative w-full flex-1 overflow-y-auto overflow-x-hidden px-0"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        <div className="relative w-full h-[1000px] max-w-md mx-auto">
          
          {/* Background Clouds */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[5%] left-[10%] text-6xl text-white opacity-90 drop-shadow-md">☁️</div>
            <div className="absolute top-[20%] right-[15%] text-5xl text-white opacity-85 drop-shadow-md">☁️</div>
            <div className="absolute top-[35%] left-[5%] text-6xl text-white opacity-90 drop-shadow-md">☁️</div>
            <div className="absolute top-[50%] right-[10%] text-7xl text-white opacity-80 drop-shadow-md">☁️</div>
            <div className="absolute top-[70%] left-[15%] text-5xl text-white opacity-95 drop-shadow-md">☁️</div>
            <div className="absolute top-[85%] right-[5%] text-6xl text-white opacity-85 drop-shadow-md">☁️</div>
          </div>

          {/* WINDING PATH (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer Dark Border */}
            <path d="M 75 90 C 75 82, 25 82, 25 74 C 25 66, 75 66, 75 58 C 75 50, 25 50, 25 42 C 25 34, 75 34, 75 26 C 75 18, 25 18, 25 10" 
                  fill="none" stroke="#C2410C" strokeWidth="42" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {/* Inner Yellow/Orange Path */}
            <path d="M 75 90 C 75 82, 25 82, 25 74 C 25 66, 75 66, 75 58 C 75 50, 25 50, 25 42 C 25 34, 75 34, 75 26 C 75 18, 25 18, 25 10" 
                  fill="none" stroke="#F59E0B" strokeWidth="26" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {/* Dashed center line */}
            <path d="M 75 90 C 75 82, 25 82, 25 74 C 25 66, 75 66, 75 58 C 75 50, 25 50, 25 42 C 25 34, 75 34, 75 26 C 75 18, 25 18, 25 10" 
                  fill="none" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 15" vectorEffect="non-scaling-stroke" opacity="0.6" />
          </svg>

          {/* NODES */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {JOURNEY_ITEMS.map((item) => {
              const isCurrent = currentLevel === item.level;
              const isUnlocked = unlockedLevel >= item.level;

              if (item.type === 'place') {
                return (
                  <div
                    key={`place_${item.level}`}
                    className={`absolute flex flex-col items-center justify-center pointer-events-auto transition-transform ${isUnlocked ? 'cursor-pointer active:scale-95' : 'opacity-80 grayscale-[40%]'}`}
                    style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                    onClick={() => { if (isUnlocked) { sounds.playClick(); onSelectLevel(item.level); } }}
                  >
                    {isCurrent && (
                      <div className="absolute -top-[55px] animate-bounce z-30">
                        <span className="text-[46px] drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">📍</span>
                      </div>
                    )}
                    <div className="relative w-[120px] h-[120px] rounded-[24px] border-[5px] border-[#F8FAFC] shadow-[0_8px_20px_rgba(0,0,0,0.5)] overflow-hidden bg-[#8DA5C3]">
                      {item.img && <img src={item.img} className="w-full h-full object-cover opacity-90" alt={item.placeName} />}
                      {/* Level Badge */}
                      <div className="absolute top-2 -left-1 bg-[#E11D48] text-white font-black px-3 py-0.5 rounded-r-[12px] shadow-sm text-[15px] border-[2px] border-white border-l-0 tracking-wide">
                        {item.level}
                      </div>
                      {/* Place Name */}
                      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0F172A] to-transparent pt-6 pb-2 text-white text-center font-black text-[14px] tracking-widest uppercase" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                        {item.placeName}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`reward_${item.level}`}
                  className={`absolute flex flex-col items-center justify-center pointer-events-auto transition-transform ${isUnlocked ? 'cursor-pointer active:scale-95' : 'opacity-80 grayscale-[40%]'}`}
                  style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                  onClick={() => { if (isUnlocked) { sounds.playClick(); onSelectLevel(item.level); } }}
                >
                  {isCurrent && (
                    <div className="absolute -top-[70px] animate-bounce z-30">
                      <span className="text-[46px] drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">📍</span>
                    </div>
                  )}
                  {/* Reward Bubble */}
                  <div className="absolute bottom-[28px] bg-white rounded-[14px] px-3 py-1.5 flex items-center justify-center gap-1.5 shadow-[0_6px_12px_rgba(0,0,0,0.25)] border-[3px] border-[#E2E8F0] whitespace-nowrap z-20">
                    <span className="text-[22px] filter drop-shadow-sm leading-none pt-0.5">{item.rewardIcon}</span>
                    <span className="font-black text-[#1E293B] text-[16px] tracking-wide">{item.rewardCount}</span>
                    {/* Down Arrow */}
                    <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#E2E8F0] drop-shadow-sm" />
                    <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-white z-10" />
                  </div>

                  {/* The Node Dot */}
                  <div className="w-[30px] h-[30px] rounded-full bg-[#FFD700] border-[5px] border-[#92400E] shadow-[0_3px_8px_rgba(0,0,0,0.4)] flex items-center justify-center z-10 relative">
                    {/* Optional inner dot for locked vs unlocked */}
                    {!isUnlocked && <div className="w-2 h-2 rounded-full bg-[#78350F]" />}
                    {isUnlocked && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>
      </div>
    </div>
  );
};

