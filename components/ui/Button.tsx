
import React from 'react';
import {TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, TouchableOpacityProps, StyleProp, } from 'react-native';
import { useThemeColour } from '@/hooks/useThemeColour';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
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
  const infoColour = useThemeColour({}, 'info');
  const textColour = useThemeColour({}, 'text');

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
        backgroundColor = infoColour;
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
          paddingHorizontal: 14,
          paddingVertical: 10,
          minHeight: 42,
        };
        break;
      case 'large':
        sizeStyle = {
          paddingHorizontal: 26,
          paddingVertical: 18,
          minHeight: 58,
        };
        break;
      default: // medium
        sizeStyle = {
          paddingHorizontal: 18,
          paddingVertical: 14,
          minHeight: 52,
        };
        break;
    }

    return {
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
      ...sizeStyle,
      ...(fullWidth && { width: '100%' }),
      ...(isDisabled && { opacity: 0.6 }),
    };
  };

  /** Resolves text style for the selected variant and size. */
  const getTextStyle = (): TextStyle => {
    // Size-specific text styles
    let fontSize: number;
    switch (size) {
      case 'small':
        fontSize = 14;
        break;
      case 'large':
        fontSize = 18;
        break;
      default: // medium
        fontSize = 16;
        break;
    }

    // Variant-specific text colors
    let color: string;
    switch (variant) {
      case 'warning':
        color = textColour;
        break;
      default:
        color = '#FFFFFF';
        break;
    }

    return {
      fontSize,
      fontWeight: '700',
      color,
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'warning' ? textColour : '#FFFFFF'}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
