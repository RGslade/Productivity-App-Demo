import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useThemeColour } from '@/hooks/useThemeColour';
import { AppFonts, Type } from '@/constants/Fonts';

export type ThemedTextProps = TextProps & {
  lightColour?: string;
  darkColour?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'display'
    | 'displaySmall'
    | 'eyebrow'
    | 'metric'
    | 'caption';
};

/** Renders theme-aware text content. */
export function ThemedText({
  style,
  lightColour,
  darkColour,
  type = 'default',
  children,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColour({ light: lightColour, dark: darkColour }, 'text');

  return (
    <Text style={[{ color }, styles[type], style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: AppFonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  defaultSemiBold: {
    fontFamily: AppFonts.semiBold,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0,
  },
  title: Type.display,
  subtitle: Type.heading,
  link: {
    fontFamily: AppFonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
    color: '#C05F3C',
  },
  display: Type.display,
  displaySmall: Type.displaySmall,
  eyebrow: Type.eyebrow,
  metric: Type.metric,
  caption: Type.caption,
});
