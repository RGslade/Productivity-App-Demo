import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Colours } from './Colours';
import { AppFonts } from './Fonts';

type WebShadowStyle = ViewStyle & { boxShadow?: string };

/** Returns platform-appropriate shadow styling without triggering React Native Web deprecation warnings. */
const createShadow = (
  offsetY: number,
  blurRadius: number,
  opacity: number,
  elevation: number
): WebShadowStyle => Platform.select<WebShadowStyle>({
  web: {
    boxShadow: `0 ${offsetY}px ${blurRadius}px rgba(30, 28, 25, ${opacity})`,
  },
  default: {
    shadowColor: '#1E1C19',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blurRadius / 2,
    elevation,
  },
}) as WebShadowStyle;

// Typography styles
export const Typography = {
  // Headers
  h1: {
    fontFamily: AppFonts.medium,
    fontSize: 34,
    fontWeight: '500',
    lineHeight: 36,
    letterSpacing: 0,
    marginBottom: 16,
  } as TextStyle,

  h2: {
    fontFamily: AppFonts.medium,
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 31,
    letterSpacing: 0,
    marginBottom: 12,
  } as TextStyle,

  h3: {
    fontFamily: AppFonts.medium,
    fontSize: 23,
    fontWeight: '500',
    lineHeight: 27,
    letterSpacing: 0,
    marginBottom: 8,
  } as TextStyle,

  h4: {
    fontFamily: AppFonts.medium,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0,
    marginBottom: 8,
  } as TextStyle,

  h5: {
    fontFamily: AppFonts.semiBold,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0,
    marginBottom: 6,
  } as TextStyle,

  h6: {
    fontFamily: AppFonts.semiBold,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: 0,
    marginBottom: 4,
  } as TextStyle,

  // Body text
  body: {
    fontFamily: AppFonts.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,

  bodySmall: {
    fontFamily: AppFonts.regular,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  } as TextStyle,

  // Labels and captions
  label: {
    fontFamily: AppFonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  } as TextStyle,

  // Small all-caps kicker that sits above a heading
  eyebrow: {
    fontFamily: AppFonts.bold,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  } as TextStyle,

  caption: {
    fontFamily: AppFonts.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    opacity: 0.7,
  } as TextStyle,

  // Helper text
  helper: {
    fontFamily: AppFonts.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    opacity: 0.6,
  } as TextStyle,

  // Button text
  buttonText: {
    fontFamily: AppFonts.bold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  } as TextStyle,

  buttonTextSmall: {
    fontFamily: AppFonts.bold,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,

  buttonTextLarge: {
    fontFamily: AppFonts.bold,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
};

// Layout utilities
export const Layout = {
  // Flex utilities
  flex1: { flex: 1 } as ViewStyle,
  flexRow: { flexDirection: 'row' } as ViewStyle,
  flexColumn: { flexDirection: 'column' } as ViewStyle,
  flexCenter: { justifyContent: 'center', alignItems: 'center' } as ViewStyle,
  flexJustifyCenter: { justifyContent: 'center' } as ViewStyle,
  flexAlignCenter: { alignItems: 'center' } as ViewStyle,
  flexJustifyBetween: { justifyContent: 'space-between' } as ViewStyle,
  flexJustifyAround: { justifyContent: 'space-around' } as ViewStyle,
  flexJustifyEvenly: { justifyContent: 'space-evenly' } as ViewStyle,
  flexWrap: { flexWrap: 'wrap' } as ViewStyle,

  // Positioning
  absolute: { position: 'absolute' } as ViewStyle,
  relative: { position: 'relative' } as ViewStyle,

  // Full width/height
  fullWidth: { width: '100%' } as ViewStyle,
  fullHeight: { height: '100%' } as ViewStyle,
  fullScreen: { width: '100%', height: '100%' } as ViewStyle,
};

// Spacing utilities
export const Spacing = {
  // Margins
  margin: {
    xs: { margin: 4 } as ViewStyle,
    sm: { margin: 8 } as ViewStyle,
    md: { margin: 12 } as ViewStyle,
    lg: { margin: 16 } as ViewStyle,
    xl: { margin: 24 } as ViewStyle,
    xxl: { margin: 32 } as ViewStyle,
  },

  marginVertical: {
    xs: { marginVertical: 4 } as ViewStyle,
    sm: { marginVertical: 8 } as ViewStyle,
    md: { marginVertical: 12 } as ViewStyle,
    lg: { marginVertical: 16 } as ViewStyle,
    xl: { marginVertical: 24 } as ViewStyle,
    xxl: { marginVertical: 32 } as ViewStyle,
  },

  marginHorizontal: {
    xs: { marginHorizontal: 4 } as ViewStyle,
    sm: { marginHorizontal: 8 } as ViewStyle,
    md: { marginHorizontal: 12 } as ViewStyle,
    lg: { marginHorizontal: 16 } as ViewStyle,
    xl: { marginHorizontal: 24 } as ViewStyle,
    xxl: { marginHorizontal: 32 } as ViewStyle,
  },

  // Padding
  padding: {
    xs: { padding: 4 } as ViewStyle,
    sm: { padding: 8 } as ViewStyle,
    md: { padding: 12 } as ViewStyle,
    lg: { padding: 16 } as ViewStyle,
    xl: { padding: 24 } as ViewStyle,
    xxl: { padding: 32 } as ViewStyle,
  },

  paddingVertical: {
    xs: { paddingVertical: 4 } as ViewStyle,
    sm: { paddingVertical: 8 } as ViewStyle,
    md: { paddingVertical: 12 } as ViewStyle,
    lg: { paddingVertical: 16 } as ViewStyle,
    xl: { paddingVertical: 24 } as ViewStyle,
    xxl: { paddingVertical: 32 } as ViewStyle,
  },

  paddingHorizontal: {
    xs: { paddingHorizontal: 4 } as ViewStyle,
    sm: { paddingHorizontal: 8 } as ViewStyle,
    md: { paddingHorizontal: 12 } as ViewStyle,
    lg: { paddingHorizontal: 16 } as ViewStyle,
    xl: { paddingHorizontal: 24 } as ViewStyle,
    xxl: { paddingHorizontal: 32 } as ViewStyle,
  },

  // Gap utilities
  gap: {
    xs: { gap: 4 } as ViewStyle,
    sm: { gap: 8 } as ViewStyle,
    md: { gap: 12 } as ViewStyle,
    lg: { gap: 16 } as ViewStyle,
    xl: { gap: 24 } as ViewStyle,
    xxl: { gap: 32 } as ViewStyle,
  },
};

// Border utilities
export const Borders = {
  radius: {
    none: { borderRadius: 0 } as ViewStyle,
    sm: { borderRadius: 4 } as ViewStyle,
    md: { borderRadius: 8 } as ViewStyle,
    lg: { borderRadius: 12 } as ViewStyle,
    xl: { borderRadius: 16 } as ViewStyle,
    xxl: { borderRadius: 24 } as ViewStyle,
    full: { borderRadius: 9999 } as ViewStyle,
  },

  width: {
    thin: { borderWidth: 1 } as ViewStyle,
    thick: { borderWidth: 2 } as ViewStyle,
    none: { borderWidth: 0 } as ViewStyle,
  },
};

// Shadow utilities
export const Shadows = {
  // iOS shadows
  small: createShadow(1, 3, 0.04, 1),

  medium: createShadow(2, 8, 0.06, 3),

  large: createShadow(8, 22, 0.1, 6),

  xl: createShadow(16, 34, 0.14, 12),
};

// Common component styles that use theme colors
export const createThemedStyles = (theme: 'light' | 'dark' = 'light') => {
  const colors = Colours[theme];

  return StyleSheet.create({
    // Containers
    container: {
      flex: 1,
      backgroundColor: colors.background,
    } as ViewStyle,

    surface: {
      backgroundColor: colors.surface,
      borderRadius: 19,
      padding: 16,
    } as ViewStyle,

    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      padding: 17,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Shadows.small,
    } as ViewStyle,

    // Form elements
    input: {
      fontFamily: AppFonts.regular,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 15,
      paddingHorizontal: 15,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.text,
      minHeight: 48,
    } as ViewStyle & TextStyle,

    inputFocused: {
      borderColor: colors.text,
      borderWidth: 1,
    } as ViewStyle,

    label: {
      ...Typography.label,
      color: colors.text,
      marginBottom: 6,
    } as TextStyle,

    helperText: {
      ...Typography.helper,
      color: colors.textSecondary,
      marginTop: 4,
    } as TextStyle,

    // Text styles
    text: {
      fontFamily: AppFonts.regular,
      color: colors.text,
      fontSize: 16,
    } as TextStyle,

    textSecondary: {
      fontFamily: AppFonts.regular,
      color: colors.textSecondary,
      fontSize: 16,
    } as TextStyle,

    textLight: {
      fontFamily: AppFonts.regular,
      color: colors.textLight,
      fontSize: 16,
    } as TextStyle,

    // Buttons
    button: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 20,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    } as ViewStyle,

    buttonSecondary: {
      backgroundColor: colors.secondary,
      borderRadius: 999,
      paddingHorizontal: 20,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    } as ViewStyle,

    buttonText: {
      ...Typography.buttonText,
      color: '#FFFDF7',
    } as TextStyle,

    // Loading states
    loadingOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.loadingBackground,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,

    // Dividers
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    } as ViewStyle,

    // Navigation
    header: {
      backgroundColor: colors.navigationBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,

    // Status indicators
    success: {
      backgroundColor: colors.success,
      color: '#FFFDF7',
    } as ViewStyle & TextStyle,

    danger: {
      backgroundColor: colors.danger,
      color: '#FFFDF7',
    } as ViewStyle & TextStyle,

    warning: {
      backgroundColor: colors.warning,
      color: colors.text,
    } as ViewStyle & TextStyle,

    info: {
      backgroundColor: colors.info,
      color: '#FFFDF7',
    } as ViewStyle & TextStyle,
  });
};

// Default light theme styles
export const GlobalStyles = createThemedStyles('light');

// Export everything
export default {
  Typography,
  Layout,
  Spacing,
  Borders,
  Shadows,
  createThemedStyles,
  GlobalStyles,
};
