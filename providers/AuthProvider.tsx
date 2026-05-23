import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useSegments } from 'expo-router';
import { getSession, supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserInfo } from '@/types/user';
import databaseService from '@/services/databaseService';
import { settingsService } from '@/services/settingsService';
import { ThemedView } from '@/components/ThemedView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  configureNotifications,
  clearAllNotifications,
  registerForPushNotifications,
  defineBackgroundNotificationTask,
  registerBackgroundNotificationTask,
  unregisterBackgroundNotificationTask,
} from '@/hooks/NotificationHandler';
import { todoNotificationService } from '@/services/todoNotificationService';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import { BackendTables } from '@/constants/backendResources';

//
interface AuthContextType {
  user: User | null;
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

/** Masks an auth user's email address before logging provider diagnostics. */
//
function maskEmailForLog(value?: string | null): string | null {
  //
  if (!value) return null;

  //
  const [localPart = '', domain = ''] = value.split('@');
  //
  const maskedLocal = localPart.length <= 2
    ? `${localPart.charAt(0) || '*'}***`
    : `${localPart.slice(0, 2)}***`;

  return domain ? `${maskedLocal}@${domain}` : maskedLocal;
}

//
const AuthContext = createContext<AuthContextType | null>(null);

//
export const useAuthContext = () => {
  //
  const ctx = useContext(AuthContext);
  //
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};

//
export function AuthProvider({ children }: { children: React.ReactNode }) {
  //
  const [isReady, setIsReady] = useState(false);
  //
  const [user, setUser] = useState<User | null>(null);
  //
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  //
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  //
  const segments = useSegments();
  //
  const queryClient = useQueryClient();
  //
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  //
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
    ]);
  //
  const { data: accountSettings } = useQuery({
    queryKey: ['settings', 'account'],
    queryFn: () => settingsService.getAccountSettings(),
    enabled: Boolean(isAuthenticated && userInfo?.id),
    staleTime: 5 * 60 * 1000,
  });

  //
  useEffect(() => {
    //
    const syncNotifications = async () => {
      //
      try {
        //
        if (!isAuthenticated || !userInfo) {
          await unregisterBackgroundNotificationTask();
          await clearAllNotifications();
          return;
        }

        //
        if (accountSettings?.notifications_enabled === false) {
          await unregisterBackgroundNotificationTask();
          await clearAllNotifications();
          return;
        }

        //
        if (!accountSettings) {
          return;
        }

        await configureNotifications();
        await registerForPushNotifications();

        //
        const username = userInfo.first_name || userInfo.email_address || 'Friend';
        defineBackgroundNotificationTask(async () => {
          await todoNotificationService.handleBackgroundNotifications(
            userInfo.id,
            username
          );
        });
        await registerBackgroundNotificationTask(900);
      } catch (error) {
        console.error('Error syncing notifications:', error);
      }
    };

    syncNotifications();
  }, [accountSettings, isAuthenticated, userInfo]);

  /** Log app permissions on start (Android only) */
  //
  useEffect(() => {
    //
    const logPermissions = async () => {
      //
      if (Platform.OS !== 'android') return;

      //
      try {
        //
        const permissionEntries = Object.entries(PermissionsAndroid.PERMISSIONS);
        //
        const statuses = await Promise.all(
          permissionEntries.map(async ([name, value]) => {
            //
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
  //
  const hydrateUser = useCallback(async (session: Session | null, source: 'bootstrap' | 'auth_event' | 'refresh' = 'auth_event') => {
    //
    if (!session?.user) {
      setUser(null);
      setUserInfo(null);
      setIsAuthenticated(false);
      queryClient.removeQueries({ queryKey: ['auth', 'currentUser'] });
      // Stop background notifications when user logs out
      //
      try {
        await unregisterBackgroundNotificationTask();
        await clearAllNotifications();
      } catch (error) {
        console.error('[Auth][Provider] Error unregistering background task on logout', error);
      }
      return false;
    }

    //
    try {
      //
      const maskedEmail = maskEmailForLog(session.user.email);

      //
      const { data: profile } = await databaseService.getSingleGlobal<UserInfo>(BackendTables.userProfiles, 'auth_user_id', session.user?.id);

      // 🔑 PROFILE NOT READY YET (REGISTER FLOW)
      //
      if (!userService.isProfileComplete(profile)) {
        console.warn('[Auth][Provider] Auth user profile is missing or incomplete', {
          authUserId: session.user.id,
          email: maskedEmail,
          source,
        });
        //
        if (source === 'bootstrap') {
          console.warn('[Auth][Provider] Clearing persisted incomplete auth session on bootstrap', {
            authUserId: session.user.id,
            email: maskedEmail,
          });
          await supabase.auth.signOut();
          setUser(null);
          setUserInfo(null);
          setIsAuthenticated(false);
          return false;
        }
        setUser(session.user);
        setUserInfo(null);
        setIsAuthenticated(false);
        //
        const prefill = await userService.getCurrentAccountCompletionPrefill().catch(() => null);
        router.replace({
          pathname: '/(auth)/register',
          params: {
            isCompleting: 'true',
            authProvider: session.user.app_metadata?.provider === 'google' ? 'Google' : 'third-party login',
            prefillEmail: prefill?.email || session.user.email || '',
            prefillFirstName: prefill?.first_name || '',
            prefillMiddleNames: prefill?.middle_names || '',
            prefillLastName: prefill?.surname || '',
            prefillBirthDate: prefill?.birth_date || '',
            prefillJobStatus: prefill?.job_status || '',
          },
        });
        return false;
      }

      //
      const timeoutMinutes = await withTimeout<number | null>(
        settingsService.getSessionTimeout().catch((error) => {
          console.error('[Auth][Provider] Failed to load session timeout during hydration', {
            authUserId: session.user.id,
            profileId: profile.id,
            message: error instanceof Error ? error.message : String(error),
          });
          return null;
        }),
        2500,
        null
      );
      //
      const lastSignIn = new Date(session.user.last_sign_in_at ?? '');
      //
      const diffMinutes =
        (Date.now() - lastSignIn.getTime()) / (1000 * 60);

      //
      if (typeof timeoutMinutes === 'number' && diffMinutes > timeoutMinutes) {
        console.warn('[Auth][Provider] Session expired by account timeout', {
          authUserId: session.user.id,
          profileId: profile.id,
          timeoutMinutes,
          diffMinutes,
        });
        await supabase.auth.signOut();
        return false;
      }

      profile.email_address = session.user.email || '';
      setUser(session.user);
      setUserInfo(profile);
      setIsAuthenticated(true);
      queryClient.setQueryData(['auth', 'currentUser'], profile);
      return true;
    } catch (e) {
      console.error('[Auth][Provider] Hydration failed and session will be signed out', {
        authUserId: session.user.id,
        email: maskEmailForLog(session.user.email),
        message: e instanceof Error ? e.message : String(e),
      });
      await supabase.auth.signOut();
      return false;
    }
  }, [queryClient]);

  //
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    //
    const { data } = await getSession();
    //
    const session = data.session;

    //
    if (!session?.user) {
      await hydrateUser(null, 'refresh');
      console.warn('[Auth][Provider] Manual auth refresh found no session');
      return false;
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      //
      const isHydrated = await hydrateUser(session, 'refresh');
      //
      if (isHydrated) {
        return true;
      }
      await wait(250);
    }
    console.warn('[Auth][Provider] Manual auth refresh ended without completed hydration', {
      authUserId: session.user.id,
      email: maskEmailForLog(session.user.email),
    });
    return false;
  }, [hydrateUser]);

  /** Initial load + auth listener */
  //
  useEffect(() => {
    //
    let isMounted = true;
    //
    const bootstrapTimeout = setTimeout(() => {
      //
      if (isMounted) {
        setIsReady(true);
      }
    }, 6000);

    getSession().then(({ data }) => {
      return hydrateUser(data.session, 'bootstrap');
    }).finally(() => {
      //
      if (isMounted) {
        setIsReady(true);
      }
      clearTimeout(bootstrapTimeout);
    });

    //
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, session) => {
        void hydrateUser(session, 'auth_event');
      }
    );

    //
    return () => {
      isMounted = false;
      clearTimeout(bootstrapTimeout);
      sub.subscription.unsubscribe();
    };
  }, [hydrateUser]);


  /** Handles OAuth redirects opened from provider sign-in. */
  //
  useEffect(() => {
    //
    const handleOAuthUrl = async (url: string | null) => {
      //
      if (!url || !url.includes('auth/callback')) return;

      //
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
    //
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleOAuthUrl(url);
    });

    //
    return () => subscription.remove();
  }, [refreshAuth]);

  /** Routing guard */
  //
  useEffect(() => {
    //
    if (!isReady) return;

    //
    const inAuthGroup = segments[0] === '(auth)';
    //
    const authRoute = segments.at(1);
    //
    const allowAuthenticatedAuthRoute = inAuthGroup && authRoute === 'change-password';

    //
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }

    //
    if (isAuthenticated && inAuthGroup && !allowAuthenticatedAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isReady, segments, user, userInfo]);


  //
  const logout = async () => {
    //
    const dismissAll = (router as any).dismissAll;
    //
    if (typeof dismissAll === 'function') {
      dismissAll();
    }
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  //
  if (!isReady) {
    //
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  //
  return (
    <AuthContext.Provider
      value={{ user, userInfo, isAuthenticated, logout, refreshAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
