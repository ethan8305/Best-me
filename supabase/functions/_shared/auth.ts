// Caller authentication for Best me Edge Functions.
//
// Supabase's gateway already rejects requests without a valid JWT when
// verify_jwt is enabled (the default — keep it on). This is the inner check:
// it resolves the JWT to a real user via the Auth server, so a request signed
// with only the anon key (no user session) cannot reach Claude, and every call
// is attributable to a user id for rate limiting.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface AuthedRequest {
  userId: string;
  /** Client scoped to the caller's JWT — all queries run under their RLS. */
  supabase: SupabaseClient;
}

export async function authenticate(req: Request): Promise<AuthedRequest | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const jwt = authHeader.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return null;

  return { userId: data.user.id, supabase };
}
