import { QueryProvider } from '../providers/QueryProvider';
import { AuthProvider } from '../providers/AuthProvider';
import { RevenueCatProvider } from '../providers/RevenueCatProvider';
import React from 'react';
import ThemeWrapper from './ThemeWrapper';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { initializeAnalyticsCollection } from '@/services/analyticsService';
import { initializeCrashReporting } from '@/services/crashReportingService';

/** Mounts the demo providers and local diagnostics boundary. */
export default function RootLayout() {
  React.useEffect(() => {
    void initializeAnalyticsCollection();
    void initializeCrashReporting();
  }, []);

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
