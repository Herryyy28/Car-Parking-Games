import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Smartphone,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';
import { GraphicsQuality } from '../logic/playerProgress.ts';
import { Difficulty } from '../logic/types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  graphicsQuality?: GraphicsQuality;
  onChangeGraphicsQuality?: (quality: GraphicsQuality) => void;
  selectedDifficulty?: Difficulty;
  onChangeDifficulty?: (diff: Difficulty) => void;
  onOpenHowToPlay?: () => void;
  onGoHome?: () => void;
  onRetry?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundOn,
  onToggleSound,
  onGoHome,
  onRetry,
}) => {
  const [musicOn, setMusicOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [visualsOn, setVisualsOn] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-200">
      {/* Outer Royal Blue Card with Gold Border matching frame_07.jpg */}
      <div className="w-80 bg-gradient-to-b from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] border-4 border-yellow-400 rounded-[36px] pt-7 pb-6 px-5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-200">
        
        {/* Top Header Tab: "Settings" */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] border-2 border-yellow-400 rounded-full px-7 py-1 shadow-md">
          <span 
            className="text-white font-black text-xl tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
            style={{ WebkitTextStroke: '0.8px #172554' }}
          >
            Settings
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

        {/* Inner Cream Card with 4 Square Action Toggles */}
        <div className="bg-[#FFF8E7] border-2 border-[#D97706]/40 rounded-2xl p-4 my-3 shadow-inner flex items-center justify-between gap-2.5">
          {/* 1. Sound FX Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sounds.playClick();
            }}
            className="w-14 h-14 bg-gradient-to-b from-[#86efac] via-[#4ade80] to-[#22c55e] border-2 border-[#bbf7d0] rounded-xl flex items-center justify-center shadow-[0_3px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all relative"
            title="Sound Effects"
          >
            {soundOn ? (
              <Volume2 className="w-7 h-7 text-white filter drop-shadow" />
            ) : (
              <div className="relative flex items-center justify-center">
                <VolumeX className="w-7 h-7 text-white filter drop-shadow" />
                <div className="absolute w-8 h-1 bg-red-600 rotate-45 rounded-full shadow-sm"></div>
              </div>
            )}
          </button>

          {/* 2. Music Toggle */}
          <button
            onClick={() => {
              setMusicOn(!musicOn);
              sounds.playClick();
            }}
            className="w-14 h-14 bg-gradient-to-b from-[#86efac] via-[#4ade80] to-[#22c55e] border-2 border-[#bbf7d0] rounded-xl flex items-center justify-center shadow-[0_3px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all relative"
            title="Music"
          >
            {musicOn ? (
              <Music className="w-7 h-7 text-white filter drop-shadow" />
            ) : (
              <div className="relative flex items-center justify-center">
                <Music className="w-7 h-7 text-white filter drop-shadow opacity-70" />
                <div className="absolute w-8 h-1 bg-red-600 rotate-45 rounded-full shadow-sm"></div>
              </div>
            )}
          </button>

          {/* 3. Vibration / Haptics Toggle */}
          <button
            onClick={() => {
              setVibrationOn(!vibrationOn);
              sounds.playClick();
            }}
            className="w-14 h-14 bg-gradient-to-b from-[#86efac] via-[#4ade80] to-[#22c55e] border-2 border-[#bbf7d0] rounded-xl flex items-center justify-center shadow-[0_3px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all relative"
            title="Haptics / Vibration"
          >
            <Smartphone className="w-7 h-7 text-white filter drop-shadow" />
            {!vibrationOn && (
              <div className="absolute w-8 h-1 bg-red-600 rotate-45 rounded-full shadow-sm"></div>
            )}
          </button>

          {/* 4. Visuals / Clues Toggle */}
          <button
            onClick={() => {
              setVisualsOn(!visualsOn);
              sounds.playClick();
            }}
            className="w-14 h-14 bg-gradient-to-b from-[#86efac] via-[#4ade80] to-[#22c55e] border-2 border-[#bbf7d0] rounded-xl flex items-center justify-center shadow-[0_3px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all relative"
            title="Visuals"
          >
            {visualsOn ? (
              <Eye className="w-7 h-7 text-white filter drop-shadow" />
            ) : (
              <div className="relative flex items-center justify-center">
                <EyeOff className="w-7 h-7 text-white filter drop-shadow" />
                <div className="absolute w-8 h-1 bg-red-600 rotate-45 rounded-full shadow-sm"></div>
              </div>
            )}
          </button>
        </div>

        {/* Bottom Actions: Large "Home" and "Retry" Buttons side-by-side */}
        <div className="flex items-center gap-3 mt-4">
          {/* Home Button: Orange gradient with gold border */}
          <button
            onClick={() => {
              sounds.playClick();
              if (onGoHome) onGoHome();
              onClose();
            }}
            className="w-1/2 py-3 bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[3px] border-[#b45309] rounded-2xl text-white font-black text-2xl shadow-[0_4px_0_#92400e] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
            style={{ WebkitTextStroke: '1px #b45309' }}
          >
            Home
          </button>

          {/* Retry Button: Lime green gradient with green border */}
          <button
            onClick={() => {
              sounds.playClick();
              if (onRetry) onRetry();
              onClose();
            }}
            className="w-1/2 py-3 bg-gradient-to-b from-[#84cc16] via-[#65a30d] to-[#4d7c0f] border-[3px] border-[#365314] rounded-2xl text-white font-black text-2xl shadow-[0_4px_0_#14532d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
            style={{ WebkitTextStroke: '1px #14532d' }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};
