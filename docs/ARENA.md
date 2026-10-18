# Kinggdom Arena: monthly league, championship and official stream

This document explains how the Arena works today (demo, runs in the browser) and how to connect it to a real backend while keeping streaming costs close to zero.

## What is built

- **Competitions**: monthly checkers league (round robin, football-style table) and knockout championship (bracket).
- **Schedule and countdowns**: every match has a start time. The clock lives in `src/arena/store.ts` (`tick`).
- **Automatic invitations**: when a match time arrives both players are invited. The signed-in player sees an Accept / Forfeit prompt (`src/arena/ArenaRuntime.tsx`). Accepting sends them straight to `/arena/match/:id`. No answer within 90 seconds counts as a forfeit.
- **Automatic updates**: results update the table, fill the next bracket slot, schedule the next match, and close the competition when the last match ends (`finishIn` in the store).
- **Official stream** (`/arena/live`): shows the match the admin picked (or the best live match). Viewers can chat and send gifts.
- **Gifts go to the admin, not the players**: gifts are sent to `KinggdomOfficial` and counted in the prize fund. The admin pays prizes from that fund.
- **Admin panel** (`/admin/arena`, needs `VITE_SHOW_ADMIN=true`): tournaments, livestream, gifts and prize payments.
- **Player camera and mic**: on/off toggles on the match screen. Camera preview and a mic level meter work locally.

## What is simulated in the demo

- Opponents are bots. Matches between other players are played by a simple checkers AI so the tables move on their own.
- Player video and voice are not yet sent to the opponent or to viewers.
- State is stored in the browser (`localStorage`), so it is per device.
- Admin access is a front-end flag. Real admin tools must be protected by server-side role checks.

## Keeping streaming costs near zero

The expensive part of live platforms is video relay. This design avoids it:

1. **Stream the game, not a video of it.** A checkers game is a list of moves (a few bytes each). The server broadcasts moves over a realtime channel (for example Supabase Realtime or any WebSocket) and every viewer draws the board locally. Thousands of viewers cost almost nothing.
2. **Player faces and voice are peer-to-peer (WebRTC).** The two players connect directly. Use free STUN and only fall back to a TURN relay when a direct connection fails (a small fraction of calls).
3. **Viewers do not receive player video by default.** They see the board, the move list, chat and gifts. If you want faces for viewers, send one small snapshot per player every few seconds, or relay only the one featured match through a single low-bitrate SFU stream.
4. **One official stream at a time.** Only the featured match is broadcast. Other matches are just move streams.
5. **Admin commentary** is a single outbound audio or video stream. Use a hosted live provider only for this one stream, and turn it off between matches.
6. **Short, rate-limited chat** and no stored video keeps storage and bandwidth low.

## Backend contract (to replace the demo store)

Tables: `competitions`, `matches`, `match_moves`, `gifts`, `prizes`, `official_stream`.

- Matches: `id, comp_id, round, a, b, starts_at, status, accepted_a, accepted_b, invite_expires_at, result`.
- A scheduled job (or database cron) runs every few seconds: moves `scheduled` matches to `invited` at `starts_at`, forfeits un-accepted invitations after the deadline, and writes results.
- Players subscribe to their own invitations through a realtime channel and show the same Accept / Forfeit prompt.
- Moves are validated on the server. The server declares the winner, updates standings, fills the next bracket slot and schedules the next match.
- Gifts: charge tokens from the viewer, credit the platform account, and add to the prize fund. Prize payment is an admin-only server action that checks the fund balance and credits the winner wallet.
- Use row-level security so only admins can create competitions, control the stream and pay prizes.
