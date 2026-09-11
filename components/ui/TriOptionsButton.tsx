import React from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { TrackedTouchableOpacity } from './TrackedTouchableOpacity';

interface CustomProps {
  options: string[];
  containerStyle?: ViewStyle;
  onSelect: (option: string) => void;
  selectedOption: string;
  enabled?: boolean | false;
  analyticsId: string;
}

/** Renders a compact segmented control with three or more options. */
export const TriOptionsButton = ({
  options,
  containerStyle,
  onSelect,
  selectedOption,
  enabled,
  analyticsId,
}: CustomProps) => {
  return (
    <View style={[containerStyle, styles.optionGroup]}>
      {options.map(option => (
        <TrackedTouchableOpacity
          analyticsId={`${analyticsId}_select`}
          analyticsControlType="selector"
          disabled={!enabled || false}
          key={option}
          style={[styles.option, selectedOption === option && styles.selectedOption]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.optionText, selectedOption === option && styles.selectedText]}>
            {option}
          </Text>
        </TrackedTouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  optionGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#C7654B',
  },
  optionText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedText: {
    color: '#fff',
  },
});
