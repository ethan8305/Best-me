// CORS + response helpers.
//
// Browsers send an Origin header; only allowlisted origins get CORS grants
// (set ALLOWED_ORIGINS as a comma-separated Edge Function secret, e.g. your
// web/PWA domains). Native app requests carry no Origin — CORS doesn't apply
// to them, so they pass through untouched. Auth is enforced separately in
// auth.ts either way.

function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (!origin) return {}; // native app / server-to-server: no CORS needed
  if (!allowedOrigins().includes(origin)) return {}; // browser from unknown origin: no grant
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

/**
 * Log the real error server-side, return only a generic message to the client
 * so internals (stack traces, provider errors, config) never leak.
 */
export function serverError(req: Request, err: unknown): Response {
  console.error(err);
  return json(req, { error: "Something went wrong. Please try again." }, 500);
}
