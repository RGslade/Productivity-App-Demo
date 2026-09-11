import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { logError } from '@/services/crashLogger';

const firstParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

/** Exchanges a Supabase OAuth callback into an app session. */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const callbackUrl = Linking.useURL();
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const secondary = useThemeColour({}, 'textSecondary');
  const handledRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fallbackCallbackUrl = useMemo(() => {
    const callbackParams = new URLSearchParams();
    const code = firstParam(params.code);
    const error = firstParam(params.error);
    const errorDescription = firstParam(params.error_description);

    if (code) callbackParams.set('code', code);
    if (error) callbackParams.set('error', error);
    if (errorDescription) callbackParams.set('error_description', errorDescription);

    const query = callbackParams.toString();
    return query ? `productivityapp://auth/callback?${query}` : '';
  }, [params.code, params.error, params.error_description]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (handledRef.current) return;

    const url = callbackUrl?.includes('auth/callback') ? callbackUrl : fallbackCallbackUrl;
    if (!url) {
      setErrorMessage('The sign-in provider did not return the details needed to finish signing in.');
      return;
    }

    handledRef.current = true;

    const finishOAuth = async () => {
      try {
        await authService.completeOAuthRedirect(url);
        await refreshAuth();
      } catch (error) {
        logError('AuthCallbackScreen.finishOAuth', error);
        setErrorMessage('We could not finish that Google sign in. Please return to login and try again.');
      }
    };

    void finishOAuth();
  }, [callbackUrl, fallbackCallbackUrl, refreshAuth]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        {errorMessage ? null : <ActivityIndicator size="large" />}
        <ThemedText type="subtitle" style={styles.title}>
          {errorMessage ? 'Sign in did not finish' : 'Finishing sign in'}
        </ThemedText>
        <ThemedText style={[styles.copy, { color: secondary }]}>
          {errorMessage || 'We are securely connecting your account.'}
        </ThemedText>
        {errorMessage ? (
          <Button
            analyticsId="auth_callback_back_to_login"
            title="Back to login"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          />
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
    lineHeight: 20,
  },
});



