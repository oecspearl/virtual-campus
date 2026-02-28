export interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  description: string;
}

export const DEFAULT_COLOR_THEMES: Record<string, ColorTheme> = {
  'ocean-blue': {
    name: 'Ocean Blue',
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#60A5FA',
    description: 'Professional blue theme perfect for educational platforms'
  },
  'caribbean-teal': {
    name: 'Caribbean Teal',
    primary: '#14B8A6',
    secondary: '#0D9488',
    accent: '#5EEAD4',
    description: 'Fresh teal theme inspired by Caribbean waters'
  },
  'forest-green': {
    name: 'Forest Green',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    description: 'Natural green theme representing growth and learning'
  },
  'emerald': {
    name: 'Emerald',
    primary: '#059669',
    secondary: '#047857',
    accent: '#6EE7B7',
    description: 'Rich emerald green for a sophisticated feel'
  },
  'royal-purple': {
    name: 'Royal Purple',
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#A78BFA',
    description: 'Elegant purple theme for premium experiences'
  },
  'indigo': {
    name: 'Indigo',
    primary: '#6366F1',
    secondary: '#4F46E5',
    accent: '#818CF8',
    description: 'Deep indigo for a modern, tech-forward look'
  },
  'sunset-orange': {
    name: 'Sunset Orange',
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FBBF24',
    description: 'Warm orange theme with energetic vibes'
  },
  'coral': {
    name: 'Coral',
    primary: '#F43F5E',
    secondary: '#E11D48',
    accent: '#FB7185',
    description: 'Vibrant coral for a bold, modern design'
  },
  'crimson-red': {
    name: 'Crimson Red',
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#F87171',
    description: 'Bold red theme for high-energy platforms'
  },
  'rose': {
    name: 'Rose',
    primary: '#E11D48',
    secondary: '#BE123C',
    accent: '#FDA4AF',
    description: 'Soft rose for an elegant, warm aesthetic'
  },
  'sky-blue': {
    name: 'Sky Blue',
    primary: '#0EA5E9',
    secondary: '#0284C7',
    accent: '#7DD3FC',
    description: 'Light and airy sky blue for a clean look'
  },
  'slate': {
    name: 'Slate',
    primary: '#475569',
    secondary: '#334155',
    accent: '#94A3B8',
    description: 'Neutral slate for a professional, muted design'
  },
  'midnight': {
    name: 'Midnight',
    primary: '#1E293B',
    secondary: '#0F172A',
    accent: '#38BDF8',
    description: 'Dark midnight with bright accent highlights'
  },
  'gold': {
    name: 'Gold',
    primary: '#CA8A04',
    secondary: '#A16207',
    accent: '#FDE047',
    description: 'Elegant gold for a prestigious feel'
  },
};

export const CUSTOM_THEME_KEY = 'custom';

export function getThemeColors(themeKey: string, themes: Record<string, ColorTheme>): ColorTheme {
  return themes[themeKey] || DEFAULT_COLOR_THEMES[themeKey] || DEFAULT_COLOR_THEMES['ocean-blue'];
}
