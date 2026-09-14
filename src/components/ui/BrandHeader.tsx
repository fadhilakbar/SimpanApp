import React from 'react';
import { BrandAvatar } from './BrandAvatar';
import { useUserProfile } from '../../services/authService';
import { ChevronLeft } from 'lucide-react';
import { haptics } from '../../utils/haptics';

export interface BrandHeaderProps {
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  title?: string;
  onAvatarClick?: () => void;
  onBack?: () => void;
  className?: string;
  showGreeting?: boolean;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  leftElement,
  rightElement,
  title,
  onAvatarClick,
  onBack,
  className = '',
  showGreeting: _showGreeting = false,
}) => {
  const { profile } = useUserProfile();
  const userName = profile.name && profile.name !== 'Pengguna SIMPAN' ? profile.name : '';

  return (
    <header
      className={`sticky top-0 z-30 px-4 pt-3 pb-3 bg-gradient-to-r from-emerald-50/95 via-[#FAF9F6]/95 to-teal-50/90 backdrop-blur-xl border-b border-emerald-800/15 flex items-center justify-between select-none transition-all shadow-2xs ${className}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
    >
      {/* Left side: Back Button (if onBack provided) + Wide Logo + Title/Badge */}
      <div className="flex items-center gap-2.5">
        {leftElement ? (
          leftElement
        ) : onBack ? (
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              onBack();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100/90 hover:bg-stone-200/90 text-stone-700 border border-stone-200/80 active:scale-90 transition-all cursor-pointer shrink-0 shadow-2xs"
            aria-label="Kembali"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.4]" />
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          <img
            src="/logowide.png"
            alt="SIMPAN"
            className="h-7 sm:h-8 w-auto object-contain cursor-pointer active:scale-95 transition-transform"
          />
          {title ? (
            <span className="text-xs font-bold text-stone-500 pl-1 border-l border-stone-300/80 max-w-[180px] sm:max-w-none truncate">
              {title}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[9px] font-extrabold text-emerald-800 border border-emerald-200/80 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Offline</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Element (Avatar with user name tooltip or custom right action) */}
      <div className="flex items-center gap-2">
        {rightElement ? (
          rightElement
        ) : onAvatarClick ? (
          <div className="flex items-center gap-2">
            {userName && (
              <span className="text-xs font-semibold text-stone-600 hidden sm:inline-block">
                {userName.split(' ')[0]}
              </span>
            )}
            <BrandAvatar size="sm" onClick={onAvatarClick} />
          </div>
        ) : null}
      </div>
    </header>
  );
};
