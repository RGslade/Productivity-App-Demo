import React from 'react';
import { TouchableOpacity, View, Text, ViewStyle, StyleSheet } from 'react-native';

//
interface CustomProps {
  options: string[];
  containerStyle?: ViewStyle;
  onSelect: (option: string) => void;
  selectedOption: string;
  enabled?: boolean | false;
}

/** Renders a compact segmented control with three or more options. */
//
export const TriOptionsButton = ({
  options,
  containerStyle,
  onSelect,
  selectedOption,
  enabled,
}: CustomProps) => {
  //
  return (
    <View style={[containerStyle, styles.optionGroup]}>
      {options.map(option => (
        <TouchableOpacity
          disabled={!enabled || false}
          key={option}
          style={[styles.option, selectedOption === option && styles.selectedOption]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.optionText, selectedOption === option && styles.selectedText]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

//
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
    backgroundColor: '#6200ee',
  },
  optionText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedText: {
    color: '#fff',
  },
});

