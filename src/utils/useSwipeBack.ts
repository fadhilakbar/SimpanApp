import { useEffect, useRef } from 'react';
import { haptics } from './haptics';

export interface SwipeBackOptions {
  onBack?: () => void;
  enabled?: boolean;
  edgeOnly?: boolean; // If true, only swipes starting from left edge (clientX <= 70px)
  threshold?: number; // Minimum horizontal distance in px, default 60px
}

/**
 * Hook to enable native-like swipe-to-back gesture.
 * When user swipes from left to right, triggers onBack callback with haptic feedback.
 */
export function useSwipeBack<T extends HTMLElement = HTMLDivElement>(
  options: SwipeBackOptions
) {
  const { onBack, enabled = true, edgeOnly = false, threshold = 60 } = options;
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled || !onBack) return;

    const targetEl = elementRef.current || document;
    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // If edgeOnly is true, only activate if touch starts within left 70px
      if (edgeOnly && touch.clientX > 70) return;
      startX = touch.clientX;
      startY = touch.clientY;
      isTracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking || e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);

      // Horizontal swipe to the right with dominant horizontal direction
      if (deltaX > threshold && deltaX > deltaY * 1.3) {
        haptics.impactLight();
        onBack();
      }
      isTracking = false;
    };

    const onTouchCancel = () => {
      isTracking = false;
    };

    targetEl.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
    targetEl.addEventListener('touchend', onTouchEnd as EventListener, { passive: true });
    targetEl.addEventListener('touchcancel', onTouchCancel as EventListener, { passive: true });

    return () => {
      targetEl.removeEventListener('touchstart', onTouchStart as EventListener);
      targetEl.removeEventListener('touchend', onTouchEnd as EventListener);
      targetEl.removeEventListener('touchcancel', onTouchCancel as EventListener);
    };
  }, [enabled, edgeOnly, threshold, onBack]);

  return elementRef;
}
