/**
 * Warm-paper palette shared with the design prototype: paper ground, ink display
 * type, clay as the single accent, olive for anything settled or complete.
 */
export const Colours = {
  light: {
    // Primary colors
    primary: '#C05F3C',
    secondary: '#6B665E',
    premiumAccent: '#7F8F68',

    // Semantic colors
    success: '#7F8F68',
    danger: '#B4472F',
    warning: '#C3893B',
    info: '#6B7C86',

    // Background colors
    background: '#F2EFE7',
    surface: '#EBE7DD',
    cardBackground: '#FBF9F3',

    // Text colors
    text: '#1E1C19',
    textSecondary: '#6B665E',
    textLight: '#8D877D',

    // Border colors
    border: 'rgba(30, 28, 25, 0.12)',
    cardBorder: 'rgba(30, 28, 25, 0.10)',

    // Input colors
    inputBackground: '#F2EFE7',
    inputBorder: 'rgba(30, 28, 25, 0.14)',
    inputPlaceholder: '#8D877D',

    // Status bar
    statusBarStyle: 'dark-content' as const,

    // Navigation
    navigationBackground: '#F7F4EC',
    navigationTint: '#C05F3C',
    navigationText: '#1E1C19',

    // Shadow
    shadowColor: '#1E1C19',

    // Loading and overlay
    overlay: 'rgba(30, 28, 25, 0.52)',
    loadingBackground: 'rgba(242, 239, 231, 0.92)',
  },

  dark: {
    // Primary colors
    primary: '#DB8460',
    secondary: '#A9A296',
    premiumAccent: '#A6B58C',

    // Semantic colors
    success: '#A6B58C',
    danger: '#E8887A',
    warning: '#DDAB63',
    info: '#9AAFBA',

    // Background colors
    background: '#171613',
    surface: '#1E1C19',
    cardBackground: '#24211D',

    // Text colors
    text: '#F7F4EC',
    textSecondary: '#B4ADA1',
    textLight: '#8F8880',

    // Border colors
    border: 'rgba(247, 244, 236, 0.14)',
    cardBorder: 'rgba(247, 244, 236, 0.11)',

    // Input colors
    inputBackground: '#1E1C19',
    inputBorder: 'rgba(247, 244, 236, 0.18)',
    inputPlaceholder: '#8F8880',

    // Status bar
    statusBarStyle: 'light-content' as const,

    // Navigation
    navigationBackground: '#1B1916',
    navigationTint: '#DB8460',
    navigationText: '#F7F4EC',

    // Shadow
    shadowColor: '#000000',

    // Loading and overlay
    overlay: 'rgba(10, 9, 8, 0.72)',
    loadingBackground: 'rgba(23, 22, 19, 0.92)',
  },
};

/**
 * Surfaces that intentionally invert: the one dark hero card per screen in light
 * mode, and its raised version in dark mode.
 */
export const HeroSurface = {
  light: {
    background: '#1E1C19',
    text: '#FFFDF7',
    textSecondary: 'rgba(247, 244, 236, 0.62)',
    border: 'rgba(247, 244, 236, 0.14)',
    chipBackground: 'rgba(247, 244, 236, 0.12)',
    actionBackground: '#FFFDF7',
    actionText: '#1E1C19',
    ringTrack: 'rgba(247, 244, 236, 0.18)',
    ringValue: '#EDC7B6',
  },
  dark: {
    background: '#24211D',
    text: '#FFFDF7',
    textSecondary: 'rgba(247, 244, 236, 0.62)',
    border: 'rgba(247, 244, 236, 0.14)',
    chipBackground: 'rgba(247, 244, 236, 0.10)',
    actionBackground: '#DB8460',
    actionText: '#171613',
    ringTrack: 'rgba(247, 244, 236, 0.16)',
    ringValue: '#EDC7B6',
  },
};

/** Shared geometry so every surface in the app agrees on its corners and rhythm. */
export const Radii = {
  row: 19,
  card: 22,
  hero: 27,
  sheet: 29,
  pill: 999,
  control: 15,
} as const;

export const Spacing = {
  screenX: 20,
  gap: 9,
  cardGap: 11,
  section: 26,
} as const;

// Color utility functions
export const getColourForTheme = (colourName: keyof typeof Colours.light, theme: 'light' | 'dark' = 'light') => {
  return Colours[theme][colourName];
};

// Brand colors (theme-independent)
export const BrandColours = {
  brand: '#C05F3C',
  brandLight: '#EDC7B6',
  brandDark: '#1E1C19',
  premiumAccent: '#7F8F68',

  // Legacy names retained for older components; values now map to warm-paper tokens.
  graphite: '#1E1C19',
  electricBlue: '#C05F3C',
  cyan: '#7F8F68',
  ice: '#F2EFE7',

  // Reusable component colors
  badgeGreen: '#7F8F68',
  badgeGreenLight: '#7F8F6833',

  // Notification colors (motivational & encouragement)
  notificationMotivational: '#7F8F68',
  notificationMotivationalLight: '#7F8F6833',
  notificationDeadline: '#C3893B',
  notificationDeadlineLight: '#C3893B33',
  notificationOverdue: '#B4472F',
  notificationOverdueLight: '#B4472F33',
  notificationEncouragement: '#C05F3C',
  notificationEncouragementLight: '#C05F3C33',
  
  // System colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D92',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#30B0C7',
  systemYellow: '#FFCC00',
};

export default Colours;
