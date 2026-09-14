import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-stone-200/70 rounded-xl ${className}`}
    />
  );
};

export const RecordCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-3.5 border border-stone-200/70 shadow-ios flex items-center gap-3.5">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
};
