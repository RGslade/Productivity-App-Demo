import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colours } from '../../constants/Colours';
import { GlobalStyles } from '../../constants/Styles';
import { useThemeColour } from '@/hooks/useThemeColour';

//
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  viewStyle?: ViewStyle;
  direction?: 'row' | 'column';
}

/** Renders a labeled input with validation support. */
//
export const Input: React.FC<InputProps> = ({
  label, error, required = false, labelStyle, errorStyle, style, viewStyle, onFocus, onBlur, direction = 'column', ...props }) => {
  //
  const [isFocused, setIsFocused] = useState(false);
  //
  const danger = useThemeColour({}, 'danger');
  //
  const placeholderColour = useThemeColour({}, 'inputPlaceholder');
  //
  const textColour = useThemeColour({}, 'text');
  //
  const backgroundColour = useThemeColour({}, 'inputBackground')

  /** Marks the input as focused and forwards focus events. */
  //
  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  /** Marks the input as blurred and forwards blur events. */
  //
  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  /** Builds the final input style from focus and validation state. */
  //
  const inputStyle = useMemo((): TextStyle => {
    //
    const baseStyle = { ...GlobalStyles.input };
    //
    if (isFocused) {
      Object.assign(baseStyle, GlobalStyles.inputFocused);
    }

    //
    if (error) Object.assign(baseStyle, { borderColor: danger });

    return baseStyle;
  }, [danger, error, isFocused]);

  //
  return (
    <View style={[direction === 'row' ? styles.formGroupRow : styles.formGroupColumn, styles.formGroup, viewStyle]}>
      {label && (
        <Text style={[styles.label, {color: textColour}, labelStyle]}>
          {label} {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[inputStyle, style, direction === 'column' ? { width: '100%' } : '', { color: textColour }, {backgroundColor: backgroundColour}]} placeholderTextColor={placeholderColour}
        onFocus={handleFocus} onBlur={handleBlur} {...props}
      />

      {error && (
        <Text style={[GlobalStyles.helperText, { color: danger }, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

//
const styles = StyleSheet.create({
  formGroup: {
    // marginBottom: 10,
    display: 'flex',
  },

  formGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  formGroupColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  required: {
    color: Colours.light.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    marginBottom: 2,
    fontSize: 16,
    fontWeight: '500',
    // color: Colours.light.text,
  },
});

//
export default Input;
