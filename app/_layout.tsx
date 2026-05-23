import { ThemeProvider } from '@/providers/ThemeProvider';
import { useFonts } from 'expo-font';
import { QueryProvider } from '../providers/QueryProvider';
import { AuthProvider } from '../providers/AuthProvider';
import { RevenueCatProvider } from '../providers/RevenueCatProvider';
import React from 'react';
import ThemeWrapper from './ThemeWrapper';

//
export default function RootLayout() {
  //
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  //
  if (!loaded) {
    console.warn('Fonts not loaded yet');
    return null;
  }
  //
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <RevenueCatProvider>
            <ThemeWrapper />
          </RevenueCatProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
