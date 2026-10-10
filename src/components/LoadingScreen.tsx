import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth, realistic game asset loading simulation: 0 -> 40 -> 75 -> 90 -> 100%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 45) return prev + Math.floor(Math.random() * 8) + 5;
        if (prev < 85) return prev + Math.floor(Math.random() * 5) + 3;
        if (prev < 90) return prev + 2;
        if (prev < 99) return prev + 3;
        return 100;
      });
    }, 70);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        onComplete();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div 
      onClick={() => onComplete()}
      className="fixed inset-0 z-[100] w-full h-full flex flex-col justify-between items-center select-none overflow-hidden cursor-pointer"
      style={{
        backgroundImage: `url('/splash_bus.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Top Vignette & Subtle Atmospheric Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/25 via-transparent to-black/60 pointer-events-none" />

      {/* TOP HEADER: 3D CARTOON LOGO "BUS MADNESS" (EXACT SAME AS SCREENSHOT 1) */}
      <div className="relative z-10 pt-10 sm:pt-14 flex flex-col items-center animate-bounce-subtle">
        {/* BUS TEXT */}
        <div className="flex items-center justify-center font-black tracking-tight drop-shadow-[0_8px_0_#1e3a8a] filter">
          {/* B - Red */}
          <span 
            className="text-7xl sm:text-8xl text-red-500 transform -rotate-6 inline-block"
            style={{
              WebkitTextStroke: '3.5px #1E3A8A',
              textShadow: '0 6px 0 #b91c1c, 0 10px 0 #1E3A8A, 0 12px 14px rgba(0,0,0,0.6)',
              filter: 'drop-shadow(0 2px 0 #ffffff)'
            }}
          >
            B
          </span>
          {/* U - Yellow / Amber */}
          <span 
            className="text-7xl sm:text-8xl text-amber-400 transform rotate-2 -ml-1 inline-block"
            style={{
              WebkitTextStroke: '3.5px #1E3A8A',
              textShadow: '0 6px 0 #d97706, 0 10px 0 #1E3A8A, 0 12px 14px rgba(0,0,0,0.6)',
              filter: 'drop-shadow(0 2px 0 #ffffff)'
            }}
          >
            U
          </span>
          {/* S - Bright Green */}
          <span 
            className="text-7xl sm:text-8xl text-lime-500 transform rotate-6 -ml-1 inline-block"
            style={{
              WebkitTextStroke: '3.5px #1E3A8A',
              textShadow: '0 6px 0 #15803d, 0 10px 0 #1E3A8A, 0 12px 14px rgba(0,0,0,0.6)',
              filter: 'drop-shadow(0 2px 0 #ffffff)'
            }}
          >
            S
          </span>
        </div>

        {/* MADNESS TEXT */}
        <div className="relative -mt-3.5 z-20">
          <div 
            className="bg-[#2563EB] border-[3.5px] border-white px-7 py-1 rounded-2xl shadow-[0_8px_0_#1E3A8A,0_12px_16px_rgba(0,0,0,0.5)] transform -rotate-1"
          >
            <span 
              className="text-3xl sm:text-4xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_0_#1E3A8A]"
              style={{
                WebkitTextStroke: '1px #1E3A8A',
                letterSpacing: '0.12em',
              }}
            >
              MADNESS
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: "Loading..." TEXT & GREEN GLOW PROGRESS BAR (MATCHING SCREENSHOT 1) */}
      <div className="relative z-10 w-full max-w-xs sm:max-w-sm px-6 pb-12 flex flex-col items-center">
        {/* Loading Text */}
        <p className="text-white font-extrabold text-lg sm:text-xl tracking-wider mb-2.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-pulse">
          Loading...
        </p>

        {/* Progress Bar Container */}
        <div className="w-full h-7 bg-[#0b192c]/90 border-[2.5px] border-white/90 rounded-full p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-sm">
          {/* Gloss Top Specular Line */}
          <div className="absolute inset-x-2 top-0.5 h-1.5 bg-white/35 rounded-full pointer-events-none z-20" />

          {/* Green Gradient Fill */}
          <div 
            className="h-full bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#16a34a] rounded-full transition-all duration-150 ease-out flex items-center justify-center relative shadow-[0_0_12px_#22c55e]"
            style={{ width: `${Math.min(100, progress)}%` }}
          />

          {/* Centered Percentage Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <span 
              className="text-white font-black text-xs sm:text-sm tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              style={{ WebkitTextStroke: '0.5px #14532d' }}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* Tap to skip hint */}
        <span className="text-white/60 font-semibold text-[11px] mt-2 drop-shadow">
          Tap anywhere to start
        </span>
      </div>
    </div>
  );
};
