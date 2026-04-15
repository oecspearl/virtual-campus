'use client';

import { useState, useEffect } from 'react';

/**
 * Tailwind CSS breakpoint values (in pixels).
 * Matches the default Tailwind config used across the app.
 */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Returns true when the viewport is at or above the given breakpoint.
 *
 * Uses `matchMedia` for efficient, event-driven updates — no polling.
 * Server-renders as `false` (mobile-first assumption).
 *
 * @example
 * ```tsx
 * const isDesktop = useBreakpoint('lg');
 * const isTablet = useBreakpoint('md');
 *
 * return isDesktop ? <DesktopSidebar /> : <MobileDrawer />;
 * ```
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
    const mql = window.matchMedia(query);

    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return matches;
}

/**
 * Returns the current active breakpoint name.
 * Useful for conditional rendering that depends on multiple thresholds.
 *
 * @example
 * ```tsx
 * const bp = useActiveBreakpoint();
 * const cols = bp === 'sm' ? 1 : bp === 'md' ? 2 : 3;
 * ```
 */
export function useActiveBreakpoint(): Breakpoint | 'xs' {
  const [active, setActive] = useState<Breakpoint | 'xs'>('xs');

  useEffect(() => {
    function check() {
      const width = window.innerWidth;
      if (width >= BREAKPOINTS['2xl']) setActive('2xl');
      else if (width >= BREAKPOINTS.xl) setActive('xl');
      else if (width >= BREAKPOINTS.lg) setActive('lg');
      else if (width >= BREAKPOINTS.md) setActive('md');
      else if (width >= BREAKPOINTS.sm) setActive('sm');
      else setActive('xs');
    }

    check();

    // Use matchMedia listeners for all breakpoints (more efficient than resize)
    const cleanups: (() => void)[] = [];
    for (const bp of Object.values(BREAKPOINTS)) {
      const mql = window.matchMedia(`(min-width: ${bp}px)`);
      const handler = () => check();
      mql.addEventListener('change', handler);
      cleanups.push(() => mql.removeEventListener('change', handler));
    }

    return () => cleanups.forEach(fn => fn());
  }, []);

  return active;
}

/**
 * Returns true if the device is likely a touch device.
 * Useful for showing/hiding touch-specific UI (e.g., swipe hints).
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  return isTouch;
}
