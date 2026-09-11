import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingKeys = [
    !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean).join(', ');

  console.error(`Supabase environment configuration is missing: ${missingKeys}`);
  throw new Error(`SUPABASE_ENV_MISSING:${missingKeys}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Helper to get current user
export async function getCurrentUser() {
  try {
    return supabase.auth.getUser();
  } catch (error) {
    console.error('supabase.getCurrentUser', error);
    throw error;
  }
};

/** Validates the persisted access token with Supabase before protected hydration. */
export async function validateSession() {
  try {
    return await supabase.auth.getUser();
  } catch (error) {
    console.error('supabase.validateSession', error);
    throw error;
  }
}

// Helper to get session
export async function getSession() {
  try {
    const user = await supabase.auth.getSession();
    //if (!user?.data.session?.user?.email) throw new Error('Not authenticated');
    return user;
  } catch (error) {
    console.error("Error getting session:", error);
    throw error;
  }
};

export async function refreshSession() {
  try {
    await supabase.auth.refreshSession();
  } catch (error) {
    console.error('supabase.refreshSession', error);
    throw error;
  }
}
