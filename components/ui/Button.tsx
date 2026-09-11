
import React from 'react';
import {Text, ActivityIndicator, ViewStyle, TextStyle, TouchableOpacityProps, StyleProp, Platform, } from 'react-native';
import { useThemeColour } from '@/hooks/useThemeColour';
import { TrackedTouchableOpacity } from './TrackedTouchableOpacity';
import { AppFonts } from '@/constants/Fonts';
import { Radii } from '@/constants/Colours';

type WebShadowStyle = ViewStyle & { boxShadow?: string };

/** Buttons carry their weight through colour, not elevation. */
const getButtonShadow = (): WebShadowStyle => Platform.select<WebShadowStyle>({
  web: {
    boxShadow: '0 1px 2px rgba(30, 28, 25, 0.06)',
  },
  default: {
    shadowColor: '#1E1C19',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
}) as WebShadowStyle;

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  analyticsId: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/** Renders a styled, theme-aware button with optional loading state. */
export const Button: React.FC<ButtonProps> = ({
  title,
  analyticsId,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  onPress,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const primary = useThemeColour({}, 'primary');
  const secondary = useThemeColour({}, 'secondary');
  const success = useThemeColour({}, 'success');
  const danger = useThemeColour({}, 'danger');
  const warning = useThemeColour({}, 'warning');
  const info = useThemeColour({}, 'info');
  const textColour = useThemeColour({}, 'text');
  const borderColour = useThemeColour({}, 'border');

  /** Resolves container style for the selected variant, size, and disabled state. */
  const getButtonStyle = (): ViewStyle => {
    let backgroundColor: string;
    
    // Variant styles
    switch (variant) {
      case 'primary':
        backgroundColor = primary;
        break;
      case 'secondary':
        backgroundColor = secondary;
        break;
      case 'success':
        backgroundColor = success;
        break;
      case 'danger':
        backgroundColor = danger;
        break;
      case 'warning':
        backgroundColor = warning;
        break;
      case 'info':
        backgroundColor = info;
        break;
      case 'outline':
        backgroundColor = 'transparent';
        break;
      default:
        backgroundColor = primary;
        break;
    }

    // Size styles
    let sizeStyle: ViewStyle = {};
    switch (size) {
      case 'small':
        sizeStyle = {
          paddingHorizontal: 16,
          paddingVertical: 9,
          minHeight: 38,
        };
        break;
      case 'large':
        sizeStyle = {
          paddingHorizontal: 26,
          paddingVertical: 16,
          minHeight: 54,
        };
        break;
      default: // medium
        sizeStyle = {
          paddingHorizontal: 20,
          paddingVertical: 13,
          minHeight: 48,
        };
        break;
    }

    return {
      borderRadius: Radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor,
      ...(variant === 'outline' ? { borderWidth: 1, borderColor: borderColour } : getButtonShadow()),
      ...sizeStyle,
      ...(fullWidth && { width: '100%' }),
      ...(isDisabled && { opacity: 0.42 }),
    };
  };

  /** Resolves text style for the selected variant and size. */
  const getTextStyle = (): TextStyle => {
    // Size-specific text styles
    let fontSize: number;
    switch (size) {
      case 'small':
        fontSize = 13;
        break;
      case 'large':
        fontSize = 16;
        break;
      default: // medium
        fontSize = 14;
        break;
    }

    // Variant-specific text colors
    let color: string;
    switch (variant) {
      case 'warning':
      case 'outline':
        color = textColour;
        break;
      default:
        color = '#FFFDF7';
        break;
    }

    return {
      fontSize,
      fontFamily: AppFonts.bold,
      letterSpacing: 0.1,
      color,
    };
  };

  return (
    <TrackedTouchableOpacity
      analyticsId={analyticsId}
      analyticsControlType="button"
      style={[getButtonStyle(), style]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'warning' ? textColour : '#FFFDF7'}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TrackedTouchableOpacity>
  );
};

export default Button;
