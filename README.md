# Best me

A personal productivity + wellbeing app that plans your whole day from your
goals and psychological needs, syncs around your calendar, and keeps a **streak
that rewards balance, not grind**.

This repo is the MVP foundation: a running Expo app with the core daily loop
(onboard → plan → live timeline → reflect → streak) working offline against seed
data, plus the Supabase + Claude backend it's designed to sync with.

## Why "balance, not grind"

The streak only counts a day when you honored your **work AND at least one
wellness need** (movement / family / alone / rest). Banked "freezes" protect a
streak from a single off day, and a rolling **Wellness Score** ties the streak
to how balanced your life actually is — not to raw consecutive grind.

## Architecture

| Layer | What | Where |
|---|---|---|
| App | Expo (React Native) + TypeScript, Expo Router, NativeWind | `app/`, `src/` |
| Planning brain (rules) | Pure-TS scheduler: plans around fixed events, peak-energy placement, spaced deadlines, learned estimate factors, wellness backfill | `src/scheduler/` |
| Streak + wellness | Pure-TS balanced-day evaluator, freezes, rolling score | `src/streak/` |
| State | Zustand store tying scheduler + streak together | `src/stores/useAppStore.ts` |
| Calendar | `CalendarProvider` interface + `expo-calendar` device impl (covers Google/Outlook/Apple via the phone's aggregated calendars) | `src/lib/calendar/` |
| Backend | Supabase: Postgres schema + RLS, auth | `supabase/migrations/`, `src/lib/supabase.ts` |
| AI (hybrid) | Claude proxied through Supabase Edge Functions — morning narrative + evening reflection/estimate-learning | `supabase/functions/`, `src/lib/ai.ts` |

The hybrid planning brain: the deterministic `scheduler/` builds the time
blocks; **Claude** narrates the day and, at reflection, re-tunes the
per-category estimation factors so future plans fit reality.

## Run it

```bash
npm install
npm test           # 34 pure-logic tests (scheduler, streak, time)
npm run typecheck  # app TypeScript (Edge Functions are Deno, checked separately)
npx expo start     # boots to onboarding → Today (works offline on seed data)
```

In the app: complete onboarding (or tap **Skip and explore with sample data**)
to land on **Today** with a generated, calendar-aware block timeline, the streak
flame, and a wellness score. Mark blocks done/skipped, then **Close the day** to
see the balanced-day streak rule evaluate live.

## Connect the backend (optional for the MVP)

```bash
cp .env.example .env            # add EXPO_PUBLIC_SUPABASE_URL / ANON_KEY
supabase db push                # apply supabase/migrations/0001_init.sql (RLS)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy claude-summary claude-reflect
```

The Anthropic key lives only as an Edge Function secret — the app never holds
it. Default model is `claude-opus-4-8` (adaptive thinking on the reflection
function). When Supabase isn't configured, the app falls back to an offline
narrative so Today always has a brief.

## Roadmap (Phase 2)

Direct Microsoft Graph / Google Calendar OAuth for server-side re-planning and
push when the phone is closed, Expo push notifications for block reminders,
richer insights, and accountability features.
