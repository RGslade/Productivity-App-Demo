import { useMutation } from '@tanstack/react-query';
import { authService, SocialAuthProvider } from '@/services/authService';
import { useAuthContext } from '@/providers/AuthProvider';
import { LoginRequest, RegisterRequest } from '@/types/user';

export const useAuth = () => {
  const { user, userInfo, isAuthenticated, logout, refreshAuth } = useAuthContext();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
  });

  const completeAccountMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.completeAccount(data),
  });

  const socialOAuthMutation = useMutation({
    mutationFn: (provider: SocialAuthProvider) => authService.startSocialOAuth(provider),
  });

  /** Signs the user in and immediately asks the auth provider to hydrate the session. */
  const login = async (data: LoginRequest) => {
    const result = await loginMutation.mutateAsync(data);
    if (result.status === 'incomplete_profile') {
      return result;
    }
    await refreshAuth();
    return result;
  };

  const register = async (data: RegisterRequest) => {
    await registerMutation.mutateAsync(data);
    await refreshAuth();
  };

  /** Completes an already-created auth account and hydrates the resulting profile. */
  const completeAccount = async (data: RegisterRequest) => {
    await completeAccountMutation.mutateAsync(data);
    return refreshAuth();
  };

  /** Starts a social sign-in flow and returns the URL to open. */
  const startSocialSignIn = async (provider: SocialAuthProvider) => {
    return socialOAuthMutation.mutateAsync(provider);
  };

  /** Starts the Google sign-in flow and returns the URL to open. */
  const startGoogleSignIn = async () => {
    return startSocialSignIn('google');
  };

  return {
    user,
    userInfo,
    isAuthenticated,

    login,
    register,
    completeAccount,
    startSocialSignIn,
    startGoogleSignIn,
    logout,
    refreshAuth,

    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isCompletingAccount: completeAccountMutation.isPending,
    isStartingSocialSignIn: socialOAuthMutation.isPending,
    isStartingGoogleSignIn: socialOAuthMutation.isPending,

    loginError: loginMutation.error,
    registerError: registerMutation.error,
    completeAccountError: completeAccountMutation.error,
    socialOAuthError: socialOAuthMutation.error,
    googleOAuthError: socialOAuthMutation.error,
  };
};

export const useCurrentUser = () => {
  const { user, userInfo } = useAuthContext();
  return userInfo || user;
};
