import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useThemeContext } from '@/providers/ThemeProvider';
import { HeroSurface, Radii } from '@/constants/Colours';
import { AppFonts } from '@/constants/Fonts';

/* Resolves the inverted hero palette for the active theme. */
export function useHeroSurface() {
  const { theme } = useThemeContext();
  return HeroSurface[theme === 'dark' ? 'dark' : 'light'];
}

interface EyebrowProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: 'default' | 'hero';
}

/** Small all-caps kicker that introduces a heading. */
export function Eyebrow({ children, style, tone = 'default' }: EyebrowProps) {
  const secondary = useThemeColour({}, 'textSecondary');
  const hero = useHeroSurface();

  return (
    <ThemedText type="eyebrow" style={[{ color: tone === 'hero' ? hero.textSecondary : secondary }, style]}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </ThemedText>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Eyebrow plus heading, with an optional trailing action. */
export function SectionHeading({ eyebrow, title, action, style }: SectionHeadingProps) {
  return (
    <View style={[styles.sectionHeading, style]}>
      <View style={styles.sectionHeadingCopy}>
        {eyebrow ? <Eyebrow style={styles.sectionEyebrow}>{eyebrow}</Eyebrow> : null}
        <ThemedText type="subtitle">{title}</ThemedText>
      </View>
      {action}
    </View>
  );
}

interface HeroCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single dark card per screen. It carries the one thing that matters most,
 * and nothing else on the screen competes with it.
 */
export function HeroCard({ children, style }: HeroCardProps) {
  const hero = useHeroSurface();
  const shadowColour = useThemeColour({}, 'shadowColor');

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: hero.background,
          shadowColor: shadowColour,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface ListRowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** The standard hairline row used by every list in the app. */
export function ListRow({ children, style }: ListRowProps) {
  const background = useThemeColour({}, 'cardBackground');
  const border = useThemeColour({}, 'cardBorder');

  return (
    <View style={[styles.row, { backgroundColor: background, borderColor: border }, style]}>
      {children}
    </View>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  meta?: string;
  style?: StyleProp<ViewStyle>;
}

/** Compact metric tile: kicker, number, and one line of context. */
export function StatTile({ label, value, meta, style }: StatTileProps) {
  const background = useThemeColour({}, 'cardBackground');
  const border = useThemeColour({}, 'cardBorder');
  const secondary = useThemeColour({}, 'textSecondary');

  return (
    <View style={[styles.statTile, { backgroundColor: background, borderColor: border }, style]}>
      <Eyebrow>{label}</Eyebrow>
      <ThemedText type="metric" style={styles.statValue}>
        {value}
      </ThemedText>
      {meta ? (
        <ThemedText type="caption" style={{ color: secondary }}>
          {meta}
        </ThemedText>
      ) : null}
    </View>
  );
}

interface ChipProps {
  label: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Filter chip. Pair with a touchable wrapper for interaction. */
export function Chip({ label, active = false, style }: ChipProps) {
  const border = useThemeColour({}, 'border');
  const text = useThemeColour({}, 'text');
  const secondary = useThemeColour({}, 'textSecondary');
  const background = useThemeColour({}, 'background');

  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: active ? text : border,
          backgroundColor: active ? text : 'transparent',
        },
        style,
      ]}
    >
      <ThemedText style={[styles.chipLabel, { color: active ? background : secondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeadingCopy: {
    flexShrink: 1,
  },
  sectionEyebrow: {
    marginBottom: 5,
  },
  hero: {
    padding: 19,
    borderRadius: Radii.hero,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 17,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: Radii.row,
    borderWidth: 1,
  },
  statTile: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 26,
    lineHeight: 30,
  },
  chip: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipLabel: {
    fontFamily: AppFonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
});
