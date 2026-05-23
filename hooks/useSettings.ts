import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settingsService';
import { UserSettingsToDo, UserSettingsTransactions, UserSettingsAccount, UserSettingsDisplay, AppTheme, UserSettingsChatBot } from '@/types/settings';
import { useThemeContext } from '@/providers/ThemeProvider';

// Query keys for React Query cache management
//
export const settingsKeys = {
  all: ['settings'] as const,
  todo: () => [...settingsKeys.all, 'todo'] as const,
  transactions: () => [...settingsKeys.all, 'transactions'] as const,
  account: () => [...settingsKeys.all, 'account'] as const,
  lifeNestTermsVersion: () => [...settingsKeys.all, 'lifeNestTermsVersion'] as const,
  theme: () => [...settingsKeys.all, 'theme'] as const,
  fontSize: () => [...settingsKeys.all, 'fontSize'] as const,
  allSettings: () => [...settingsKeys.all, 'allSettings'] as const,
};

// Hook for getting ToDo settings
//
export const useToDoSettings = () => {
  return useQuery({
    queryKey: settingsKeys.todo(),
    queryFn: () => settingsService.getToDoSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for updating ToDo settings
//
export const useUpdateToDoSettings = () => {
  //
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<UserSettingsToDo>) =>
      settingsService.updateToDoSettings(settings),
    onSuccess: (updatedSettings) => {
      // Update the cache with new settings
      queryClient.setQueryData(settingsKeys.todo(), updatedSettings);

      // Invalidate all settings cache
      queryClient.invalidateQueries({ queryKey: settingsKeys.allSettings() });
    },
    onError: (error) => {
      console.error('Failed to update ToDo settings:', error);
    },
  });
};

// Hook for getting transaction settings
//
export const useTransactionSettings = () => {
  return useQuery({
    queryKey: settingsKeys.transactions(),
    queryFn: () => settingsService.getTransactionSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for updating transaction settings
//
export const useUpdateTransactionSettings = () => {
  //
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<UserSettingsTransactions>) =>
      settingsService.updateTransactionSettings(settings),
    onSuccess: (updatedSettings) => {
      // Update the cache with new settings
      queryClient.setQueryData(settingsKeys.transactions(), updatedSettings);

      // Invalidate all settings cache
      queryClient.invalidateQueries({ queryKey: settingsKeys.allSettings() });
    },
    onError: (error) => {
      console.error('Failed to update transaction settings:', error);
    },
  });
};

// Hook for getting account settings
//
export const useAccountSettings = () => {
  return useQuery({
    queryKey: settingsKeys.account(),
    queryFn: () => settingsService.getAccountSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for updating account settings
//
export const useUpdateAccountSettings = () => {
  //
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<UserSettingsAccount>) =>
      settingsService.updateAccountSettings(settings),
    onSuccess: (updatedSettings) => {
      // Update the cache with new settings
      queryClient.setQueryData(settingsKeys.account(), updatedSettings);

      // Invalidate all settings cache
      queryClient.invalidateQueries({ queryKey: settingsKeys.allSettings() });
    },
    onError: (error) => {
      console.error('Failed to update account settings:', error);
    },
  });
};

// Hook for getting theme mode (light, dark, system)
//
export const useThemeMode = () => {
  return useQuery({
    queryKey: settingsKeys.theme(),
    queryFn: () => settingsService.getTheme(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for updating theme mode
//
export const useUpdateThemeMode = () => {
  //
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (theme: AppTheme) => settingsService.setTheme(theme),
    onSuccess: (_, theme) => {
      // Update the cache with new theme
      queryClient.setQueryData(settingsKeys.theme(), theme);
    },
    onError: (error) => {
      console.error('Failed to update theme:', error);
    },
  });
};

// Hook for getting default font
//
export const useDefaultFont = () => {
  return useQuery({
    queryKey: [...settingsKeys.all, 'defaultFont'],
    queryFn: () => settingsService.getDefaultFont(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for updating default font
//
export const useUpdateDefaultFont = () => {
  //
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (font: string) => settingsService.setDefaultFont(font),
    onSuccess: (_, font) => {
      // Update the cache with new font
      queryClient.setQueryData([...settingsKeys.all, 'defaultFont'], font);
    },
    onError: (error) => {
      console.error('Failed to update default font:', error);
    },
  });
};

// Hook for getting all settings at once
//
export const useAllSettings = () => {
  return useQuery({
    queryKey: settingsKeys.allSettings(),
    queryFn: () => settingsService.getAllSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for getting display settings
//
export const useDisplaySettings = () => { //Do I need these individual ones, if getAllSettings is a thing, or does something make use of these individual ones.
  return useQuery({
    queryKey: [...settingsKeys.all, 'display'],
    queryFn: () => settingsService.getDisplaySettings(false),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for updating display settings
//
export const useUpdateDisplaySettings = () => {
  //
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Omit<UserSettingsDisplay, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) =>
      settingsService.updateDisplaySettings(updates),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData([...settingsKeys.all, 'display'], updatedSettings);

      // Invalidate all settings cache
      queryClient.invalidateQueries({ queryKey: settingsKeys.allSettings() });
    },
    onError: (error) => {
      console.error('Failed to update display settings:', error);
    },
  });
};

//
export const useChatBotSettings = () => {
  return useQuery({
    queryKey: [...settingsKeys.all, 'chatBot'],
    queryFn: () => settingsService.getChatBotSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

//
export const useLifeNestTermsVersion = () => {
  return useQuery({
    queryKey: settingsKeys.lifeNestTermsVersion(),
    queryFn: () => settingsService.getLifeNestTermsVersion(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

//
export const useUpdateChatBotSettings = () => {
  //
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Omit<UserSettingsChatBot, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) =>
      settingsService.updateChatBotSettings(updates),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData([...settingsKeys.all, 'chatBot'], updatedSettings);
      // Invalidate all settings cache
      queryClient.invalidateQueries({ queryKey: settingsKeys.allSettings() });
    },
    onError: (error) => {
      console.error('Failed to update chatbot settings:', error);
    },
  });
};

// Main settings hook that combines common functionality
//
export const useSettings = () => {
  //
  const { data: allSettings, isLoading, error } = useAllSettings();
  //
  const { theme } = useThemeContext();
  //
  const { data: defaultFont } = useDefaultFont();
  return {
    settings: allSettings,
    theme,
    defaultFont,

    // Loading and error states
    isLoading,
    error,

    // Quick access to common settings
    todoSettings: allSettings?.todo,
    transactionSettings: allSettings?.transactions,
    accountSettings: allSettings?.account,
    displaySettings: allSettings?.display,
    chatBotSettings: allSettings?.chatBot,
  };
};
