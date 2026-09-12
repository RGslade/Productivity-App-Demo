import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { showAlert } from '@/hooks/dataHandler';
import { useThemeColour } from '@/hooks/useThemeColour';
import { authService, getAuthErrorAlert } from '@/services/authService';
import type { SocialAuthProvider } from '@/services/authService';
import { addCrashBreadcrumb, logError } from '@/services/crashLogger';

WebBrowser.maybeCompleteAuthSession();

type AuthInlineError = {
  title: string;
  message: string;
};

type SocialAuthOption = {
  provider: SocialAuthProvider;
  label: string;
  iconName: React.ComponentProps<typeof FontAwesome>['name'];
  analyticsId: string;
  buttonStyle: object;
  textStyle: object;
  iconStyle: object;
};

const SOCIAL_AUTH_OPTIONS: SocialAuthOption[] = [
  {
    provider: 'google',
    label: 'Continue with Google',
    iconName: 'google',
    analyticsId: 'app_login_continue_google',
    buttonStyle: {
      backgroundColor: '#FFFFFF',
      borderColor: '#DADCE0',
    },
    textStyle: {
      color: '#3C4043',
    },
    iconStyle: {
      color: '#4285F4',
    },
  },
  {
    provider: 'apple',
    label: 'Continue with Apple',
    iconName: 'apple',
    analyticsId: 'app_login_continue_apple',
    buttonStyle: {
      backgroundColor: '#000000',
      borderColor: '#000000',
    },
    textStyle: {
      color: '#FFFFFF',
    },
    iconStyle: {
      color: '#FFFFFF',
    },
  },
  {
    provider: 'spotify',
    label: 'Continue with Spotify',
    iconName: 'spotify',
    analyticsId: 'app_login_continue_spotify',
    buttonStyle: {
      backgroundColor: '#1DB954',
      borderColor: '#1DB954',
    },
    textStyle: {
      color: '#000000',
    },
    iconStyle: {
      color: '#000000',
    },
  },
];

/** Masks an email address so auth diagnostics do not expose the full account identifier. */
function maskEmailForLog(value: string): string {
  const [localPart = '', domain = ''] = value.split('@');
  const maskedLocal = localPart.length <= 2
    ? `${localPart.charAt(0) || '*'}***`
    : `${localPart.slice(0, 2)}***`;

  return domain ? `${maskedLocal}@${domain}` : maskedLocal;
}

export default function LoginScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // const { setIsAuthenticated } = useAuthContext();
  const { login, startSocialSignIn, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialAuthProvider | null>(null);
  const [authError, setAuthError] = useState<AuthInlineError | null>(null);
  const danger = useThemeColour({}, 'danger');
  const cardBackground = useThemeColour({}, 'cardBackground');
  const cardBorder = useThemeColour({}, 'cardBorder');

  useEffect(() => {
    if (reason === 'session_expired') {
      setAuthError({ title: 'Session Expired', message: 'Your session has expired. Please sign in again.' });
    }
  }, [reason]);

  /** Updates the email field and clears stale login feedback once the user edits it. */
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (authError) setAuthError(null);
  };

  /** Updates the password field and clears stale login feedback once the user edits it. */
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (authError) setAuthError(null);
  };

  /** Attempts password sign-in and keeps user-visible failure feedback on screen. */
  const handleLogin = async () => {
    const normalizedEmail = email.trim();
    const maskedEmail = maskEmailForLog(normalizedEmail);

    if (!normalizedEmail || !password) {
      const validationError = {
        title: 'Missing Information',
        message: 'Please fill in both email and password.',
      };
      console.warn('[Auth][LoginScreen] Validation failed before submit', {
        hasEmail: Boolean(normalizedEmail),
        hasPassword: Boolean(password),
      });
      addCrashBreadcrumb('login_validation_failed', {
        hasEmail: Boolean(normalizedEmail),
        hasPassword: Boolean(password),
      }, '/(auth)/login');
      setAuthError(validationError);
      showAlert(validationError.title, validationError.message);
      return;
    }

    try {
      setLoading(true);
      setAuthError(null);
      addCrashBreadcrumb('login_submit', { email: maskedEmail }, '/(auth)/login');
      const result = await login({ email: normalizedEmail, password });
      if (result.status === 'incomplete_profile') {
        console.warn('[Auth][LoginScreen] Login requires account completion', {
          email: maskedEmail,
        });
        addCrashBreadcrumb('login_incomplete_profile', { email: maskedEmail }, '/(auth)/login');
        showAlert(
          'Complete your account',
          'Your email and password are valid, but your account setup was not finished. We will take you to the completion screen now.',
          [{
            text: 'Continue',
            onPress: () => router.replace({
              pathname: '/(auth)/register',
              params: {
                isCompleting: 'true',
                prefillEmail: result.prefill?.email || normalizedEmail,
                prefillFirstName: result.prefill?.first_name || '',
                prefillMiddleNames: result.prefill?.middle_names || '',
                prefillLastName: result.prefill?.surname || '',
                prefillBirthDate: result.prefill?.birth_date || '',
                prefillJobStatus: result.prefill?.job_status || '',
                prefillTermsAccepted: result.prefill?.terms_accepted ? 'true' : 'false',
                prefillPrivacyAccepted: result.prefill?.privacy_policy_accepted ? 'true' : 'false',
              },
            }),
            style: 'default',
          }]
        );
        return;
      }
      addCrashBreadcrumb('login_success', { email: maskedEmail }, '/(auth)/login');
      // âœ… DO NOTHING ELSE
      // AuthProvider will redirect on success
    } catch (error: any) {
      console.error('[Auth][LoginScreen] Login submit failed', {
        email: maskedEmail,
        message: error instanceof Error ? error.message : String(error),
        code: typeof error === 'object' && error ? (error as { code?: string }).code : undefined,
      });
      logError('LoginScreen.handleLogin', error, { email: maskedEmail });
      addCrashBreadcrumb('login_error', {
        message: error instanceof Error ? error.message : String(error),
      }, '/(auth)/login');
      const { title, message } = getAuthErrorAlert(error, 'login');
      setAuthError({ title, message });
      showAlert(title, message);
    }
    finally {
      setLoading(false);
    }
  };

  /** Starts OAuth for a supported social provider and opens the provider-owned consent page. */
  const handleSocialSignIn = async (provider: SocialAuthProvider) => {
    try {
      setSocialLoadingProvider(provider);
      addCrashBreadcrumb('social_oauth_submit', { provider }, '/(auth)/login');
      const providerUrl = await startSocialSignIn(provider);
      if (Platform.OS === 'web') {
        // Keep the OAuth flow in the current browser tab. Linking.openURL uses
        // a new browser context on web, which leaves the original login screen
        // behind and makes a successful callback look like it did nothing.
        window.location.assign(providerUrl);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(providerUrl, authService.getSocialOAuthRedirectUrl());
      if (result.type === 'success' && result.url.includes('auth/callback')) {
        await authService.completeOAuthRedirect(result.url);
        await refreshAuth();
        return;
      }

      if (result.type !== 'cancel' && result.type !== 'dismiss') {
        throw new Error(`OAuth browser session ended with ${result.type}`);
      }
    } catch (error) {
      addCrashBreadcrumb('social_oauth_error', {
        provider,
        message: error instanceof Error ? error.message : String(error),
      }, '/(auth)/login');
      logError('LoginScreen.handleSocialSignIn', error, { provider });
      showAlert('Sign In Unavailable', 'We could not open that sign-in option. Please try again or use email and password.');
    } finally {
      setSocialLoadingProvider(null);
    }
  };

  const isSocialLoading = Boolean(socialLoadingProvider);

  /** Opens the create-account flow. */
  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  /** Opens password recovery. */
  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };
const backgroundColour = useThemeColour({}, 'background');
  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={[styles.container, {backgroundColor: backgroundColour}]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Sign in to continue your journey
            </ThemedText>
          </View>
          <View style={styles.form}>
            <Input placeholder="Email" value={email} onChangeText={handleEmailChange} keyboardType="email-address"
              autoCapitalize="none" autoCorrect={false} style={styles.input} autoComplete='email' />
            <View style={styles.passwordContainer}>
              <Input placeholder="Password"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                autoComplete='current-password'
              />
              <TouchableOpacity analyticsId="app_login_eye_icon" analyticsControlType="icon" style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {authError ? (
              <View
                accessibilityRole="alert"
                style={[styles.errorBanner, { backgroundColor: cardBackground, borderColor: danger || cardBorder }]}
              >
                <ThemedText style={[styles.errorTitle, { color: danger }]}>{authError.title}</ThemedText>
                <ThemedText style={styles.errorMessage}>{authError.message}</ThemedText>
              </View>
            ) : null}
            <Button analyticsId="app_login_handle_login" title={loading ? "Signing In..." : "Sign In"} onPress={handleLogin} loading={loading} disabled={loading || isSocialLoading} style={styles.loginButton} />
            <TouchableOpacity analyticsId="app_login_forgot_password_link" analyticsControlType="link" onPress={handleForgotPassword} style={styles.forgotPasswordLink}>
              <ThemedText style={styles.forgotPasswordText}>Forgot password?</ThemedText>
            </TouchableOpacity>
            <Button analyticsId="app_login_create_account" title="Create Account" onPress={handleRegister} variant="secondary" fullWidth />
            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <ThemedText style={styles.separatorText}>or sign up/in with</ThemedText>
              <View style={styles.separatorLine} />
            </View>
            <View style={[styles.socialButtons, Platform.OS === 'web' && styles.socialButtonsWeb]}>
              {SOCIAL_AUTH_OPTIONS.map((option) => {
                const isCurrentLoading = socialLoadingProvider === option.provider;
                const isDisabled = loading || (isSocialLoading && !isCurrentLoading);
                return (
                  <TouchableOpacity key={option.provider} analyticsId={option.analyticsId} analyticsControlType="button"
                    accessibilityRole="button" accessibilityLabel={option.label} disabled={isDisabled} onPress={() => handleSocialSignIn(option.provider)}
                    style={[styles.socialButton, Platform.OS === 'web' && styles.socialButtonWeb, option.buttonStyle, isDisabled && styles.socialButtonDisabled,]}>
                    <View style={[styles.socialIconSlot, Platform.OS === 'web' && styles.socialIconSlotWeb]}>
                      {isCurrentLoading ? (
                        <ActivityIndicator color={(option.iconStyle as { color: string }).color} />
                      ) : (
                        <FontAwesome name={option.iconName} size={22} color={(option.iconStyle as { color: string }).color} />
                      )}
                    </View>
                    <ThemedText style={[styles.socialButtonText, Platform.OS === 'web' && styles.socialButtonTextWeb, option.textStyle]}>
                      {isCurrentLoading
                        ? `Opening ${option.label.replace('Continue with ', '')}...`
                        : Platform.OS === 'web'
                          ? option.label.replace('Continue with ', '')
                          : option.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
            width: Platform.OS === 'web' ? '70%' : '100%',
            alignSelf: 'center',

  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    zIndex: 5,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  forgotPasswordLink: {
    marginBottom: 16,
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  registerSection: {
    alignItems: 'center',
  },
  registerText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  separatorText: {
    fontSize: 13,
    opacity: 0.7,
  },
  socialButtons: {
    gap: 12,
    marginBottom: 8,
  },
  socialButtonsWeb: {
    flexDirection: 'row',
  },
  socialButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonWeb: {
    flex: 1,
    paddingHorizontal: 8,
  },
  socialButtonDisabled: {
    opacity: 0.68,
  },
  socialIconSlot: {
    position: 'absolute',
    left: 16,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconSlotWeb: {
    left: 8,
    width: 22,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  socialButtonTextWeb: {
    fontSize: 14,
  }
});
