import { View, type ViewProps } from 'react-native';
import { useThemeColour } from '@/hooks/useThemeColour';

//
export type ThemedViewProps = ViewProps & {
  lightColour?: string;
  darkColour?: string;
};

//
export function ThemedView({ style, lightColour, darkColour, ...otherProps }: ThemedViewProps) {
  //
  const backgroundColor = useThemeColour({ light: lightColour, dark: darkColour }, 'cardBackground');
  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
