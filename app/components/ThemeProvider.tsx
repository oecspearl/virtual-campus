'use client';

import { useEffect, useMemo } from 'react';
import { useBranding } from '@/lib/hooks/useBranding';

export default function ThemeProvider() {
  const { colorTheme, colorThemes, settings } = useBranding();

  // Calculate theme colors from current settings
  const themeColors = useMemo(() => {
    const themeKey = colorTheme || 'ocean-blue';
    const themes = colorThemes || {};
    const currentTheme = themes[themeKey] || themes['ocean-blue'] || {
      name: 'Ocean Blue',
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#60A5FA',
      description: 'Professional blue theme'
    };
    return {
      primary: currentTheme.primary,
      secondary: currentTheme.secondary,
      accent: currentTheme.accent,
      name: currentTheme.name
    };
  }, [colorTheme, colorThemes]);

  // Update theme colors whenever they change
  useEffect(() => {
    if (!themeColors || !themeColors.primary) return;
    
    // Apply theme colors as CSS variables
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', themeColors.primary);
    root.style.setProperty('--theme-secondary', themeColors.secondary);
    root.style.setProperty('--theme-accent', themeColors.accent);
    
    // Also update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColors.primary);
    }
  }, [themeColors.primary, themeColors.secondary, themeColors.accent]);

  // Listen for theme changes from settings page
  useEffect(() => {
    const handleThemeUpdate = () => {
      // The hook will refetch settings due to the event listener we added
      // Wait a bit for the refetch to complete, then update colors
      setTimeout(() => {
        const themeKey = colorTheme || 'ocean-blue';
        const themes = colorThemes || {};
        const currentTheme = themes[themeKey] || themes['ocean-blue'] || {
          name: 'Ocean Blue',
          primary: '#3B82F6',
          secondary: '#6366F1',
          accent: '#60A5FA',
        };
        
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', currentTheme.primary);
        root.style.setProperty('--theme-secondary', currentTheme.secondary);
        root.style.setProperty('--theme-accent', currentTheme.accent);
        
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', currentTheme.primary);
        }
      }, 300);
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

