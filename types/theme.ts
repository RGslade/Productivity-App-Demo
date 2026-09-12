export type ThemeType = 'light' | 'dark';
export type ThemeMode = ThemeType | 'system';

export interface ThemeContextProps {
  theme: ThemeType; // always 'light' or 'dark'
  setMode: (mode: ThemeMode) => void;
  mode: ThemeMode; // 'light' | 'dark' | 'system'
}
