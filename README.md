# Kinggdom

Play · Compete · Connect. A mobile-first social gaming platform for Chess and Checkers.

Stack: Vite, React 18, TypeScript, React Router, Zustand, chess.js, Supabase. Every screen is code-split.

## Run

```bash
npm install
cp .env.example .env   # then fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

Build with `npm run build`. It deploys as-is to Vercel (`vercel.json` handles SPA routing).

## What is built

All 27 mockup screens: splash, onboarding x3, sign up, log in, profile setup, home feed, search and results, discover, profile, edit profile, wallet, store, send gift, settings, notifications, chat and chat thread, live list, live stream, watch match, tournaments and details, leaderboard, game lobby, friends, community. Also: create post, create tournament, start stream, referral, and an admin placeholder.

Playable now: Chess (vs AI with 3 levels, pass-and-play, simulated online) and Checkers (same modes, mandatory captures, multi-jumps, kings).

## Architecture

```
src/
  pages/        one file per screen (lazy-loaded)
  components/   shared UI, boards, post and match cards, layouts
  services/     client.ts (the API contract), mockApi.ts, backendApi.ts, api.ts
  store/        Zustand app state (user, tokens, theme, toast)
  hooks/        useAsync, useLocalSetting, demo hooks
  lib/          supabase client, chess AI and checkers engine
  data/         mock seed data
  types/        shared domain types
```

## Backend (Supabase)

The backend is the Supabase project **quantumretailmanager** (ref `fpflwkgqdmgmrvsukyop`). Kinggdom data lives in the custom schema `kingdom` (not `public`; `public` belongs to the retail manager app).

Screens never call Supabase directly. They only use `api` from `src/services/api.ts`, which picks `mockApi` or `backendApi` (`src/services/backendApi.ts`, implementing `ApiClient` from `client.ts`).

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_ANON_KEY` (publishable key).
2. Set `VITE_USE_MOCK=false`.
3. On Vercel, add the same three variables under Project Settings > Environment Variables.

Frontend-callable edge functions: `submit-move`, `stream-token`, `create-deposit`, `ai-coach` (allow-listed in `src/lib/supabase.ts`). `send-push` and `payment-webhook` are server only.

Security notes: balances, game results, rewards and admin roles are enforced server-side (RLS, RPCs, edge functions). Never trust the client for token amounts, and never ship a service-role key to the browser.
