import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Navbar } from '@/components/ui/Navbar';
import { BottomNav } from '@/components/ui/BottomNav';
import { LegalAcceptanceModal } from '@/components/LegalAcceptanceModal';
import MyBanner from '@/components/AdDisplay';
import RequiredUpdateGate from '@/components/RequiredUpdateGate';
import { useThemeContext } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAppState } from '@/hooks/AppStateHandler';
import { addCrashBreadcrumb, installGlobalCrashLogger } from '@/services/crashLogger';
import { ThemedView } from '@/components/ThemedView';
import { appUpdateService, MandatoryUpdateState } from '@/services/appUpdateService';
import { settingsService } from '@/services/settingsService';
import { isAuthenticationRequiredError, userService } from '@/services/userService';
import { replaceTopLevelRoute } from '@/services/navigationService';
import { Colours } from '@/constants/Colours';
import { recurringTransactionService } from '@/services/recurringTransactionService';
import { examService } from '@/services/examService';

const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password', '/change-password']);
const NAV_STRIP_HEIGHT = 60;
const MOBILE_PLATFORMS = new Set(['ios', 'android']);
// AdSense is reserved for the public editorial pages. Private app screens are
// not public content pages and should not load the web display unit.
const WEB_AD_ROUTES = new Set<string>();
const MIN_BACKGROUND_ROUTE_NORMALIZE_MS = 5000;

/** Resolves feature-detail routes back to their main list screen. */
function getMainRouteForDetailPath(pathname: string) {
  if (pathname === '/todo/add' || pathname.startsWith('/todo/edit/')) return '/todo';
  if (pathname === '/budget/add' || pathname.startsWith('/budget/edit/')) return '/budget';
  if (pathname === '/help/add') return '/help';
  if (pathname.startsWith('/help/edit/')) return '/help';
  if (pathname === '/notes/add' || pathname.startsWith('/notes/edit/')) return '/notes';
  if (pathname.startsWith('/documents/viewer/')) return '/help';
  if (pathname === '/grades/add' || pathname.startsWith('/grades/edit/')) return '/exams';
  if (pathname === '/exams/add' || pathname.startsWith('/exams/edit/') || pathname.startsWith('/exams/result/')) return '/exams';
  return null;
}

export default function ThemeWrapper() {
  const { theme } = useThemeContext();
  const { userInfo, isAuthenticated, refreshAuth } = useAuth();
  const { customerInfo, isConfigured, isSupported, isAdFree } = useSubscriptions();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const backgroundedAtRef = useRef<number | null>(null);
  const [isCheckingMandatoryUpdate, setIsCheckingMandatoryUpdate] = useState(true);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [legalVersions, setLegalVersions] = useState({ terms: 'v1', privacy: 'v1', lifenest: 'v1' });
  const [legalAcceptanceLoading, setLegalAcceptanceLoading] = useState(false);
  const [mandatoryUpdateState, setMandatoryUpdateState] = useState<MandatoryUpdateState>({
    isRequired: false,
    minimumVersion: null,
    currentVersion: Constants.expoConfig?.version || '0.0.0',
    storeUrl: null,
  });
  const subscriptionStateReady = Boolean(
    (__DEV__ && Platform.OS === 'web') ||
    !isSupported ||
    (isConfigured && customerInfo)
  );
  const shouldShowBanner = Boolean(
    userInfo &&
    subscriptionStateReady &&
    !isAdFree &&
    (Platform.OS !== 'web' || WEB_AD_ROUTES.has(pathname ?? ''))
  );
  const mobileBannerHeight = MOBILE_PLATFORMS.has(Platform.OS) ? bannerHeight : 0;

  const shouldShowLegalModal = Boolean(
    isAuthenticated &&
    userInfo?.id &&
    !pathname?.startsWith('/legal') &&
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
  const handleAcceptLegalDocuments = useCallback(async (viewedAt: { terms: string | null; privacy: string | null; lifenest: string | null }) => {
    if (!userInfo?.id) return;

    try {
      setLegalAcceptanceLoading(true);
      const acceptedAt = new Date().toISOString();
      await userService.updateProfile({
        terms_accepted: true,
        terms_accepted_at: acceptedAt,
        terms_version_accepted: legalVersions.terms,
        terms_viewed_at: viewedAt.terms ?? acceptedAt,
        terms_version_viewed: legalVersions.terms,
        privacy_policy_accepted: true,
        privacy_policy_accepted_at: acceptedAt,
        privacy_policy_version_accepted: legalVersions.privacy,
        privacy_policy_viewed_at: viewedAt.privacy ?? acceptedAt,
        privacy_policy_version_viewed: legalVersions.privacy,
        lifenest_terms_accepted: true,
        lifenest_terms_accepted_at: acceptedAt,
        lifenest_terms_version_accepted: legalVersions.lifenest,
        lifenest_terms_viewed_at: viewedAt.lifenest ?? acceptedAt,
        lifenest_terms_version_viewed: legalVersions.lifenest,
      });
      await refreshAuth();
    } finally {
      setLegalAcceptanceLoading(false);
    }
  }, [legalVersions, refreshAuth, userInfo?.id]);

  /** Loads and stores current mandatory-update enforcement state. */
  const checkMandatoryUpdate = useCallback(async () => {
    const currentVersion = Constants.expoConfig?.version || '0.0.0';
    try {
      const nextState = await appUpdateService.getMandatoryUpdateState(currentVersion);
      setMandatoryUpdateState(nextState);
      setIsCheckingMandatoryUpdate(false);
    } catch (error) {
      throw error;
    }
  }, []);

  const handleAppForegroundNavigation = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }
    if (!pathname) {
      return;
    }
    if (pathname.startsWith('/(auth)')) {
      return;
    }

    const mainRoute = getMainRouteForDetailPath(pathname);
    if (!mainRoute) {
      return;
    }
    if (mainRoute === pathname) {
      return;
    }

    replaceTopLevelRoute(mainRoute as any);
  }, [isAuthenticated, pathname]);

  useAppState(
    () => {
      backgroundedAtRef.current = Date.now();
    },
    'theme-wrapper-track-background-state',
    ['background']
  );

  useAppState(
    () => {
      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (!backgroundedAt) {
        return;
      }

      const elapsedMs = Date.now() - backgroundedAt;
      addCrashBreadcrumb('app_foreground', undefined, pathname || 'unknown');
      if (elapsedMs < MIN_BACKGROUND_ROUTE_NORMALIZE_MS) {
        return;
      }

      checkMandatoryUpdate();
      void refreshAuth();
      void recurringTransactionService.generateDueTransactions().catch((error) => {
        if (!isAuthenticationRequiredError(error)) console.error('ThemeWrapper.recurringCatchUp', error);
      });
      void examService.checkAndNotifyDueReminders().catch((error) => {
        if (!isAuthenticationRequiredError(error)) console.error('ThemeWrapper.examReminders', error);
      });
      handleAppForegroundNavigation();
    },
    'theme-wrapper-foreground-route-normalize',
    ['active']
  );

  useEffect(() => {
    installGlobalCrashLogger(() => pathname || 'unknown');
  }, [pathname]);

  useEffect(() => {
    checkMandatoryUpdate();
  }, [checkMandatoryUpdate]);

  useEffect(() => {
    if (!shouldShowBanner) {
      setBannerHeight(0);
    }
  }, [shouldShowBanner]);

  /** Tracks the rendered banner height so floating mobile navigation can sit above it. */
  const handleBannerHeightChange = useCallback((height: number) => {
    setBannerHeight((current) => (Math.abs(current - height) > 1 ? height : current));
  }, []);

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

  const showBottomNav = Boolean(
    Platform.OS !== 'web' &&
    isAuthenticated &&
    pathname &&
    !pathname.startsWith('/(auth)') &&
    !AUTH_PATHS.has(pathname)
  );

  return (
    <NavigationThemeProvider value={appNavigationTheme}>
      <View
        style={[
          styles.stackHost,
          { backgroundColor: Colours[theme === 'dark' ? 'dark' : 'light'].background },
          showBottomNav ? { paddingBottom: NAV_STRIP_HEIGHT + Math.max(insets.bottom, 14) } : null,
        ]}
      >
        <Stack screenOptions={{
          header: ({ navigation, route, options, back }: { navigation: any; route: any; options: any; back?: any }) => {
            return (
              <Navbar
                title={options.title ?? route.name}
                showBack={!!back}
                onBack={() => {
                  const fallbackRoute = getMainRouteForDetailPath(pathname) ?? '/(tabs)';
                  if (navigation.canGoBack()) navigation.goBack();
                  else replaceTopLevelRoute(fallbackRoute as any);
                }}
              />
            );
          }
        }}>
          <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
          <Stack.Screen name="(auth)/register" options={{ title: 'Register' }} />
          <Stack.Screen name="(auth)/forgot-password" options={{ title: 'Forgot Password' }} />
          <Stack.Screen name="(auth)/change-password" options={{ title: 'Change Password' }} />
          <Stack.Screen name="(public)/about" options={{ title: 'About Productivity Mobile App' }} />
          <Stack.Screen name="(public)/resources" options={{ title: 'Independent-Living Resources' }} />
          <Stack.Screen name="(public)/contact" options={{ title: 'Contact' }} />
          <Stack.Screen name="auth/callback" options={{ title: 'Signing In' }} />
          <Stack.Screen name="(tabs)/index" options={{ title: 'Dashboard' }} />
          <Stack.Screen name="budget/index" options={{ title: 'Budget' }} />
          <Stack.Screen name="budget/add" options={{ title: 'Add Transaction' }} />
          <Stack.Screen name="jobSearch/index" options={{ title: 'Job Search' }} />
          <Stack.Screen name="housingSearch/index" options={{ title: 'Housing Search' }} />
          <Stack.Screen name="documents/index" options={{ title: 'Help' }} />
          <Stack.Screen name="help/index" options={{ title: 'Help' }} />
          <Stack.Screen name="help/add" options={{ title: 'Add Custom Link' }} />
          <Stack.Screen name="help/edit/[id]" options={{ title: 'Edit Custom Link' }} />
          <Stack.Screen name="notes/index" options={{ title: 'Notes' }} />
          <Stack.Screen name="exams/index" options={{ title: 'Education' }} />
          <Stack.Screen name="exams/add" options={{ title: 'Add Exam' }} />
          <Stack.Screen name="exams/edit/[id]" options={{ title: 'Edit Exam' }} />
          <Stack.Screen name="exams/result/[id]" options={{ title: 'Exam Result' }} />
          <Stack.Screen name="subscribe/index" options={{ title: 'Get Tokens' }} />
          <Stack.Screen name="lifenest/index" options={{ title: 'LifeNest' }} />
          <Stack.Screen name="links/index" options={{ title: 'Help' }} />
          <Stack.Screen name="myNews/index" options={{ title: 'My News' }} />
          <Stack.Screen name="settings/index" options={{ title: 'Settings & Feedback' }} />
          <Stack.Screen name="helpAndFeedback/index" options={{ title: 'Help & Feedback' }} />
          <Stack.Screen name="legal/[document]" options={{ title: 'Legal' }} />
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
      </View>
      <StatusBar barStyle={Colours[theme === 'dark' ? 'dark' : 'light'].statusBarStyle} translucent backgroundColor="transparent" />
      {showBottomNav && <BottomNav bottomOffset={mobileBannerHeight} />}
      <LegalAcceptanceModal visible={shouldShowLegalModal} versions={legalVersions} loading={legalAcceptanceLoading} onAccept={handleAcceptLegalDocuments}/>
      {shouldShowBanner && <MyBanner onBannerHeightChange={handleBannerHeightChange} />}
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  stackHost: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
