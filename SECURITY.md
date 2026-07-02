# Security — Best me

No app is "impervious to hacks." Best me's security posture is
**defense-in-depth**: shrink the attack surface, make every layer assume the
one above it failed, and keep the blast radius of any single failure small.
This document is the threat model, what's implemented against it, and the
operator checklist for the pieces that live in the Supabase dashboard rather
than in code.

## Threat model

| Threat | Defense |
|---|---|
| API / cost abuse (anyone spamming the Claude proxy) | Edge Functions require a verified user JWT (401), enforce a per-user daily AI quota via `ai_usage` + `increment_ai_usage()` (429), and cap request body size and field lengths (400). The rate limiter **fails closed**. |
| Stolen / rooted / backed-up device | Sessions (incl. the refresh token) live in the OS keychain via `expo-secure-store` (`src/lib/secureStorage.ts`), not plaintext AsyncStorage. Auth uses the PKCE flow. |
| One user reading another's data | Row-Level Security on every table, `FORCE ROW LEVEL SECURITY` so even the table owner is subject to it, and all `anon` grants revoked — an unauthenticated key reaches nothing. |
| Anthropic key theft | The key exists only as an Edge Function secret (`supabase secrets set ANTHROPIC_API_KEY=...`). It is never in the repo, the app bundle, or client-reachable config. |
| Prompt injection via user text (block titles, notes) | User text is validated/size-capped, interpolated only into the user turn ("data, not instructions" is stated in the system prompt), and `claude-reflect` output is schema-constrained via structured outputs. |
| Information disclosure via errors | Clients get generic error messages; real errors go to server logs only (`serverError()` in `_shared/cors.ts`). |
| Malicious browser origins | CORS grants only to origins in the `ALLOWED_ORIGINS` secret; unknown origins get no CORS headers. (Native apps send no Origin; they're covered by JWT auth.) |
| Vulnerable dependencies | `npm run audit` (high+ fails), CI runs it on every PR, Dependabot opens weekly update PRs. |
| SQL injection via Postgres functions | `security definer` functions pin `search_path = public`; all app queries go through supabase-js parameterization. |

## Data sensitivity

Reflections and notes can describe mood and mental health. Current stance
(deliberate, user-chosen): **RLS + Supabase encryption at rest**, so the
backend can read notes — that is what lets Claude reflect on them. If that
tradeoff changes, the alternatives are end-to-end encryption (disables AI
reflection on notes) or not persisting free text at all.

## Operator checklist (Supabase dashboard — not settable in SQL)

- [ ] Edge Functions: `verify_jwt` **on** for `claude-summary` and `claude-reflect` (default; don't pass `--no-verify-jwt` on deploy).
- [ ] Secrets set: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS` (comma-separated web origins), optional `AI_DAILY_LIMIT` (default 50).
- [ ] Auth → enable **leaked password protection** (HaveIBeenPwned) before shipping password auth.
- [ ] Auth → keep OTP expiry ≤ 1 hour and JWT expiry at the default (or shorter).
- [ ] Auth → restrict the **redirect URL allowlist** to the app scheme (`bestme://`) and known web origins.
- [ ] Database → **enforce SSL** on connections.
- [ ] Keep the **service role key** out of all client config; it belongs only to Edge Function secrets / server environments.

## Known gaps (deliberately deferred to Phase 2)

- Real authentication (email OTP / OAuth) with **MFA** — the single highest-value
  item for account safety once accounts exist.
- TLS certificate pinning and jailbreak/root detection in the app.
- Optional client-side encryption for free-text notes.

## Reporting

This is a personal project. If you find a vulnerability, please open a private
security advisory on the GitHub repository rather than a public issue.
