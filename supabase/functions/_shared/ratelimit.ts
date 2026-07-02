// Per-user daily quota on AI calls, backed by the ai_usage table
// (supabase/migrations/0002_security.sql). Uses the service-role key so the
// counter can't be tampered with from the client; the key never leaves the
// function runtime.
import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_DAILY_LIMIT = 50;

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

/**
 * Record one AI call for the user and report whether they are within quota.
 * Fails closed: if the counter can't be read/written, the call is denied.
 */
export async function checkRateLimit(
  userId: string,
  limit = Number(Deno.env.get("AI_DAILY_LIMIT") ?? DEFAULT_DAILY_LIMIT)
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = serviceClient();
  const day = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_day: day,
  });

  if (error || typeof data !== "number") {
    console.error("rate limit check failed:", error);
    return { allowed: false, remaining: 0 };
  }

  return { allowed: data <= limit, remaining: Math.max(0, limit - data) };
}
