import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TrackedTouchableOpacity } from './TrackedTouchableOpacity';

import { Colours } from '../../constants/Colours';
import { GlobalStyles } from '../../constants/Styles';

interface ColourPickerProps {
  label?: string;
  value: string;
  onChange: (colour: string) => void;
  colours?: string[];
  required?: boolean;
  error?: string;
  viewStyle?: ViewStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperText?: string;
  analyticsId: string;
}

const DEFAULT_COLORS = [
  '#C7654B',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
];

/** Renders a color swatch picker used in settings forms. */
export const ColourPicker: React.FC<ColourPickerProps> = ({
  label,
  value,
  onChange,
  colours = DEFAULT_COLORS,
  required = false,
  error,
  viewStyle,
  labelStyle,
  errorStyle,
  helperText,
  analyticsId,
}) => {
  return (
    <View style={[styles.container, viewStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <View style={styles.row}>
        {colours.map((colour) => {
          const selected = colour === value;
          return (
            <TrackedTouchableOpacity
              analyticsId={`${analyticsId}_swatch`}
              analyticsControlType="selector"
              key={colour}
              onPress={() => onChange(colour)}
              style={[
                styles.swatch,
                { backgroundColor: colour },
                selected && styles.selected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select colour ${colour}`}
            />
          );
        })}
      </View>

      {helperText && !error && (
        <Text style={GlobalStyles.helperText}>{helperText}</Text>
      )}

      {error && (
        <Text style={[GlobalStyles.helperText, styles.error, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '500',
    color: Colours.light.text,
  },
  required: {
    color: Colours.light.danger,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: Colours.light.primary,
    transform: [{ scale: 1.05 }],
  },
  error: {
    color: Colours.light.danger,
  },
});

export default ColourPicker;
