import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles } from 'lucide-react';

export interface BrandLoaderProps {
  mode?: 'fullscreen' | 'overlay' | 'inline' | 'mini';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  subtitle?: string;
  className?: string;
  showBadge?: boolean;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({
  mode = 'inline',
  size = 'md',
  title = 'Memproses...',
  subtitle = 'Menyiapkan data di perangkat Anda',
  className = '',
  showBadge = true,
}) => {
  // Mini mode (simple compact spinner)
  if (mode === 'mini') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="relative w-5 h-5">
          <div className="w-full h-full rounded-full border-2 border-emerald-200 border-t-[#165a4c] animate-spin" />
        </div>
        {title && <span className="text-xs font-bold text-stone-700">{title}</span>}
      </div>
    );
  }

  const iconSizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }[size];

  const ringSizes = {
    sm: 'w-12 h-12',
    md: 'w-18 h-18',
    lg: 'w-24 h-24',
  }[size];

  const content = (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Animated Glowing Symbol Container */}
      <div className="relative flex items-center justify-center mb-3.5">
        {/* Luminous Pulsing Aura Waves */}
        <motion.div
          animate={{
            scale: [1, 1.45, 1.8],
            opacity: [0.5, 0.25, 0],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          className={`absolute ${ringSizes} rounded-full bg-emerald-400/30 blur-sm pointer-events-none`}
        />
        <motion.div
          animate={{
            scale: [1, 1.25, 1.5],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: 0.6,
            ease: 'easeOut',
          }}
          className={`absolute ${ringSizes} rounded-full bg-teal-300/30 blur-sm pointer-events-none`}
        />

        {/* Rotating Outer Gradient Orbit Ring */}
        <div className={`absolute ${ringSizes} rounded-full p-[2px] animate-spin`} style={{ animationDuration: '3s' }}>
          <div className="w-full h-full rounded-full border-2 border-transparent border-t-[#165a4c] border-r-emerald-400" />
        </div>

        {/* Center Jewel Icon */}
        <motion.div
          animate={{
            scale: [0.96, 1.04, 0.96],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`relative ${iconSizes} rounded-2xl bg-gradient-to-tr from-[#124b3f] to-[#165a4c] flex items-center justify-center text-white shadow-lg shadow-emerald-950/20 border border-emerald-400/30`}
        >
          <img
            src="/logo.png"
            alt="SIMPAN"
            className="w-3/5 h-3/5 object-contain filter drop-shadow-sm brightness-125"
          />

          {/* Sparkle Accent */}
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center border border-white shadow-2xs">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        </motion.div>
      </div>

      {/* Typography */}
      {title && (
        <h4 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
          {title}
        </h4>
      )}
      {subtitle && (
        <p className="text-xs text-stone-500 mt-0.5 max-w-[220px] leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* Offline Badge */}
      {showBadge && (
        <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-800 border border-emerald-200/80 shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>100% Offline & Lokal</span>
        </div>
      )}
    </div>
  );

  if (mode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-fade-in select-none">
        <div className="relative bg-[#FAF9F6] rounded-[28px] p-7 border border-emerald-800/15 shadow-2xl max-w-xs w-full flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  if (mode === 'overlay') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#FAF9F6]/92 backdrop-blur-sm animate-fade-in select-none rounded-[inherit]">
        {content}
      </div>
    );
  }

  // Inline default
  return <div className="py-8 flex items-center justify-center">{content}</div>;
};
