# Kinggdom

Play · Compete · Connect. A mobile-first social gaming platform for Chess and Checkers.

Stack: Vite, React 18, TypeScript, React Router, Zustand, chess.js. Every screen is code-split.

## Run

```bash
npm install
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
  lib/          chess AI and checkers engine
  data/         mock seed data
  types/        shared domain types
```

## Connecting the backend later

Screens never call a backend directly. They only use `api` from `src/services/api.ts`, which implements the `ApiClient` interface in `src/services/client.ts`.

1. Implement each method of `ApiClient` in `src/services/backendApi.ts` (currently a stub that rejects with a clear error).
2. Put the public URL and anon key in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Set `VITE_USE_MOCK=false`.

No screen needs to change. Items that are simulated until then: auth, payments and withdrawals, matchmaking, live video, chat and live-chat realtime, media uploads, 2FA, password reset.

Security notes for the backend work: enforce balances, game results, rewards and admin roles server-side (RLS and edge functions). Never trust the client for token amounts, and never ship a service-role key to the browser.
