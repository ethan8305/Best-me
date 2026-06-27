// Shared Anthropic client for Best me Edge Functions (Deno runtime).
//
// The API key is read from the ANTHROPIC_API_KEY Edge Function secret and never
// leaves the server. Set it with:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";

// Default model per Anthropic guidance: Opus 4.8 with adaptive thinking for
// anything non-trivial. Do not downgrade for cost without an explicit choice.
export const MODEL = "claude-opus-4-8";

export function anthropicClient(): Anthropic {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

/** Pull the concatenated text out of a Messages API response. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
