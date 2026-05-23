//
export const BackendTables = {
  appConfig: process.env.EXPO_PUBLIC_BACKEND_TABLE_APP_CONFIG || 'app_config',
  userProfiles: process.env.EXPO_PUBLIC_BACKEND_TABLE_USER_PROFILES || 'user_profiles',
} as const;

//
export const BackendFunctions = {
  adConfig: process.env.EXPO_PUBLIC_BACKEND_FUNCTION_AD_CONFIG || 'ad-config',
  aiAssistant: process.env.EXPO_PUBLIC_BACKEND_FUNCTION_AI_ASSISTANT || 'ai-assistant',
  billingConfig: process.env.EXPO_PUBLIC_BACKEND_FUNCTION_BILLING_CONFIG || 'billing-config',
} as const;
