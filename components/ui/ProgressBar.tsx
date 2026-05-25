import { useThemeColour } from '@/hooks/useThemeColour';
import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';

interface ProgressBarProps {
  percentage: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  containerStyle?: ViewStyle;
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
        <Text style={[styles.label, {color: textColour}]}>{clamped}%</Text>
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
    padding: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  barBackground: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#6200ee',
  },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    fontSize: 16,
  },
});

