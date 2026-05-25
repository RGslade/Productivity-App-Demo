import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Navbar } from '@/components/ui/Navbar';
import { LegalAcceptanceModal } from '@/components/LegalAcceptanceModal';
import MyBanner from '@/components/AdDisplay';
import RequiredUpdateGate from '@/components/RequiredUpdateGate';
import { useThemeContext } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAppState } from '@/hooks/AppStateHandler';
import { ThemedView } from '@/components/ThemedView';
import { appUpdateService, MandatoryUpdateState } from '@/services/appUpdateService';
import { settingsService } from '@/services/settingsService';
import { userService } from '@/services/userService';
import { Colours } from '@/constants/Colours';

/** Resolves feature-detail routes back to their main list screen. */
function getMainRouteForDetailPath(pathname: string) {
  if (pathname === '/todo/add' || pathname.startsWith('/todo/edit/')) return '/todo';
  if (pathname === '/budget/add' || pathname.startsWith('/budget/edit/')) return '/budget';
  if (pathname === '/notes/add' || pathname.startsWith('/notes/edit/')) return '/notes';
  if (pathname.startsWith('/documents/viewer/')) return '/documents';
  if (pathname === '/grades/add' || pathname.startsWith('/grades/edit/')) return '/grades';
  return null;
}

export default function ThemeWrapper() {
  const { theme } = useThemeContext();
  const { userInfo, isAuthenticated, refreshAuth } = useAuth();
  const { isConfigured, isSupported, isAdFree } = useSubscriptions();
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingMandatoryUpdate, setIsCheckingMandatoryUpdate] = useState(true);
  const [legalVersions, setLegalVersions] = useState({ terms: 'v1', privacy: 'v1', lifenest: 'v1' });
  const [legalAcceptanceLoading, setLegalAcceptanceLoading] = useState(false);
  const [mandatoryUpdateState, setMandatoryUpdateState] = useState<MandatoryUpdateState>({
    isRequired: false,
    minimumVersion: null,
    currentVersion: Constants.expoConfig?.version || '0.0.0',
    storeUrl: null,
  });
  const hasDbAdFreeState =
    Boolean(userInfo?.is_premium_user) ||
    (userInfo?.subscription_status === 'active' && !userInfo?.is_premium_user);
  const shouldShowBanner = Boolean(
    userInfo &&
    !(
      (isSupported && isConfigured ? isAdFree : false) ||
      hasDbAdFreeState
    )
  );


  const shouldShowLegalModal = Boolean(
    isAuthenticated &&
    userInfo?.id &&
    (
      userInfo.terms_accepted !== true ||
      userInfo.terms_version_accepted !== legalVersions.terms ||
      userInfo.privacy_policy_accepted !== true ||
      userInfo.privacy_policy_version_accepted !== legalVersions.privacy ||
      userInfo.lifenest_terms_accepted !== true ||
      userInfo.lifenest_terms_version_accepted !== legalVersions.lifenest
    )
  );

  /** Refreshes active legal-document versions for the post-auth acceptance modal. */
  useEffect(() => {
    let isCancelled = false;

    const loadLegalVersions = async () => {
      if (!isAuthenticated) return;
      const versions = await settingsService.getLegalDocumentVersions();
      if (!isCancelled) {
        setLegalVersions(versions);
      }
    };

    void loadLegalVersions();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  /** Saves acceptance for all current policy confirmations and refreshes auth profile state. */
  const handleAcceptLegalDocuments = useCallback(async () => {
    if (!userInfo?.id) return;

    try {
      setLegalAcceptanceLoading(true);
      const acceptedAt = new Date().toISOString();
      await userService.updateProfile({
        terms_accepted: true,
        terms_accepted_at: acceptedAt,
        terms_version_accepted: legalVersions.terms,
        privacy_policy_accepted: true,
        privacy_policy_accepted_at: acceptedAt,
        privacy_policy_version_accepted: legalVersions.privacy,
        lifenest_terms_accepted: true,
        lifenest_terms_accepted_at: acceptedAt,
        lifenest_terms_version_accepted: legalVersions.lifenest,
      });
      await refreshAuth();
    } finally {
      setLegalAcceptanceLoading(false);
    }
  }, [legalVersions, refreshAuth, userInfo?.id]);

  /** Loads and stores current mandatory-update enforcement state. */
  const checkMandatoryUpdate = useCallback(async () => {
    const currentVersion = Constants.expoConfig?.version || '0.0.0';
    const nextState = await appUpdateService.getMandatoryUpdateState(currentVersion);
    setMandatoryUpdateState(nextState);
    setIsCheckingMandatoryUpdate(false);
  }, []);

  const handleAppForegroundNavigation = useCallback(() => {
    if (!isAuthenticated) return;
    if (!pathname || pathname.startsWith('/(auth)')) return;

    const mainRoute = getMainRouteForDetailPath(pathname);
    if (!mainRoute || mainRoute === pathname) return;

    router.replace(mainRoute as any);
  }, [isAuthenticated, pathname, router]);

  useAppState(
    () => {
      checkMandatoryUpdate();
      handleAppForegroundNavigation();
    },
    'theme-wrapper-foreground-route-normalize',
    ['active']
  );

  useEffect(() => {
  }, [pathname]);

  useEffect(() => {
    checkMandatoryUpdate();
  }, [checkMandatoryUpdate]);

  if (isCheckingMandatoryUpdate) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (mandatoryUpdateState.isRequired) {
    return (
      <RequiredUpdateGate
        currentVersion={mandatoryUpdateState.currentVersion}
        minimumVersion={mandatoryUpdateState.minimumVersion}
        storeUrl={mandatoryUpdateState.storeUrl}
      />
    );
  }

  const appNavigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: Colours[theme === 'dark' ? 'dark' : 'light'].primary,
      background: Colours[theme === 'dark' ? 'dark' : 'light'].background,
      card: Colours[theme === 'dark' ? 'dark' : 'light'].navigationBackground,
      text: Colours[theme === 'dark' ? 'dark' : 'light'].text,
      border: Colours[theme === 'dark' ? 'dark' : 'light'].border,
      notification: Colours[theme === 'dark' ? 'dark' : 'light'].premiumAccent,
    },
  };

  return (
    <NavigationThemeProvider value={appNavigationTheme}>
      <Stack screenOptions={{
        header: ({ navigation, route, options, back }: { navigation: any; route: any; options: any; back?: any }) => {
          return <Navbar title={options.title ?? route.name} showBack={!!back} onBack={() => navigation.goBack()} />;
        }
      }}>
        <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Register' }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ title: 'Forgot Password' }} />
        <Stack.Screen name="(auth)/change-password" options={{ title: 'Change Password' }} />
        <Stack.Screen name="(tabs)/index" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="budget/index" options={{ title: 'Budget' }} />
        <Stack.Screen name="budget/add" options={{ title: 'Add Transaction' }} />
        {/* <Stack.Screen name="jobSearch/index" options={{ title: 'Job Search' }} /> */}
        {/* <Stack.Screen name="housingSearch/index" options={{ title: 'Housing Search' }} /> */}
        <Stack.Screen name="documents/index" options={{ title: 'Documents' }} />
        <Stack.Screen name="notes/index" options={{ title: 'Notes' }} />
        <Stack.Screen name="subscribe/index" options={{ title: 'Get Tokens' }} />
        <Stack.Screen name="lifenest/index" options={{ title: 'LifeNest' }} />
        <Stack.Screen name="links/index" options={{ title: 'Links' }} />
        <Stack.Screen name="myNews/index" options={{ title: 'My News' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings & Feedback' }} />
        <Stack.Screen name="helpAndFeedback/index" options={{ title: 'Help & Feedback' }} />
        <Stack.Screen name="todo/index" options={{ title: 'Tasks & Checklists' }} />
        <Stack.Screen name="[page]/index" options={{ title: 'Not Found' }} />
        <Stack.Screen name="documents/viewer/[id]" options={{ title: 'Document Viewer' }} />
        <Stack.Screen name="budget/edit/[id]" options={{ title: 'Edit Transaction' }} />
        <Stack.Screen name='todo/edit/[id]' options={{ title: 'Edit Task / Checklist' }} />
        <Stack.Screen name='todo/add' options={{ title: 'Add Task / Checklist' }} />
        <Stack.Screen name="notes/add" options={{ title: 'Add Note' }} />
        <Stack.Screen name="notes/edit/[id]" options={{ title: 'Edit Note' }} />
        <Stack.Screen name="grades/index" options={{ title: 'Grades' }} />
        <Stack.Screen name="grades/add" options={{ title: 'Add Grade' }} />
        <Stack.Screen name="grades/edit/[id]" options={{ title: 'Edit Grade' }} />
      </Stack>
      <StatusBar barStyle={Colours[theme === 'dark' ? 'dark' : 'light'].statusBarStyle} translucent backgroundColor="transparent" />
      <LegalAcceptanceModal
        visible={shouldShowLegalModal}
        versions={legalVersions}
        loading={legalAcceptanceLoading}
        onAccept={handleAcceptLegalDocuments}
      />
      {shouldShowBanner && <MyBanner />}
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
