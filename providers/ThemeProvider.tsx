import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {settingsService} from '@/services/settingsService';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { ThemeContextProps, ThemeMode } from '@/types/theme';

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {settingsService.getTheme().then((savedMode) => {setModeState(savedMode);});}, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    settingsService.setTheme(newMode);
  };

  // Always resolve to 'light' or 'dark' for theme
  const theme = mode === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeContext.Provider value={{ mode, setMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Return a default context instead of throwing
    // This prevents crashes when hook is used outside provider
    return {
      mode: 'system' as ThemeMode,
      setMode: () => {},
      theme: 'light' as const,
    };
  }
  return ctx;
};
