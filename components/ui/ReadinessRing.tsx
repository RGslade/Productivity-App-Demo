import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColour } from '@/hooks/useThemeColour';
import { AppFonts } from '@/constants/Fonts';
import { useHeroSurface } from './Surfaces';

interface ReadinessRingProps {
  /** Percentage complete, 0 to 100. */
  value: number;
  size?: number;
  thickness?: number;
  /** `hero` sits on the dark card, `page` sits on the paper background. */
  tone?: 'hero' | 'page';
  /** Hides the number when the ring is used purely as an indicator. */
  showValue?: boolean;
  /** Replaces the centre percentage with a stacked completed/total fraction. */
  fraction?: { numerator: number | string; denominator: number | string };
  style?: StyleProp<ViewStyle>;
}

/**
 * Progress ring drawn with two clipped half-circles so it needs no SVG
 * dependency and renders identically on iOS, Android, and web.
 */
export function ReadinessRing({
  value,
  size = 44,
  thickness = 3,
  tone = 'hero',
  showValue = true,
  fraction,
  style,
}: ReadinessRingProps) {
  const hero = useHeroSurface();
  const primary = useThemeColour({}, 'primary');
  const text = useThemeColour({}, 'text');

  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const angle = (clamped / 100) * 360;
  const half = size / 2;

  const trackColour = tone === 'hero' ? hero.ringTrack : 'rgba(30, 28, 25, 0.13)';
  const valueColour = tone === 'hero' ? hero.ringValue : primary;
  const labelColour = tone === 'hero' ? hero.text : text;

  const arc = {
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: thickness,
    borderTopColor: valueColour,
    borderRightColor: valueColour,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  } as const;

  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: half,
            borderWidth: thickness,
            borderColor: trackColour,
          },
        ]}
      />

      <View style={[styles.clip, { width: half, height: size, right: 0 }]}>
        <View
          style={[
            arc,
            styles.arc,
            { right: 0, transform: [{ rotate: `${-135 + Math.min(angle, 180)}deg` }] },
          ]}
        />
      </View>

      <View style={[styles.clip, { width: half, height: size, left: 0 }]}>
        <View
          style={[
            arc,
            styles.arc,
            { left: 0, transform: [{ rotate: `${45 + Math.max(0, angle - 180)}deg` }] },
          ]}
        />
      </View>

      {fraction ? (
        <View style={styles.fraction}>
          <ThemedText style={[styles.fractionValue, { color: labelColour }]}>{fraction.numerator}</ThemedText>
          <View style={[styles.fractionLine, { backgroundColor: labelColour }]} />
          <ThemedText style={[styles.fractionValue, { color: labelColour }]}>{fraction.denominator}</ThemedText>
        </View>
      ) : showValue ? (
        <ThemedText style={[styles.value, { color: labelColour }]}>{clamped}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  arc: {
    position: 'absolute',
    top: 0,
  },
  value: {
    fontFamily: AppFonts.semiBold,
    fontSize: 12,
    letterSpacing: 0,
  },
  fraction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fractionValue: {
    fontFamily: AppFonts.semiBold,
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: 0,
  },
  fractionLine: {
    width: 18,
    height: 1,
    marginVertical: 1,
  },
});

export default ReadinessRing;
