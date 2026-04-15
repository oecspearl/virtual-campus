'use client';

import { useEffect, useMemo } from 'react';
import { useBranding } from '@/lib/hooks/useBranding';
import { DEFAULT_COLOR_THEMES, getThemeColors } from '@/lib/color-themes';

export default function ThemeProvider() {
  const { colorTheme, colorThemes } = useBranding();

  // Calculate theme colors from current settings, merging with defaults
  const themeColors = useMemo(() => {
    const themeKey = colorTheme || 'ocean-blue';
    const mergedThemes = { ...DEFAULT_COLOR_THEMES, ...(colorThemes || {}) };
    const currentTheme = getThemeColors(themeKey, mergedThemes);
    return {
      primary: currentTheme.primary,
      secondary: currentTheme.secondary,
      accent: currentTheme.accent,
      name: currentTheme.name
    };
  }, [colorTheme, colorThemes]);

  // Apply theme colors as CSS variables whenever they change
  useEffect(() => {
    if (!themeColors || !themeColors.primary) return;

    const root = document.documentElement;
    root.style.setProperty('--theme-primary', themeColors.primary);
    root.style.setProperty('--theme-secondary', themeColors.secondary);
    root.style.setProperty('--theme-accent', themeColors.accent);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColors.primary);
    }
  }, [themeColors]);

  // Listen for theme changes from settings page
  useEffect(() => {
    const handleThemeUpdate = () => {
      // Wait for useBranding to refetch, then re-apply
      setTimeout(() => {
        const themeKey = colorTheme || 'ocean-blue';
        const mergedThemes = { ...DEFAULT_COLOR_THEMES, ...(colorThemes || {}) };
        const currentTheme = getThemeColors(themeKey, mergedThemes);

        const root = document.documentElement;
        root.style.setProperty('--theme-primary', currentTheme.primary);
        root.style.setProperty('--theme-secondary', currentTheme.secondary);
        root.style.setProperty('--theme-accent', currentTheme.accent);

        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', currentTheme.primary);
        }
      }, 500);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('branding-settings-updated', handleThemeUpdate);
      return () => {
        window.removeEventListener('branding-settings-updated', handleThemeUpdate);
      };
    }
  }, [colorTheme, colorThemes]);

  return null;
}
