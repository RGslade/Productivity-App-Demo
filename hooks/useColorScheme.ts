import { useThemeContext } from '@/providers/ThemeProvider';

// Returns the effective theme: 'light' or 'dark'
export function useColorScheme() {
  const { theme } = useThemeContext();
  return theme;
}
