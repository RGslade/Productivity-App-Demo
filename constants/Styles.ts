import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Colours } from './Colours';

const Typography = {
  helper: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    opacity: 0.6,
  } as TextStyle,
};

export const createThemedStyles = (theme: 'light' | 'dark' = 'light') => {
  const colors = Colours[theme];

  return StyleSheet.create({
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      minHeight: 52,
    } as ViewStyle & TextStyle,

    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    } as ViewStyle,

    helperText: {
      ...Typography.helper,
      color: colors.textSecondary,
      marginTop: 4,
    } as TextStyle,
  });
};

export const GlobalStyles = createThemedStyles('light');

export default {
  createThemedStyles,
  GlobalStyles,
};
