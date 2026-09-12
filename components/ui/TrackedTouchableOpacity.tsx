import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent, Platform, StyleProp, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';
import { useSegments } from 'expo-router';

import { AnalyticsControlType, logUiPress } from '@/services/analyticsService';

export interface TrackedTouchableOpacityProps extends TouchableOpacityProps {
  analyticsId: string;
  analyticsControlType?: AnalyticsControlType;
  analyticsScreen?: string;
}

type WebInteractionStyle = ViewStyle & {
  cursor?: 'default' | 'pointer';
  boxShadow?: string;
  transitionDuration?: string;
  transitionProperty?: string;
  transitionTimingFunction?: string;
  userSelect?: 'none' | 'auto';
};

/** Returns a web-only pointer cursor for active clickable controls. */
function getWebCursorStyle(disabled: boolean | null | undefined, onPress: TouchableOpacityProps['onPress']): StyleProp<ViewStyle> {
  if (Platform.OS !== 'web') return undefined;
  return { cursor: disabled || !onPress ? 'default' : 'pointer' } as WebInteractionStyle;
}

/** Resolves shared hover and press feedback for clickable controls. */
function getInteractionStyle(options: {
  controlType: AnalyticsControlType;
  disabled: boolean | null | undefined;
  hasPressHandler: boolean;
  isHovered: boolean;
  isPressed: boolean;
}): StyleProp<ViewStyle> {
  const { controlType, disabled, hasPressHandler, isHovered, isPressed } = options;
  if (disabled || !hasPressHandler) return undefined;

  const shouldLift = controlType === 'button' || controlType === 'card' || controlType === 'list_item' || controlType === 'filter';
  const shouldTint = controlType === 'menu_item' || controlType === 'icon' || controlType === 'link';
  const hoverScale = controlType === 'icon' ? 1.04 : 1.01;
  const pressedScale = controlType === 'icon' ? 0.94 : 0.985;

  if (Platform.OS !== 'web') {
    return isPressed && shouldLift ? { transform: [{ scale: pressedScale }] } : undefined;
  }

  const transitionStyle: WebInteractionStyle = {
    transitionDuration: '140ms',
    transitionProperty: 'transform, opacity, box-shadow, background-color, border-color',
    transitionTimingFunction: 'ease-out',
    userSelect: 'none',
  };

  if (isPressed) {
    return {
      ...transitionStyle,
      opacity: shouldTint ? 0.82 : 0.92,
      transform: [{ scale: pressedScale }],
    } as WebInteractionStyle;
  }

  if (!isHovered) return transitionStyle;

  if (shouldLift) {
    return {
      ...transitionStyle,
      opacity: 0.96,
      transform: [{ translateY: -2 }, { scale: hoverScale }],
      boxShadow: controlType === 'card' || controlType === 'list_item'
        ? '0 10px 24px rgba(0, 0, 0, 0.14)'
        : '0 6px 16px rgba(0, 0, 0, 0.16)',
    } as WebInteractionStyle;
  }

  return {
    ...transitionStyle,
    opacity: shouldTint ? 0.78 : 0.94,
    transform: controlType === 'icon' ? [{ scale: hoverScale }] : undefined,
  } as WebInteractionStyle;
}

/** TouchableOpacity that records one anonymous event before running its press handler. */
export const TrackedTouchableOpacity: React.FC<TrackedTouchableOpacityProps> = ({
  analyticsId,
  analyticsControlType = 'button',
  analyticsScreen,
  disabled,
  onPress,
  style,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const segments = useSegments();
  const routeTemplate = `/${segments.join('/')}`;
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const hasPressHandler = Boolean(onPress);
  const webEventProps = props as TouchableOpacityProps & {
    onMouseEnter?: (event: unknown) => void;
    onMouseLeave?: (event: unknown) => void;
  };

  const handlePress = useCallback((event: GestureResponderEvent) => {
    void logUiPress({
      controlId: analyticsId,
      controlType: analyticsControlType,
      screen: analyticsScreen ?? routeTemplate,
    });
    onPress?.(event);
  }, [analyticsControlType, analyticsId, analyticsScreen, onPress, routeTemplate]);

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    setIsPressed(true);
    onPressIn?.(event);
  }, [onPressIn]);

  const handlePressOut = useCallback((event: GestureResponderEvent) => {
    setIsPressed(false);
    onPressOut?.(event);
  }, [onPressOut]);

  const handleMouseEnter = useCallback((event: unknown) => {
    setIsHovered(true);
    webEventProps.onMouseEnter?.(event);
  }, [webEventProps]);

  const handleMouseLeave = useCallback((event: unknown) => {
    setIsHovered(false);
    setIsPressed(false);
    webEventProps.onMouseLeave?.(event);
  }, [webEventProps]);

  const interactionStyle = useMemo(
    () => getInteractionStyle({
      controlType: analyticsControlType,
      disabled,
      hasPressHandler,
      isHovered,
      isPressed,
    }),
    [analyticsControlType, disabled, hasPressHandler, isHovered, isPressed]
  );

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled}
      style={[getWebCursorStyle(disabled, onPress), style, interactionStyle]}
      onPress={disabled || !onPress ? undefined : handlePress}
      onPressIn={disabled || !onPress ? undefined : handlePressIn}
      onPressOut={disabled || !onPress ? undefined : handlePressOut}
      {...(Platform.OS === 'web' ? { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave } : {})}
    />
  );
};

export default TrackedTouchableOpacity;
