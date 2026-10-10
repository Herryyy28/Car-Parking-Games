import React, { useState } from 'react';

export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  bgGradient: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'duck', name: 'Duck', emoji: '🦆', bgGradient: 'from-fuchsia-500 to-purple-600' },
  { id: 'husky', name: 'Husky', emoji: '🐺', bgGradient: 'from-amber-300 to-yellow-500' },
  { id: 'bear', name: 'Bear', emoji: '🐻', bgGradient: 'from-emerald-400 to-green-600' },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', bgGradient: 'from-purple-400 to-indigo-600' },
  { id: 'lion', name: 'Lion', emoji: '🦁', bgGradient: 'from-sky-400 to-blue-600' },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️', bgGradient: 'from-pink-400 to-rose-600' },
  { id: 'cat', name: 'Cat', emoji: '🐱', bgGradient: 'from-rose-400 to-pink-600' },
  { id: 'dog', name: 'Dog', emoji: '🐶', bgGradient: 'from-lime-400 to-emerald-600' },
  { id: 'otter', name: 'Otter', emoji: '🦦', bgGradient: 'from-yellow-300 to-amber-500' },
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatarId: string;
  onSave: (name: string, avatarId: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentAvatarId,
  onSave,
}) => {
  const [name, setName] = useState(currentName || 'Player_ARLEQ');
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatarId || 'duck');
  const [isEditingName, setIsEditingName] = useState(false);

  if (!isOpen) return null;

  const currentOption = AVATAR_OPTIONS.find((a) => a.id === selectedAvatar) || AVATAR_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      {/* Modal Card (Matching Screenshot 1) */}
      <div className="w-80 sm:w-88 bg-[#1E3A8A] border-4 border-yellow-400 rounded-[32px] pt-8 pb-6 px-4.5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-150">
        
        {/* Header Badge: "Edit Profile" */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0F172A] border-2 border-yellow-400 rounded-full px-8 py-1 shadow-md whitespace-nowrap">
          <span className="text-white font-black text-base tracking-wide" style={{ WebkitTextStroke: '0.5px #1E3A8A' }}>
            Edit Profile
          </span>
        </div>

        {/* Red Circular Close Button (Top-Right) */}
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 w-8 h-8 bg-red-600 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <span className="text-white font-black text-xl leading-none">×</span>
        </button>

        {/* 1. Current Selected Profile Row */}
        <div className="bg-[#FFF1D0] border-2 border-[#B07B46] rounded-2xl p-2.5 flex items-center gap-3 mb-4 shadow-sm">
          {/* Selected Avatar Preview */}
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-b ${currentOption.bgGradient} border-2 border-white/80 shadow-md flex items-center justify-center flex-shrink-0 relative overflow-hidden`}>
            <span className="text-3xl filter drop-shadow">{currentOption.emoji}</span>
          </div>

          {/* Username Input Pill */}
          <div className="bg-[#dbeafe]/80 border-2 border-[#93c5fd] rounded-xl px-3 py-1.5 flex items-center justify-between flex-1 shadow-inner">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              className="bg-transparent text-[#1E3A8A] font-black text-base w-full outline-none"
              placeholder="Enter name"
            />
            {/* Green Pencil Edit Button */}
            <div className="w-7 h-7 bg-[#22c55e] border border-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ml-1.5 cursor-pointer">
              <span className="text-white text-xs font-black">✏️</span>
            </div>
          </div>
        </div>

        {/* 2. 3x3 Grid of 9 Cute Cartoon Animal Avatars */}
        <div className="bg-[#FFF1D0] border-2 border-[#B07B46] rounded-2xl p-3 mb-5 shadow-sm">
          <div className="grid grid-cols-3 gap-2.5">
            {AVATAR_OPTIONS.map((avatar) => {
              const isSelected = selectedAvatar === avatar.id;
              return (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b ${avatar.bgGradient} border-2 flex items-center justify-center relative shadow-md transition-all active:scale-95 ${
                    isSelected
                      ? 'border-green-500 ring-4 ring-green-400/80 scale-102 z-10'
                      : 'border-white/70 hover:border-white'
                  }`}
                >
                  <span className="text-3xl sm:text-4xl filter drop-shadow">{avatar.emoji}</span>

                  {/* Green Checkmark Badge on Top-Right */}
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#22c55e] border-2 border-white rounded-full flex items-center justify-center shadow-md animate-in zoom-in-75">
                      <span className="text-white text-xs font-black leading-none">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. "Save" Action Button */}
        <button
          onClick={() => {
            onSave(name.trim() || 'Player_ARLEQ', selectedAvatar);
            onClose();
          }}
          className="w-full py-2.5 bg-gradient-to-b from-[#94a3b8] via-[#64748b] to-[#475569] border-[3px] border-[#FBBF24] rounded-2xl text-white font-black text-2xl shadow-[0_4px_0_#334155] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
          style={{ WebkitTextStroke: '0.8px #334155' }}
        >
          Save
        </button>
      </div>
    </div>
  );
};
