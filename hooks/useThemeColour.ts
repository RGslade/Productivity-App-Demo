import { Colours } from '@/constants/Colours';
import { useThemeContext } from '@/providers/ThemeProvider';

//
export function useThemeColour(
  props: { light?: string; dark?: string } = {},
  colourName: keyof typeof Colours.light & keyof typeof Colours.dark
) {
  //
  const { theme } = useThemeContext();
  //
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  //
  const colourFromProps = props[resolvedTheme];
  //
  const palette = Colours[resolvedTheme] ?? Colours.light;

  //
  if (colourFromProps) {
    return colourFromProps;
  } else {
    return palette[colourName];
  }
}
