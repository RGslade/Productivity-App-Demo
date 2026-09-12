import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useSegments } from 'expo-router';
import { getSession, supabase, validateSession } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserInfo } from '@/types/user';
import databaseService from '@/services/databaseService';
import { settingsService } from '@/services/settingsService';
import { ThemedView } from '@/components/ThemedView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AppStateStatus, Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  configureNotifications,
  clearAllNotifications,
  registerForPushNotifications,
  defineBackgroundNotificationTask,
  registerBackgroundNotificationTask,
  unregisterBackgroundNotificationTask,
} from '@/hooks/NotificationHandler';
import { todoNotificationService } from '@/services/todoNotificationService';
import { addCrashBreadcrumb } from '@/services/crashLogger';
import { isAuthenticationRequiredError, userService } from '@/services/userService';
import { authService } from '@/services/authService';
import { recurringTransactionService } from '@/services/recurringTransactionService';
import { examService } from '@/services/examService';
import { useAppState } from '@/hooks/AppStateHandler';

interface AuthContextType {
  user: User | null;
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

/** Masks an auth user's email address before writing auth diagnostics. */
function maskEmailForLog(value?: string | null): string | null {
  if (!value) return null;

  const [localPart = '', domain = ''] = value.split('@');
  const maskedLocal = localPart.length <= 2
    ? `${localPart.charAt(0) || '*'}***`
    : `${localPart.slice(0, 2)}***`;

  return domain ? `${maskedLocal}@${domain}` : maskedLocal;
}

/** Formats a Supabase auth provider id for account-completion copy. */
function formatAuthProviderName(provider?: string | null): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'apple':
      return 'Apple';
    case 'spotify':
      return 'Spotify';
    default:
      return 'third-party login';
  }
}

type HydrateResult = 'authenticated' | 'incomplete_profile' | 'signed_out';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const segments = useSegments();
  const queryClient = useQueryClient();
  const refreshAuthPromiseRef = useRef<Promise<boolean> | null>(null);
  const notificationSyncKeyRef = useRef<string | null>(null);
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const { data: accountSettings } = useQuery({
    queryKey: ['settings', 'account'],
    queryFn: () => settingsService.getAccountSettings(),
    enabled: Boolean(isAuthenticated && userInfo?.id),
    staleTime: 5 * 60 * 1000,
  });


  useEffect(() => {
    const syncNotifications = async () => {
      try {
        if (!isAuthenticated || !userInfo) {
          if (notificationSyncKeyRef.current === 'signed-out') return;
          notificationSyncKeyRef.current = 'signed-out';
          await unregisterBackgroundNotificationTask();
          await clearAllNotifications();
          return;
        }

        if (accountSettings?.notifications_enabled === false) {
          const disabledKey = `${userInfo.id}:disabled`;
          if (notificationSyncKeyRef.current === disabledKey) return;
          notificationSyncKeyRef.current = disabledKey;
          await unregisterBackgroundNotificationTask();
          await clearAllNotifications();
          return;
        }

        if (!accountSettings) {
          return;
        }

        const enabledKey = `${userInfo.id}:enabled`;
        if (notificationSyncKeyRef.current === enabledKey) return;
        notificationSyncKeyRef.current = enabledKey;

        void recurringTransactionService.generateDueTransactions().catch((error) => {
          if (!isAuthenticationRequiredError(error)) console.error('AuthProvider.recurringCatchUp', error);
        });
        void examService.checkAndNotifyDueReminders().catch((error) => {
          if (!isAuthenticationRequiredError(error)) console.error('AuthProvider.examReminders', error);
        });

        await configureNotifications();
        await registerForPushNotifications();

        const username = userInfo.first_name || userInfo.email_address || 'Friend';
        defineBackgroundNotificationTask(async () => {
          await todoNotificationService.handleBackgroundNotifications(
            userInfo.id,
            username
          );
          await examService.checkAndNotifyDueReminders();
          await recurringTransactionService.generateDueTransactions();
        });
        await registerBackgroundNotificationTask(900);
      } catch (error) {
        notificationSyncKeyRef.current = null;
        if (!isAuthenticationRequiredError(error)) console.error('Error syncing notifications:', error);
      }
    };

    syncNotifications();
  }, [accountSettings, isAuthenticated, userInfo]);

  /** Log app permissions on start (Android only) */
  useEffect(() => {
    const logPermissions = async () => {
      if (Platform.OS !== 'android') return;

      try {
        const permissionEntries = Object.entries(PermissionsAndroid.PERMISSIONS);
        await Promise.all(
          permissionEntries.map(async ([name, value]) => {
            const granted = await PermissionsAndroid.check(value);
            return { name, value, granted };
          })
        );
      } catch (error) {
        console.error('[Permissions] Error checking permissions:', error);
      }
    };

    logPermissions();
  }, []);

  /** CENTRAL session validation */
  const hydrateUser = useCallback(async (session: Session | null, source: 'bootstrap' | 'auth_event' | 'refresh' = 'auth_event'): Promise<HydrateResult> => {
    if (!session?.user) {
      addCrashBreadcrumb('auth_hydrate_no_session');
      setUser(null);
      setUserInfo(null);
      setIsAuthenticated(false);
      userService.clearCachedUserProfile();
      queryClient.clear();
      // Stop background notifications when user logs out
      try {
        await unregisterBackgroundNotificationTask();
        await clearAllNotifications();
      } catch (error) {
        console.error('[Auth][Provider] Error unregistering background task on logout', error);
      }
      return 'signed_out';
    }

    try {
      const maskedEmail = maskEmailForLog(session.user.email);
      addCrashBreadcrumb('auth_hydrate_started', {
        authUserId: session.user.id,
        email: maskedEmail,
      });

      const { data: profile } = await databaseService.getSingleGlobal<UserInfo>('Users_Info', 'auth_user_id', session.user?.id);

      // ðŸ”‘ PROFILE NOT READY YET (REGISTER FLOW)
      if (!userService.isProfileComplete(profile)) {
        console.warn('[Auth][Provider] Auth user profile is missing or incomplete', {
          authUserId: session.user.id,
          email: maskedEmail,
          source,
        });
        addCrashBreadcrumb('auth_hydrate_profile_missing', {
          authUserId: session.user.id,
          email: maskedEmail,
        });
        if (source === 'bootstrap') {
          console.warn('[Auth][Provider] Clearing persisted incomplete auth session on bootstrap', {
            authUserId: session.user.id,
            email: maskedEmail,
          });
          await supabase.auth.signOut();
          setUser(null);
          setUserInfo(null);
          setIsAuthenticated(false);
          userService.clearCachedUserProfile();
          return 'incomplete_profile';
        }
        setUser(session.user);
        setUserInfo(null);
        setIsAuthenticated(false);
        const prefill = await userService.getCurrentAccountCompletionPrefill().catch(() => null);
        router.replace({
          pathname: '/(auth)/register',
          params: {
            isCompleting: 'true',
            authProvider: formatAuthProviderName(session.user.app_metadata?.provider),
            prefillEmail: prefill?.email || session.user.email || '',
            prefillFirstName: prefill?.first_name || '',
            prefillMiddleNames: prefill?.middle_names || '',
            prefillLastName: prefill?.surname || '',
            prefillBirthDate: prefill?.birth_date || '',
            prefillJobStatus: prefill?.job_status || '',
          },
        });
        return 'incomplete_profile';
      }

      profile.email_address = session.user.email || '';
      setUser(session.user);
      setUserInfo(profile);
      setIsAuthenticated(true);
      userService.setCachedUserProfile(profile);
      queryClient.setQueryData(['auth', 'currentUser'], profile);
      addCrashBreadcrumb('auth_hydrate_success', {
        authUserId: session.user.id,
        profileId: profile.id,
        email: maskedEmail,
      });
      return 'authenticated';
    } catch (e) {
      console.error('[Auth][Provider] Hydration failed', {
        authUserId: session.user.id,
        email: maskEmailForLog(session.user.email),
        message: e instanceof Error ? e.message : String(e),
      });
      addCrashBreadcrumb('auth_hydrate_error', {
        authUserId: session.user.id,
        message: e instanceof Error ? e.message : String(e),
      });
      if (source === 'bootstrap') {
        // Keep the restored session available while bootstrap performs its one refresh retry.
        setUser(session.user);
        setIsAuthenticated(true);
        return 'signed_out';
      }
      await supabase.auth.signOut();
      return 'signed_out';
    }
  }, [queryClient]);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    if (refreshAuthPromiseRef.current) {
      return refreshAuthPromiseRef.current;
    }

    const refreshPromise = (async () => {
      const { data } = await getSession();
      const session = data.session;

      if (!session?.user) {
        await hydrateUser(null, 'refresh');
        console.warn('[Auth][Provider] Manual auth refresh found no session');
        return false;
      }

      const validation = await validateSession();
      if (validation.error || !validation.data.user) {
        console.warn('[Auth][Provider] Supabase session validation failed during refresh', {
          authUserId: session.user.id,
          message: validation.error?.message || 'missing_user',
        });
        addCrashBreadcrumb('auth_session_validation_failed_refresh', { authUserId: session.user.id });
        await supabase.auth.signOut();
        await hydrateUser(null, 'refresh');
        router.replace({ pathname: '/(auth)/login', params: { reason: 'session_expired' } });
        return false;
      }

      for (let attempt = 0; attempt < 4; attempt++) {
        const hydrationResult = await hydrateUser({ ...session, user: validation.data.user }, 'refresh');
        if (hydrationResult === 'authenticated') {
          return true;
        }
        if (hydrationResult === 'incomplete_profile') {
          return false;
        }
        await wait(250);
      }
      console.warn('[Auth][Provider] Manual auth refresh ended without completed hydration', {
        authUserId: session.user.id,
        email: maskEmailForLog(session.user.email),
      });
      return false;
    })().finally(() => {
      refreshAuthPromiseRef.current = null;
    });

    refreshAuthPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [hydrateUser]);

  /** Initial load + auth listener */
  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const { data } = await getSession();
        const initialSession = data.session;

        if (!initialSession?.user) {
          if (isMounted) setIsReady(true);
          await hydrateUser(null, 'bootstrap');
          return;
        }

        // Validate the persisted session before rendering protected app state.
        const validation = await validateSession();
        if (validation.error || !validation.data.user) {
          console.warn('[Auth][Provider] Supabase session validation failed during bootstrap', {
            authUserId: initialSession.user.id,
            message: validation.error?.message || 'missing_user',
          });
          addCrashBreadcrumb('auth_session_validation_failed_bootstrap', { authUserId: initialSession.user.id });
          await supabase.auth.signOut();
          await hydrateUser(null, 'bootstrap');
          router.replace({ pathname: '/(auth)/login', params: { reason: 'session_expired' } });
          return;
        }

        setUser(validation.data.user);
        setIsAuthenticated(true);
        if (isMounted) setIsReady(true);

        const initialResult = await hydrateUser({ ...initialSession, user: validation.data.user }, 'bootstrap');

        // A persisted session can be present but no longer hydrate cleanly after a browser refresh.
        // Refresh it once before allowing the existing routing guard to send the user to login.
        if (initialResult === 'signed_out') {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed.session) {
            await hydrateUser(refreshed.session, 'refresh');
          }
        }
      } catch (error) {
        console.error('[Auth][Provider] Bootstrap authentication failed', error);
        try {
          const refreshed = await refreshAuth();
          if (!refreshed) await hydrateUser(null, 'bootstrap');
        } catch (refreshError) {
          console.error('[Auth][Provider] Auth refresh retry failed', refreshError);
          await hydrateUser(null, 'bootstrap');
        }
      } finally {
        if (isMounted) setIsReady(true);
      }
    };

    void bootstrapAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        void hydrateUser(session, 'auth_event');
      }
    );

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateUser, refreshAuth]);

  /** Revalidates Supabase Auth after the app returns to the foreground. */
  const handleAppState = useCallback((state: AppStateStatus) => {
    if (state !== 'active' || !isAuthenticated) return;
    void refreshAuth().catch((error) => {
      console.error('[Auth][Provider] Foreground session validation failed', error);
    });
  }, [isAuthenticated, refreshAuth]);

  useAppState(handleAppState, 'auth-session-validation', ['active']);


  /** Handles OAuth redirects opened from Supabase provider sign-in. */
  useEffect(() => {
    const handleOAuthUrl = async (url: string | null) => {
      if (!url || !url.includes('auth/callback')) return;
      if (!url.includes('code=') && !url.includes('error=')) return;

      try {
        await authService.completeOAuthRedirect(url);
        await refreshAuth();
      } catch (error) {
        console.error('[Auth][Provider] OAuth callback failed', error);
      }
    };

    Linking.getInitialURL().then(handleOAuthUrl).catch((error) => {
      console.error('[Auth][Provider] Failed to read initial OAuth URL', error);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleOAuthUrl(url);
    });

    return () => subscription.remove();
  }, [refreshAuth]);

  /** Routing guard */
  useEffect(() => {
    if (!isReady) return;

    const routeSegments = segments as string[];
    const inAuthGroup = routeSegments[0] === '(auth)';
    const authRoute = routeSegments.at(1);
    const inOAuthCallback = routeSegments[0] === 'auth' && authRoute === 'callback';
    const inLegalRoute = routeSegments[0] === 'legal';
    const allowAuthenticatedAuthRoute = inAuthGroup && authRoute === 'change-password';

    const inPublicGroup = Platform.OS === 'web' && routeSegments[0] === '(public)';
    const isPublicHome = routeSegments.length === 0;

    if (!isAuthenticated && !inAuthGroup && !inOAuthCallback && !inLegalRoute && !inPublicGroup && !isPublicHome) {
      router.replace('/(auth)/login');
    }

    if (isAuthenticated && inOAuthCallback) {
      router.replace('/(tabs)');
    }

    if (isAuthenticated && inAuthGroup && !allowAuthenticatedAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isReady, segments, user, userInfo]);


  const logout = async () => {
    const dismissAll = (router as any).dismissAll;
    if (typeof dismissAll === 'function') {
      dismissAll();
    }
    userService.clearCachedUserProfile();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (!isReady) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <LoadingSpinner />
      </ThemedView>
    );
  }


  return (
    <AuthContext.Provider
      value={{ user, userInfo, isAuthenticated, logout, refreshAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
