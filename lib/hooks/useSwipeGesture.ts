import { useEffect, useRef, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in pixels to trigger swipe
  velocity?: number; // Minimum velocity to trigger swipe
  preventDefault?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isSwiping: boolean;
}

export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocity = 0.3,
    preventDefault = false,
  } = options;

  const elementRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isSwiping: true,
      };

      if (preventDefault) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!stateRef.current.isSwiping) return;

      if (preventDefault) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!stateRef.current.isSwiping) return;

      const touch = e.changedTouches[0];
      const { startX, startY, startTime } = stateRef.current;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const deltaTime = Date.now() - startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const speed = distance / deltaTime;

      // Check if swipe meets threshold and velocity requirements
      if (distance >= threshold && speed >= velocity) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Determine primary direction
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      stateRef.current.isSwiping = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocity, preventDefault]);

  return elementRef;
}

// Hook for pull-to-refresh gesture
export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const { threshold = 80, enabled = true } = options;
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef<number>(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger at the top of the page
      if (window.scrollY > 0) return;

      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      isPullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;

      if (deltaY > 0 && window.scrollY === 0) {
        setIsPulling(true);
        setPullDistance(Math.min(deltaY, threshold * 1.5));
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;

      if (pullDistance >= threshold) {
        await onRefresh();
      }

      setIsPulling(false);
      setPullDistance(0);
      isPullingRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, enabled, pullDistance]);

  return { isPulling, pullDistance, progress: Math.min(pullDistance / threshold, 1) };
}


