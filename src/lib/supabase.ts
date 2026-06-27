import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for Best me.
 *
 * Config comes from EXPO_PUBLIC_* env (safe to ship in the client — the anon
 * key only grants access through Row Level Security). The Claude API key is
 * NEVER here; it lives server-side in the Edge Functions (see
 * supabase/functions/*). AsyncStorage persists the session across launches.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
