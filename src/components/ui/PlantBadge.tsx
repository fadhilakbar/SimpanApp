import React from 'react';

export interface PlantBadgeProps {
  text: string;
  subtext?: string;
  variant?: 'bubble' | 'banner';
  className?: string;
}

export const PlantBadge: React.FC<PlantBadgeProps> = ({
  text,
  subtext,
  variant = 'bubble',
  className = '',
}) => {
  if (variant === 'banner') {
    return (
      <div
        className={`w-full bg-gradient-to-r from-emerald-50 via-[#F3F9F5] to-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/60 flex items-center justify-between shadow-xs select-none ${className}`}
      >
        <div className="flex items-center gap-3">
          {/* Plant in pot graphic */}
          <div className="w-10 h-10 shrink-0 relative flex items-center justify-center">
            {/* Pot */}
            <div className="w-6 h-5 bg-stone-100 rounded-b-md border border-stone-300 absolute bottom-1 flex flex-col items-center justify-start">
              <div className="w-7 h-1.5 bg-stone-200 rounded-t-sm border border-stone-300 -mt-0.5" />
              <div className="w-5 h-1.5 bg-amber-950/70 rounded-full mt-0.5" />
            </div>
            {/* Sprout Leaves */}
            <div className="w-4 h-6 bg-emerald-500 rounded-full rounded-tr-none rotate-25 absolute top-0.5 -left-0.5 shadow-xs" />
            <div className="w-4 h-5 bg-teal-600 rounded-full rounded-tl-none -rotate-25 absolute top-1 right-0 shadow-xs" />
          </div>

          <div>
            <p className="text-xs font-serif italic text-emerald-900 font-medium leading-tight">
              {text}
            </p>
            {subtext && (
              <p className="text-[10px] text-emerald-700/80 mt-0.5">
                {subtext}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Bubble style for Top Greeting card
  return (
    <div
      className={`inline-flex items-center gap-2 bg-[#EAF7EE]/90 backdrop-blur-xs py-1.5 px-3 rounded-2xl border border-emerald-200/70 shadow-xs select-none ${className}`}
    >
      {/* Plant Pot */}
      <div className="w-7 h-7 shrink-0 relative flex items-center justify-center">
        <div className="w-4 h-3.5 bg-stone-100 rounded-b-xs border border-stone-300 absolute bottom-0.5 flex flex-col items-center">
          <div className="w-5 h-1 bg-stone-200 rounded-t-2xs border border-stone-300 -mt-0.5" />
          <div className="w-3.5 h-1 bg-amber-950/70 rounded-full mt-0.5" />
        </div>
        <div className="w-2.5 h-4 bg-emerald-500 rounded-full rounded-tr-none rotate-25 absolute top-0 -left-0.5" />
        <div className="w-2.5 h-3.5 bg-teal-600 rounded-full rounded-tl-none -rotate-25 absolute top-0.5 right-0" />
      </div>

      <p className="text-[11px] font-serif italic text-emerald-900 font-medium leading-tight">
        {text}
      </p>
    </div>
  );
};
