import React from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Shield,
  Zap,
  Sparkles,
  X,
  HelpCircle,
  Smartphone,
  Gauge,
  Check,
} from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';
import { PlayerProgress, GraphicsQuality } from '../logic/playerProgress.ts';
import { Difficulty, DIFFICULTY_CONFIGS } from '../logic/types.ts';
import { inCabRadio, RADIO_STATIONS, RadioStation } from '../utils/radioSynthesizer.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  graphicsQuality: GraphicsQuality;
  onChangeGraphicsQuality: (quality: GraphicsQuality) => void;
  selectedDifficulty: Difficulty;
  onChangeDifficulty: (diff: Difficulty) => void;
  onOpenHowToPlay: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundOn,
  onToggleSound,
  graphicsQuality,
  onChangeGraphicsQuality,
  selectedDifficulty,
  onChangeDifficulty,
  onOpenHowToPlay,
}) => {
  if (!isOpen) return null;

  const currentRadio = inCabRadio.getStation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md game-modal-3d rounded-[32px] p-5 sm:p-6 text-white shadow-2xl border border-slate-700/80">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">Game Settings</h2>
              <p className="text-[11px] font-bold text-sky-400">Audio, Graphics & Difficulty</p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl game-btn game-btn-dark flex items-center justify-center text-slate-300 hover:text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Audio Controls */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-2.5">
              Sound & Haptics
            </span>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  onToggleSound();
                  sounds.playClick();
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
                  soundOn
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>Sound FX: {soundOn ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => {
                  const currentIndex = RADIO_STATIONS.findIndex((s) => s.id === currentRadio);
                  const nextIndex = (currentIndex + 1) % RADIO_STATIONS.length;
                  const nextStation = RADIO_STATIONS[nextIndex].id;
                  inCabRadio.setStation(nextStation);
                  PlayerProgress.setRadio(nextStation, inCabRadio.getVolume());
                  sounds.playClick();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border bg-slate-950 border-slate-800 hover:border-slate-700 flex items-center justify-center gap-2 text-xs font-black text-amber-300"
              >
                <Radio className="w-4 h-4 text-amber-400" />
                <span className="truncate">
                  Radio: {(RADIO_STATIONS.find((s) => s.id === currentRadio) || RADIO_STATIONS[0]).name}
                </span>
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Visual Quality
              </span>
              <span className="text-[10px] font-bold text-sky-400">
                {graphicsQuality === 'HIGH' ? 'PCFSoft Shadows & PBR' : 'Smooth High-FPS'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  sounds.playClick();
                  onChangeGraphicsQuality('HIGH');
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  graphicsQuality === 'HIGH'
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-md ring-2 ring-sky-400/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>HIGH (3D Shadows)</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onChangeGraphicsQuality('PERFORMANCE');
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  graphicsQuality === 'PERFORMANCE'
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-md ring-2 ring-sky-400/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>PERFORMANCE</span>
              </button>
            </div>
          </div>

          {/* Difficulty Tier */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-2">
              Preferred Difficulty
            </span>

            <div className="grid grid-cols-3 gap-2">
              {(Object.values(DIFFICULTY_CONFIGS) as Array<typeof DIFFICULTY_CONFIGS[Difficulty]>).map((cfg) => {
                const isSelected = selectedDifficulty === cfg.id;
                return (
                  <button
                    key={cfg.id}
                    onClick={() => {
                      sounds.playClick();
                      onChangeDifficulty(cfg.id);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/30 shadow-md font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black">{cfg.label}</div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{cfg.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* How to Play Guide Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenHowToPlay();
            }}
            className="w-full py-3 rounded-2xl game-btn game-btn-dark flex items-center justify-center gap-2 text-xs font-black text-sky-300"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>HOW TO PLAY & PUZZLE RULES</span>
          </button>
        </div>

        {/* Done / Confirm */}
        <div className="mt-5">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl game-btn game-btn-blue text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Check className="w-4 h-4" />
            <span>SAVE & RETURN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
