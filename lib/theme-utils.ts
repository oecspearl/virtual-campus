/**
 * Theme utility functions for applying dynamic theme colors
 */

export function getThemeColorClass(colorType: 'primary' | 'secondary' | 'accent', shade?: string) {
  // Return Tailwind class that uses CSS variable
  const baseClass = `theme-${colorType}`;
  return shade ? `${baseClass}-${shade}` : baseClass;
}

/**
 * Get inline style object for theme colors
 */
export function getThemeStyle(colorType: 'primary' | 'secondary' | 'accent') {
  return {
    color: `var(--theme-${colorType})`,
  };
}

/**
 * Get background style with theme color
 */
export function getThemeBgStyle(colorType: 'primary' | 'secondary' | 'accent', opacity: number = 1) {
  const color = `var(--theme-${colorType})`;
  if (opacity < 1) {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    };
  }
  return {
    backgroundColor: color,
  };
}

/**
 * Get gradient style with theme colors
 */
export function getThemeGradientStyle(from: 'primary' | 'secondary' | 'accent', to: 'primary' | 'secondary' | 'accent') {
  return {
    background: `linear-gradient(to right, var(--theme-${from}), var(--theme-${to}))`,
  };
}

