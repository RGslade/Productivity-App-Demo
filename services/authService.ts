import { LoginRequest, RegisterRequest, ChangePasswordRequest, LoginResult } from '@/types/user';
import databaseService from './databaseService';
import * as Linking from 'expo-linking';
import { getSession } from '@/lib/supabase';
import { userService } from './userService';

//
type AuthErrorContext = 'login' | 'register' | 'changePassword' | 'resetPassword' | 'verifyRecoveryCode';

//
type AuthAlertContent = {
  code: string;
  title: string;
  message: string;
};

//
type ErrorWithCode = Error & {
  code?: string;
  status?: number;
  cause?: unknown;
};

/** Masks an email address for auth logs while keeping enough context to identify the affected account. */
//
const maskEmailForLog = (value: string): string => {
  //
  const [localPart = '', domain = ''] = value.split('@');
  //
  const maskedLocal = localPart.length <= 2
    ? `${localPart.charAt(0) || '*'}***`
    : `${localPart.slice(0, 2)}***`;

  return domain ? `${maskedLocal}@${domain}` : maskedLocal;
};

//
const AUTH_ERROR_ALERTS: Record<string, Omit<AuthAlertContent, 'code'>> = {
  INVALID_CREDENTIALS: {
    title: 'Login Failed',
    message: 'Incorrect email or password.',
  },
  EMAIL_NOT_CONFIRMED: {
    title: 'Email Not Verified',
    message: 'Please verify your email address before signing in.',
  },
  TOO_MANY_REQUESTS: {
    title: 'Too Many Attempts',
    message: 'Too many attempts were made. Please wait a moment and try again.',
  },
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'We could not reach the server. Check your connection and try again.',
  },
  SERVICE_UNAVAILABLE: {
    title: 'Service Unavailable',
    message: 'The authentication service is temporarily unavailable. Please try again shortly.',
  },
  USER_ALREADY_EXISTS: {
    title: 'Account Exists',
    message: 'An account with this email already exists. Please sign in instead.',
  },
  WEAK_PASSWORD: {
    title: 'Weak Password',
    message: 'Your password does not meet the required security rules.',
  },
  PASSWORD_RESET_LIMIT: {
    title: 'Too Many Requests',
    message: 'Too many password reset attempts were made. Please wait and try again.',
  },
  NOT_AUTHENTICATED: {
    title: 'Session Expired',
    message: 'Please sign in again to continue.',
  },
  UNKNOWN_LOGIN_ERROR: {
    title: 'Login Failed',
    message: 'We could not sign you in. Please try again.',
  },
  UNKNOWN_REGISTER_ERROR: {
    title: 'Registration Failed',
    message: 'We could not create your account. Please try again.',
  },
  UNKNOWN_CHANGE_PASSWORD_ERROR: {
    title: 'Password Change Failed',
    message: 'We could not update your password. Please try again.',
  },
  UNKNOWN_RESET_PASSWORD_ERROR: {
    title: 'Reset Failed',
    message: 'We could not start a password reset. Please try again.',
  },
  INVALID_RECOVERY_CODE: {
    title: 'Invalid Code',
    message: 'That recovery code is not valid. Please check the latest email and try again.',
  },
  UNKNOWN_VERIFY_RECOVERY_CODE_ERROR: {
    title: 'Verification Failed',
    message: 'We could not verify that code. Please request a new reset email and try again.',
  },
};

//
const getErrorText = (error: unknown) => {
  //
  if (!error) {
    return '';
  }

  //
  if (typeof error === 'string') {
    return error.toLowerCase();
  }

  //
  if (error instanceof Error) {
    //
    const err = error as ErrorWithCode;
    return [err.code, err.message, err.name].filter(Boolean).join(' ').toLowerCase();
  }

  //
  if (typeof error === 'object') {
    //
    const err = error as { code?: string; message?: string; error_description?: string; name?: string };
    return [err.code, err.message, err.error_description, err.name].filter(Boolean).join(' ').toLowerCase();
  }

  return '';
};

//
const getErrorStatus = (error: unknown): number | undefined => {
  //
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  //
  const { status } = error as { status?: number };
  return typeof status === 'number' ? status : undefined;
};

//
const getFallbackCode = (context: AuthErrorContext) => {
  switch (context) {
    case 'register':
      return 'UNKNOWN_REGISTER_ERROR';
    case 'changePassword':
      return 'UNKNOWN_CHANGE_PASSWORD_ERROR';
    case 'resetPassword':
      return 'UNKNOWN_RESET_PASSWORD_ERROR';
    case 'verifyRecoveryCode':
      return 'UNKNOWN_VERIFY_RECOVERY_CODE_ERROR';
    case 'login':
    default:
      return 'UNKNOWN_LOGIN_ERROR';
  }
};

//
const normalizeAuthErrorCode = (error: unknown, context: AuthErrorContext): string => {
  //
  const text = getErrorText(error);
  //
  const status = getErrorStatus(error);

  //
  if (text.includes('invalid_credentials') || text.includes('invalid login credentials') || text.includes('incorrect email or password')) {
    return 'INVALID_CREDENTIALS';
  }

  //
  if (text.includes('email_not_confirmed') || text.includes('email not confirmed') || text.includes('verify your email')) {
    return 'EMAIL_NOT_CONFIRMED';
  }

  //
  if (text.includes('already registered') || text.includes('user already registered') || text.includes('already exists')) {
    return 'USER_ALREADY_EXISTS';
  }

  //
  if (text.includes('weak password') || text.includes('password should') || text.includes('password is too weak')) {
    return 'WEAK_PASSWORD';
  }

  //
  if (text.includes('too many requests') || text.includes('rate limit') || text.includes('over_request_rate_limit') || text.includes('over_email_send_rate_limit')) {
    return context === 'resetPassword' ? 'PASSWORD_RESET_LIMIT' : 'TOO_MANY_REQUESTS';
  }

  //
  if (text.includes('failed to fetch') || text.includes('network request failed') || text.includes('network error') || text.includes('load failed')) {
    return 'NETWORK_ERROR';
  }

  //
  if (status && status >= 500) {
    return 'SERVICE_UNAVAILABLE';
  }

  //
  if (text.includes('service unavailable') || text.includes('internal server error') || text.includes('bad gateway') || text.includes('gateway timeout')) {
    return 'SERVICE_UNAVAILABLE';
  }

  //
  if (text.includes('otp') || text.includes('token') || text.includes('invalid_grant') || text.includes('expired')) {
    return context === 'verifyRecoveryCode' ? 'INVALID_RECOVERY_CODE' : getFallbackCode(context);
  }

  //
  if (text.includes('not authenticated')) {
    return 'NOT_AUTHENTICATED';
  }

  return getFallbackCode(context);
};

//
const createAuthError = (code: string, cause?: unknown): ErrorWithCode => {
  //
  const error = new Error(code) as ErrorWithCode;
  error.code = code;
  error.cause = cause;
  return error;
};

//Handles errors in the auth service and maps them to user-friendly alert content.
export const getAuthErrorAlert = (error: unknown, context: AuthErrorContext = 'login'): AuthAlertContent => {
  const code = normalizeAuthErrorCode(error, context);
  const alert = AUTH_ERROR_ALERTS[code] ?? AUTH_ERROR_ALERTS[getFallbackCode(context)];

  return {code, title: alert.title, message: alert.message,};
};

//
class AuthService {
  private buildProfilePayload(userData: RegisterRequest) {
    return {
      first_name: userData.firstName,
      surname: userData.surname,
      middle_names: userData.middleNames,
      primary_phone_number: userData.primaryPhoneNumber,
      birth_date: userData.birthDate,
      job_status: userData.job_status,
      is_premium_user: userData.is_premium_user,
      universal_credit: userData.universal_credit,
      subscription_provider: userData.subscription_provider,
      subscription_product_id: userData.subscription_product_id,
      subscription_status: userData.subscription_status,
      terms_accepted: userData.terms_accepted,
      terms_accepted_at: userData.terms_accepted ? new Date().toISOString() : null,
      terms_version_accepted: userData.terms_version_accepted,
      privacy_policy_accepted: userData.privacy_policy_accepted,
      privacy_policy_accepted_at: userData.privacy_policy_accepted ? new Date().toISOString() : null,
      privacy_policy_version_accepted: userData.privacy_policy_version_accepted,
      lifenest_terms_accepted: userData.lifenest_terms_accepted,
      lifenest_terms_accepted_at: userData.lifenest_terms_accepted ? new Date().toISOString() : null,
      lifenest_terms_version_accepted: userData.lifenest_terms_version_accepted,
    };
  }

  /** Signs the user in and reports whether the account is fully usable or still missing profile data. */
  async login(credentials: LoginRequest): Promise<LoginResult> {
    //
    const maskedEmail = maskEmailForLog(credentials.email);

    //
    try {
      //
      const authUser = await databaseService.signInWithPassword(
        credentials.email,
        credentials.password
      );
      //
      const profile = await userService.getProfileByAuthUserId(authUser.id);

      //
      if (!userService.isProfileComplete(profile)) {
        console.warn('[Auth][AuthService] Login succeeded but account profile is incomplete', {
          email: maskedEmail,
          authUserId: authUser.id,
        });
        return {
          status: 'incomplete_profile',
          prefill: await userService.getCurrentAccountCompletionPrefill(),
        };
      }

      return { status: 'authenticated' };
    } catch (error) {
      console.error('[Auth][AuthService] Login failed', {
        email: maskedEmail,
        message: error instanceof Error ? error.message : String(error),
        code: typeof error === 'object' && error ? (error as { code?: string }).code : undefined,
        status: typeof error === 'object' && error ? (error as { status?: number }).status : undefined,
      });
      throw createAuthError(normalizeAuthErrorCode(error, 'login'), error);
    }
  }

  /** Creates a brand-new auth account and writes the first profile row. */
  async register(userData: RegisterRequest): Promise<void> {
    //
    try {
      await databaseService.signOut();
      //
      const { error: signUpError } = await databaseService.signUp(userData.email, userData.password, {
        data: {
          first_name: userData.firstName,
          surname: userData.surname,
          birth_date: userData.birthDate,
          middle_names: userData.middleNames,
          job_status: userData.job_status,
          terms_accepted: userData.terms_accepted,
          privacy_policy_accepted: userData.privacy_policy_accepted,
        },
      });
      //
      if (signUpError) {
        console.error('authService.register.signUp', signUpError);
        throw createAuthError(normalizeAuthErrorCode(signUpError, 'register'), signUpError);
      }

      await userService.upsertCurrentUserProfile(this.buildProfilePayload(userData));

    } catch (error) {
      console.error('authService.register', error);
      await databaseService.signOut();
      throw createAuthError(normalizeAuthErrorCode(error, 'register'), error);
    }
  }

  /** Completes a previously created auth account by writing the missing profile row. */
  async completeAccount(userData: RegisterRequest): Promise<void> {
    //
    try {
      await databaseService.updateUser({
        data: {
          first_name: userData.firstName,
          surname: userData.surname,
          birth_date: userData.birthDate,
          middle_names: userData.middleNames,
          job_status: userData.job_status,
          terms_accepted: userData.terms_accepted,
          privacy_policy_accepted: userData.privacy_policy_accepted,
        },
      });
      await userService.upsertCurrentUserProfile(this.buildProfilePayload(userData));
    } catch (error) {
      console.error('authService.completeAccount', error);
      throw createAuthError(normalizeAuthErrorCode(error, 'register'), error);
    }
  }

  /** Starts Google OAuth and returns the provider URL that should be opened by the app. */
  async startGoogleOAuth(): Promise<string> {
    //
    const redirectTo = Linking.createURL('auth/callback');
    return databaseService.signInWithOAuth('google', redirectTo);
  }

  /** Exchanges an OAuth redirect URL for a backend session. */
  async completeOAuthRedirect(url: string): Promise<void> {
    //
    const parsedUrl = Linking.parse(url);
    //
    const code = typeof parsedUrl.queryParams?.code === 'string' ? parsedUrl.queryParams.code : '';
    //
    if (!code) {
      throw createAuthError('UNKNOWN_LOGIN_ERROR', new Error('OAuth code missing'));
    }
    await databaseService.exchangeCodeForSession(code);
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    //
    const { data: sessionData } = await getSession();
    //
    const currentUser = sessionData.session?.user;

    //
    if (!currentUser?.email) {
      throw createAuthError('NOT_AUTHENTICATED');
    }

    //
    try {
      //
      if (data.currentPassword) {
        await databaseService.signInWithPassword(currentUser.email, data.currentPassword);
      }

      await databaseService.updateUser({
        password: data.newPassword,
      });
    } catch (error) {
      console.error('authService.changePassword', error);
      throw createAuthError(normalizeAuthErrorCode(error, 'changePassword'), error);
    }
  }

  async resetPassword(email: string, redirectTo?: string): Promise<void> {
    //
    try {
      await databaseService.resetPasswordForEmail(email, redirectTo);
    } catch (error) {
      console.error('authService.resetPassword', error);
      throw createAuthError(normalizeAuthErrorCode(error, 'resetPassword'), error);
    }
  }
  async verifyRecoveryCode(email: string, token: string): Promise<void> {
    //
    try {
      await databaseService.verifyRecoveryCode(email, token);
    } catch (error) {
      console.error('authService.verifyRecoveryCode', error);
      throw createAuthError(normalizeAuthErrorCode(error, 'verifyRecoveryCode'), error);
    }
  }

}

//
export const authService = new AuthService();
//
export default authService;
