import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/authService';
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

  const googleOAuthMutation = useMutation({
    mutationFn: () => authService.startGoogleOAuth(),
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
    await refreshAuth();
  };

  /** Starts the Google sign-in flow and returns the URL to open. */
  const startGoogleSignIn = async () => {
    return googleOAuthMutation.mutateAsync();
  };

  return {
    user,
    userInfo,
    isAuthenticated,

    login,
    register,
    completeAccount,
    startGoogleSignIn,
    logout,
    refreshAuth,

    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isCompletingAccount: completeAccountMutation.isPending,
    isStartingGoogleSignIn: googleOAuthMutation.isPending,

    loginError: loginMutation.error,
    registerError: registerMutation.error,
    completeAccountError: completeAccountMutation.error,
    googleOAuthError: googleOAuthMutation.error,
  };
};

export const useCurrentUser = () => {
  const { user, userInfo } = useAuthContext();
  return userInfo || user;
};
