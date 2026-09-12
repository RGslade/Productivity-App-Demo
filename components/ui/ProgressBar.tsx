import { useThemeColour } from '@/hooks/useThemeColour';
import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { AppFonts } from '@/constants/Fonts';

interface ProgressBarProps {
  percentage: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  containerStyle?: ViewStyle;
}

/** Formats calculated progress without noisy repeating decimals. */
export function formatProgressPercentage(percentage: number): string {
  if (Math.abs(percentage - (100 / 3)) < 0.01) return 'â…“';
  if (Math.abs(percentage - (200 / 3)) < 0.01) return 'â…”';
  if (percentage >= 99.995 && percentage < 100) return '99%';

  const rounded = Math.round(percentage * 100) / 100;
  return `${rounded}%`;
}

/** Renders a progress indicator with an optional editable percentage input. */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  editable = false,
  onChange,
  containerStyle,
}) => {
  const clamped = Math.max(0, Math.min(percentage, 100));
const textColour = useThemeColour({}, 'text');
  /** Parses user input and emits valid numeric progress values. */
  const handleChangeText = (text: string) => {
    const num = parseInt(text, 10);
    if (!Number.isNaN(num) && onChange) {
      onChange(num);
    }
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, {color: textColour}]}>Progress:</Text>
        <Text style={[styles.label, {color: textColour}]}>{formatProgressPercentage(clamped)}</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${clamped}%` }]} />
      </View>
      {editable && (
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(clamped)}
          onChangeText={handleChangeText}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: AppFonts.semiBold,
    fontSize: 13,
    letterSpacing: 0,
  },
  barBackground: {
    height: 7,
    backgroundColor: 'rgba(30, 28, 25, 0.09)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#C05F3C',
  },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(30, 28, 25, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 15,
    fontFamily: AppFonts.regular,
    fontSize: 15,
  },
});
