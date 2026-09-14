import React from 'react';
import { useUserProfile } from '../../services/authService';
import { haptics } from '../../utils/haptics';

export interface BrandAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatusDot?: boolean;
  onClick?: () => void;
  className?: string;
  avatarSrc?: string; // Optional custom avatar override
}

export const BrandAvatar: React.FC<BrandAvatarProps> = ({
  size = 'md',
  showStatusDot = true,
  onClick,
  className = '',
  avatarSrc,
}) => {
  const { profile } = useUserProfile();
  const currentAvatar = avatarSrc || profile.avatar || 'default';

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const isCustomPhoto =
    currentAvatar.startsWith('data:image') ||
    currentAvatar.startsWith('blob:') ||
    currentAvatar.startsWith('http');

  const handleClick = () => {
    haptics.impactLight();
    if (onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none ${className}`}
      aria-label="Profil Pengguna"
    >
      <div
        className={`${sizeClasses[size]} rounded-full bg-[#F3ECE4] border-2 border-white/90 shadow-sm flex items-center justify-center overflow-hidden ring-1 ring-stone-200/60`}
      >
        {isCustomPhoto ? (
          <img
            src={currentAvatar}
            alt="Foto Profil"
            className="w-full h-full object-cover rounded-full transition-all"
          />
        ) : (
          /* SVG Cute Smile Face Preset */
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4/5 h-4/5"
          >
            {/* Eyes */}
            <circle cx="13" cy="16" r="1.8" fill="#4B4136" />
            <circle cx="23" cy="16" r="1.8" fill="#4B4136" />
            {/* Subtle blush */}
            <circle cx="10" cy="19" r="1.5" fill="#F7B2A3" opacity="0.6" />
            <circle cx="26" cy="19" r="1.5" fill="#F7B2A3" opacity="0.6" />
            {/* Smile */}
            <path
              d="M13 20C13 20 15.5 24 18 24C20.5 24 23 20 23 20"
              stroke="#4B4136"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Online / Active Green Indicator Dot */}
      {showStatusDot && (
        <span
          className={`absolute top-0 right-0 ${dotSizes[size]} bg-emerald-500 rounded-full border-2 border-white shadow-xs`}
        />
      )}
    </div>
  );
};
