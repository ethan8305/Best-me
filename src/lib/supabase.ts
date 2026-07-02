import { createClient } from "@supabase/supabase-js";

import { secureStorage } from "./secureStorage";

/**
 * Supabase client for Best me.
 *
 * Config comes from EXPO_PUBLIC_* env (safe to ship in the client — the anon
 * key only grants access through Row Level Security). The Claude API key is
 * NEVER here; it lives server-side in the Edge Functions (see
 * supabase/functions/*).
 *
 * Sessions are persisted in the OS keychain via secureStorage (encrypted at
 * rest, unlike AsyncStorage), and auth uses the PKCE flow so future OAuth /
 * magic-link logins can't have their authorization code intercepted.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
