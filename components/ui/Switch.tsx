import React from 'react';
import { View, Text, Switch as RNSwitch, StyleSheet, ViewStyle, TextStyle, SwitchProps, StyleProp} from 'react-native';
import { useThemeColour } from '@/hooks/useThemeColour';

interface CustomSwitchProps extends SwitchProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  description?: string;
  descriptionStyle?: StyleProp<TextStyle>;
}

/** Renders a switch with optional label and description text. */
export const Switch: React.FC<CustomSwitchProps> = ({
  label, containerStyle, labelStyle, description, descriptionStyle, value, onValueChange,
  ...props
}) => {
  const primary = useThemeColour({}, 'primary');
  const textColour = useThemeColour({}, 'text');
  const secondaryTextColour = useThemeColour({}, 'textSecondary');

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        {label && (
          <Text style={[styles.label, { color: textColour }, labelStyle]}>
            {label}
          </Text>
        )}
        {description && (
          <Text style={[styles.description, { color: secondaryTextColour }, descriptionStyle]}>
            {description}
          </Text>
        )}
      </View>
      
      <RNSwitch value={value} onValueChange={onValueChange}
        trackColor={{
          false: '#D1D5DB',
          true: primary,
        }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
        ios_backgroundColor="#D1D5DB"
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  
  content: {
    flex: 1,
    marginRight: 16,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
});
export default Switch;
