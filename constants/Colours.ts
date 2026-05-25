export const Colours = {
  light: {
    // Primary colors
    primary: '#1769F5',
    secondary: '#101826',
    premiumAccent: '#00B8FF',
    
    // Semantic colors
    success: '#13A66B',
    danger: '#E5484D',
    warning: '#F5A524',
    info: '#0095D9',
    
    // Background colors
    background: '#F3F7FF',
    surface: '#EAF1FF',
    cardBackground: '#FFFFFF',
    
    // Text colors
    text: '#0A1020',
    textSecondary: '#46546B',
    textLight: '#7C8AA3',
    
    // Border colors
    border: '#D6E2F4',
    cardBorder: '#E2EAF7',
    
    // Input colors
    inputBackground: '#FFFFFF',
    inputBorder: '#C8D6ED',
    inputPlaceholder: '#7C8AA3',
    
    // Status bar
    statusBarStyle: 'dark-content' as const,
    
    // Navigation
    navigationBackground: '#FFFFFF',
    navigationTint: '#1769F5',
    navigationText: '#0A1020',
    
    // Shadow
    shadowColor: '#000000',
    
    // Loading and overlay
    overlay: 'rgba(5, 12, 28, 0.58)',
    loadingBackground: 'rgba(255, 255, 255, 0.92)',
  },
  
  dark: {
    // Primary colors
    primary: '#2D7DFF',
    secondary: '#1B273A',
    premiumAccent: '#00C8FF',
    
    // Semantic colors
    success: '#22C983',
    danger: '#FF6B70',
    warning: '#FFC24B',
    info: '#28B9F6',
    
    // Background colors
    background: '#050914',
    surface: '#0B1220',
    cardBackground: '#111A2A',
    
    // Text colors
    text: '#F4F8FF',
    textSecondary: '#B8C5D8',
    textLight: '#7F8DA6',
    
    // Border colors
    border: '#1F314A',
    cardBorder: '#20324D',
    
    // Input colors
    inputBackground: '#0B1220',
    inputBorder: '#2A4162',
    inputPlaceholder: '#7F8DA6',
    
    // Status bar
    statusBarStyle: 'light-content' as const,
    
    // Navigation
    navigationBackground: '#050914',
    navigationTint: '#00C8FF',
    navigationText: '#F4F8FF',
    
    // Shadow
    shadowColor: '#000000',
    
    // Loading and overlay
    overlay: 'rgba(0, 0, 0, 0.74)',
    loadingBackground: 'rgba(5, 9, 20, 0.9)',
  },
};

// Color utility functions
export const getColourForTheme = (colourName: keyof typeof Colours.light, theme: 'light' | 'dark' = 'light') => {
  return Colours[theme][colourName];
};

// Brand colors (theme-independent)
export const BrandColours = {
  brand: '#1769F5',
  brandLight: '#DDEBFF',
  brandDark: '#050914',
  premiumAccent: '#00C8FF',
  graphite: '#050914',
  electricBlue: '#1769F5',
  cyan: '#00C8FF',
  ice: '#F4F8FF',
  
  // Reusable component colors
  badgeGreen: '#13A66B',
  badgeGreenLight: '#13A66B33',
  
  // Notification colors (motivational & encouragement)
  notificationMotivational: '#13A66B',
  notificationMotivationalLight: '#13A66B33',
  notificationDeadline: '#F5A524',
  notificationDeadlineLight: '#F5A52433',
  notificationOverdue: '#E5484D',
  notificationOverdueLight: '#E5484D33',
  notificationEncouragement: '#1769F5',
  notificationEncouragementLight: '#1769F533',
  
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
