import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@/components/ui/AppDatePicker';
import { Picker } from '@react-native-picker/picker';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, showAlert } from '@/hooks/dataHandler';
import { authService, getAuthErrorAlert } from '@/services/authService';
import type { SocialAuthProvider } from '@/services/authService';
import { addCrashBreadcrumb, logError } from '@/services/crashLogger';
import { EMPLOYMENT_STATUSES, EmploymentStatus } from '@/constants/employment';
import { REQUIRED_LEGAL_DOCUMENTS } from '@/constants/LegalDocuments';
import type { LegalDocumentKey } from '@/constants/LegalDocuments';
import { settingsService } from '@/services/settingsService';

type LegalAcceptanceState = Record<LegalDocumentKey, boolean>;
type LegalViewedState = Record<LegalDocumentKey, string | null>;

const SOCIAL_AUTH_OPTIONS: { provider: SocialAuthProvider; label: string; iconName: React.ComponentProps<typeof FontAwesome>['name']; buttonStyle: object; textStyle: object; iconStyle: object }[] = [
  { provider: 'google', label: 'Continue with Google', iconName: 'google', buttonStyle: { backgroundColor: '#FFFFFF', borderColor: '#DADCE0' }, textStyle: { color: '#3C4043' }, iconStyle: { color: '#4285F4' } },
  { provider: 'apple', label: 'Continue with Apple', iconName: 'apple', buttonStyle: { backgroundColor: '#000000', borderColor: '#000000' }, textStyle: { color: '#FFFFFF' }, iconStyle: { color: '#FFFFFF' } },
  { provider: 'spotify', label: 'Continue with Spotify', iconName: 'spotify', buttonStyle: { backgroundColor: '#1DB954', borderColor: '#1DB954' }, textStyle: { color: '#000000' }, iconStyle: { color: '#000000' } },
];

/** Reads one route parameter as a string even when Expo passes an array. */
function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

/** Parses an optional prefilled date without inventing a replacement value. */
function readPrefilledDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Returns true when a date object contains a real calendar value. */
function isValidDate(value: Date | null): value is Date {
  return Boolean(value && !Number.isNaN(value.getTime()));
}

/** Renders account registration and validates all required profile/auth fields. */
export default function RegisterScreen() {
  const params = useLocalSearchParams();
  const isCompleting = readParam(params.isCompleting) === 'true';
  const prefillBirthDate = readParam(params.prefillBirthDate);
  const authProvider = readParam(params.authProvider);
  const isThirdPartyCompletion = Boolean(authProvider);
  const [firstName, setFirstName] = useState(readParam(params.prefillFirstName));
  const [middleNames, setMiddleNames] = useState(readParam(params.prefillMiddleNames));
  const [lastName, setLastName] = useState(readParam(params.prefillLastName));
  const [email, setEmail] = useState(readParam(params.prefillEmail));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(readPrefilledDate(prefillBirthDate));
  const [jobStatus, setJobStatus] = useState<EmploymentStatus | undefined>(
    (readParam(params.prefillJobStatus) as EmploymentStatus) || undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, completeAccount, logout, refreshAuth, user, startSocialSignIn } = useAuth();
  const [is_premium_user] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialAuthProvider | null>(null);
  const [legalVersions, setLegalVersions] = useState<Record<LegalDocumentKey, string>>({
    terms: 'v1',
    privacy: 'v1',
    lifenest: 'v1',
  });
  const [legalAccepted, setLegalAccepted] = useState<LegalAcceptanceState>({
    terms: false,
    privacy: false,
    lifenest: false,
  });
  const [legalViewedAt, setLegalViewedAt] = useState<LegalViewedState>({
    terms: null,
    privacy: null,
    lifenest: null,
  });
  const canSubmitCompletion = useMemo(() => !isCompleting || Boolean(user?.id), [isCompleting, user]);
  const hasReviewedLegalDocuments = useMemo(
    () => REQUIRED_LEGAL_DOCUMENTS.every((document) => Boolean(legalViewedAt[document.key]) && legalAccepted[document.key]),
    [legalAccepted, legalViewedAt]
  );

  /** Starts a provider sign-in flow from the registration screen. */
  const handleSocialSignIn = async (provider: SocialAuthProvider) => {
    try {
      setSocialLoadingProvider(provider);
      addCrashBreadcrumb('social_oauth_submit', { provider }, '/(auth)/register');
      const providerUrl = await startSocialSignIn(provider);
      if (Platform.OS === 'web') {
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
      addCrashBreadcrumb('social_oauth_error', { provider, message: error instanceof Error ? error.message : String(error) }, '/(auth)/register');
      logError('RegisterScreen.handleSocialSignIn', error, { provider });
      showAlert('Sign In Unavailable', 'We could not open that sign-in option. Please try again or use email and password.');
    } finally {
      setSocialLoadingProvider(null);
    }
  };

  React.useEffect(() => {
    let isCancelled = false;

    const loadLegalVersions = async () => {
      const versions = await settingsService.getLegalDocumentVersions();
      if (!isCancelled) {
        setLegalVersions(versions);
      }
    };

    void loadLegalVersions();

    return () => {
      isCancelled = true;
    };
  }, []);

  /** Returns true when an email string matches the required format. */
  const isEmailValid = (value: string) => {
    const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRule.test(value.trim());
  };

  /** Returns true when the password satisfies the app's password rules. */
  const isPasswordValid = (value: string) => {
    const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return passwordRule.test(value);
  };

  /** Submits registration details and creates the initial user profile record. */
  const handleRegister = async () => {
    try {
      setLoading(true);

      if (!firstName.trim() || !lastName.trim() || !email.trim() || !isValidDate(birthdate)) {
        showAlert('Missing Information', 'Please fill in all non-Optional information');
        return;
      }

      if (!isEmailValid(email)) {
        showAlert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (!isCompleting) {
        if (!password || !confirmPassword) {
          showAlert('Missing Information', 'Please enter and confirm your password.');
          return;
        }

        if (!isPasswordValid(password)) {
          showAlert('Invalid Password', 'Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol.');
          return;
        }

        if (password !== confirmPassword) {
          showAlert('Passwords Do Not Match', 'Please re-enter your password and confirm password so they match.');
          return;
        }
      }

      if (isCompleting && !canSubmitCompletion) {
        showAlert('Session expired', 'Please sign in again to complete your account.');
        router.replace('/(auth)/login');
        return;
      }

      if (!hasReviewedLegalDocuments) {
        showAlert('Review Required', 'Please open and accept the Terms of Service, Privacy Policy, and LifeNest Terms before continuing.');
        return;
      }

      const acceptedAt = new Date().toISOString();

      const submission = {
        firstName,
        surname: lastName,
        middleNames,
        email,
        password,
        birthDate: birthdate.toISOString().slice(0, 10),
        job_status: jobStatus,
        is_premium_user,
        terms_accepted: true,
        terms_accepted_at: acceptedAt,
        terms_version_accepted: legalVersions.terms,
        terms_viewed_at: legalViewedAt.terms,
        terms_version_viewed: legalVersions.terms,
        privacy_policy_accepted: true,
        privacy_policy_accepted_at: acceptedAt,
        privacy_policy_version_accepted: legalVersions.privacy,
        privacy_policy_viewed_at: legalViewedAt.privacy,
        privacy_policy_version_viewed: legalVersions.privacy,
        lifenest_terms_accepted: true,
        lifenest_terms_accepted_at: acceptedAt,
        lifenest_terms_version_accepted: legalVersions.lifenest,
        lifenest_terms_viewed_at: legalViewedAt.lifenest,
        lifenest_terms_version_viewed: legalVersions.lifenest,
      };

      if (isCompleting) {
        const isHydrated = await completeAccount(submission);
        if (isHydrated) {
          router.replace('/(tabs)');
        }
      } else {
        await register(submission);
      }
      // DO NOTHING ELSE -- AuthProvider will redirect
    } catch (error: any) {
      const { title, message } = getAuthErrorAlert(error, 'register');
      showAlert(title, message);
    }
    finally {
      setLoading(false);
    }
  };

  /** Returns the user to the login screen without stacking duplicate auth routes. */
  const handleGoToLogin = async () => {
    if (isCompleting && user) {
      await logout();
      return;
    }

    const dismissAll = (router as any).dismissAll;
    if (typeof dismissAll === 'function') {
      dismissAll();
    }
    router.replace('/(auth)/login');
  };

  /** Updates local birth date state from native date picker selection. */
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthdate(selectedDate);
    }
  };

  /** Marks a legal document as opened before routing to the in-app document page. */
  const handleOpenLegalDocument = (key: LegalDocumentKey, route: `/legal/${LegalDocumentKey}`) => {
    setLegalViewedAt((current) => ({
      ...current,
      [key]: current[key] ?? new Date().toISOString(),
    }));
    router.push(route as any);
  };

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {isCompleting ? 'Complete Your Account' : 'Create Account'}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              {isCompleting ? 'Fill in your details to complete setup' : 'Start your journey to independence'}
            </ThemedText>
          </View>
          <View style={styles.form}>
            <Input placeholder="First Name" required={true} value={firstName} onChangeText={setFirstName} autoCapitalize="words" style={styles.input} autoComplete='given-name' />
            <Input placeholder="Middle Names (Optional)" value={middleNames} onChangeText={setMiddleNames} autoCapitalize="words" style={styles.input} autoComplete='additional-name' />
            <Input placeholder="Last Name" required={true} value={lastName} onChangeText={setLastName} autoCapitalize="words" style={styles.input} autoComplete='family-name' />
            <Input placeholder="Email" required={true} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete='email' autoCorrect={false} editable={!isCompleting}
              style={[styles.input, isCompleting && styles.disabledInput]} />
            {!isThirdPartyCompletion && (
              <>
                <View style={styles.passwordContainer}>
                  <Input placeholder="Password" required={!isCompleting} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!isCompleting}
                    style={[styles.input, styles.passwordInput, isCompleting && styles.disabledInput]} autoComplete='new-password' />
                  <TouchableOpacity analyticsId="app_register_eye_icon_2" analyticsControlType="icon" style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} disabled={isCompleting}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={isCompleting ? "#ccc" : "#666"} />
                  </TouchableOpacity>
                </View>
                <View style={styles.passwordContainer}>
                  <Input placeholder="Confirm Password" required={!isCompleting} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword}
                    editable={!isCompleting} style={[styles.input, styles.passwordInput, isCompleting && styles.disabledInput]} autoComplete='new-password' />
                  <TouchableOpacity analyticsId="app_register_eye_icon" analyticsControlType="icon" style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isCompleting} >
                    <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color={isCompleting ? "#ccc" : "#666"} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Button
              analyticsId="app_register_set_show_date_picker"
              title={birthdate ? `Date of Birth: ${formatDate(birthdate.toString())}` : 'Set Date of Birth'}
              onPress={() => setShowDatePicker(true)}
              variant="secondary"
              fullWidth
              style={styles.dateButton}
            />
            {showDatePicker && (<DateTimePicker value={birthdate ?? new Date()} mode="date" display="default" onValueChange={handleDateChange} maximumDate={new Date()} />)}
            <ThemedText style={styles.pickerLabel}>Employment Status (Optional)</ThemedText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={jobStatus} onValueChange={(value) => setJobStatus(value)}>
                <Picker.Item label="Select status..." value={undefined} />
                {EMPLOYMENT_STATUSES.map((status) => (
                  <Picker.Item key={status} label={status} value={status} />
                ))}
              </Picker>
            </View>

            <View style={styles.legalSection}>
              <ThemedText type="defaultSemiBold" style={styles.legalTitle}>Legal documents</ThemedText>
              {REQUIRED_LEGAL_DOCUMENTS.map((document) => {
                const hasViewed = Boolean(legalViewedAt[document.key]);
                return (
                  <View key={document.key} style={styles.legalDocumentRow}>
                    <View style={styles.legalDocumentHeader}>
                      <View style={styles.legalDocumentCopy}>
                        <ThemedText type="defaultSemiBold">{document.shortTitle}</ThemedText>
                        <ThemedText style={styles.legalVersion}>
                          {hasViewed ? 'Ready to tick agree' : 'Open to tick agree'}
                        </ThemedText>
                      </View>
                      <TouchableOpacity
                        analyticsId={`app_register_open_${document.key}`}
                        analyticsControlType="link"
                        onPress={() => handleOpenLegalDocument(document.key, document.route)}
                        style={styles.legalLink}
                      >
                        <ThemedText type="link" style={styles.legalLinkText}>Read</ThemedText>
                      </TouchableOpacity>
                    </View>
                    <Switch
                      label={`I agree to the ${document.shortTitle}`}
                      value={legalAccepted[document.key]}
                      disabled={!hasViewed}
                      onValueChange={(value) => setLegalAccepted((current) => ({ ...current, [document.key]: value }))}
                    />
                  </View>
                );
              })}
            </View>

            <Button analyticsId="app_register_handle_register" title={loading ? (isCompleting ? "Completing Account..." : "Creating Account...") : (isCompleting ? "Complete Account" : "Create Account")} onPress={handleRegister} loading={loading} disabled={loading || !hasReviewedLegalDocuments} fullWidth style={styles.registerButton} />

            <View style={styles.loginSection}>
              <ThemedText style={styles.loginText}>
                Already have an account?
              </ThemedText>
              <Button analyticsId="app_register_sign_in" title="Sign In" onPress={handleGoToLogin} variant="secondary" fullWidth style={styles.loginButton} />
            </View>
            {!isCompleting ? (
              <>
                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <ThemedText style={styles.separatorText}>or sign up/in with</ThemedText>
                  <View style={styles.separatorLine} />
                </View>
                <View style={[styles.socialButtons, Platform.OS === 'web' && styles.socialButtonsWeb]}>
                  {SOCIAL_AUTH_OPTIONS.map((option) => {
                    const isCurrentLoading = socialLoadingProvider === option.provider;
                    const isDisabled = loading || Boolean(socialLoadingProvider && !isCurrentLoading);
                    return (
                      <TouchableOpacity key={option.provider} analyticsId={`app_register_${option.provider}`} analyticsControlType="button" accessibilityRole="button" accessibilityLabel={option.label} disabled={isDisabled} onPress={() => handleSocialSignIn(option.provider)} style={[styles.socialButton, Platform.OS === 'web' && styles.socialButtonWeb, option.buttonStyle, isDisabled && styles.socialButtonDisabled]}>
                        <View style={[styles.socialIconSlot, Platform.OS === 'web' && styles.socialIconSlotWeb]}>
                          {isCurrentLoading ? <ActivityIndicator color={(option.iconStyle as { color: string }).color} /> : <FontAwesome name={option.iconName} size={22} color={(option.iconStyle as { color: string }).color} />}
                        </View>
                        <ThemedText style={[styles.socialButtonText, Platform.OS === 'web' && styles.socialButtonTextWeb, option.textStyle]}>
                          {isCurrentLoading ? `Opening ${option.label.replace('Continue with ', '')}...` : Platform.OS === 'web' ? option.label.replace('Continue with ', '') : option.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
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
    maxWidth: Platform.OS === 'web' ? '70%' : 620,
    alignSelf: 'center',
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
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
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
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
    zIndex: 1,
  },
  dateButton: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  legalSection: {
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  legalTitle: {
    fontSize: 16,
  },
  legalDocumentRow: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  legalDocumentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  legalDocumentCopy: {
    flex: 1,
  },
  legalVersion: {
    fontSize: 13,
    opacity: 0.72,
  },
  legalLink: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  legalLinkText: {
    fontSize: 15,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginSection: {
    alignItems: 'center',
  },
  loginText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
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
  },
});
