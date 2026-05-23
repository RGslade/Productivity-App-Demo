import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

//
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
//
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

//
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Backend environment configuration is missing.');
  throw new Error('BACKEND_ENV_MISSING');
}

//
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper to get current user
//
export async function getCurrentUser() {
  //
  try {
    return supabase.auth.getUser();
  } catch (error) {
    console.error('supabase.getCurrentUser', error);
    throw error;
  }
};

// Helper to get session
//
export async function getSession() {
  //
  try {
    //
    const user = await supabase.auth.getSession();
    //if (!user?.data.session?.user?.email) throw new Error('Not authenticated');
    return user;
  } catch (error) {
    console.error("Error getting session:", error);
    throw error;
  }
};

//
export async function refreshSession() {
  //
  try {
    await supabase.auth.refreshSession();
  } catch (error) {
    console.error('supabase.refreshSession', error);
    throw error;
  }
}
