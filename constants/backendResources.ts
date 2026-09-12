export const BackendTables = {
  appConfig: 'AppConfig',
  userProfiles: 'Users_Info',
} as const;

export const BackendFunctions = {
  adConfig: process.env.EXPO_PUBLIC_BACKEND_FUNCTION_AD_CONFIG || 'ad-config',
  aiAssistant: process.env.EXPO_PUBLIC_BACKEND_FUNCTION_AI_ASSISTANT || 'ai-assistant',
  billingConfig: process.env.EXPO_PUBLIC_BACKEND_FUNCTION_BILLING_CONFIG || 'billing-config',
} as const;
