import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chess } from 'chess.js';
import { users } from '../data/mock';
import type { GameType, User } from '../types';
import { aiMove, applyMove, initialBoard } from '../lib/checkers';
import type { Board, Side } from '../lib/checkers';
import { bestMove } from '../lib/chessAI';
import type { ArenaMatch, ArenaResult, ArenaState, BoardState, CompKind, Competition, EndReason, GiftRecord, NewComp, Prize, SideName, StandingRow } from './types';

/** Gifts are sent to this account (the admin / platform), never to the players. */
export const OFFICIAL = 'KinggdomOfficial';
/** How long a player has to accept a match invitation before they forfeit. */
export const INVITE_MS = 90000;
const MIN = 60000;
const HUMAN_MATCH_MAX_MS = 20 * MIN;
const SEED_MAX_AGE_MS = 6 * 60 * MIN;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; };

export const GAME_LABEL: Record<GameType, string> = { chess: 'Chess', checkers: 'Checkers' };
/** Which colour each player has. First player: White (chess) or Red (checkers). */
export const sideName = (game: GameType, slot: 'a' | 'b'): SideName => (slot === 'b' ? 'Black' : game === 'chess' ? 'White' : 'Red');

// ---------- players ----------
const mkUser = (username: string, rating: number): User => ({
  id: username.toLowerCase(), name: username, username, level: Math.max(1, Math.round(rating / 150)), bio: '', country: 'Nigeria', rating,
  followers: 0, following: 0, games: 0, wins: 0, losses: 0, draws: 0, badges: [], online: true, profileComplete: true, favoriteGame: 'checkers',
});
const BOTS = [mkUser('NightKnight', 1810), mkUser('DiscoDama', 1580), mkUser('CrownRacer', 1450), mkUser('JumpMaster', 1330)];
const registry = new Map<string, User>();
[...users, ...BOTS].forEach((u) => registry.set(u.username, u));
export const registerUser = (u: User) => { registry.set(u.username, u); };
export const playerUser = (username: string): User => registry.get(username) ?? mkUser(username, 1000);
export const allPlayerNames = () => Array.from(registry.keys());
const rating = (u: string | null) => (u ? playerUser(u).rating : 0);
export const levelFor = (u: string | null) => (rating(u) >= 1900 ? 3 : rating(u) >= 1500 ? 2 : 1);

// ---------- live boards (not persisted) ----------
export const freshBoard = (): BoardState => ({ board: initialBoard(), turn: 'r', cont: null, n: 0, last: null, fen: new Chess().fen(), lastSq: null });
interface BoardsStore { boards: Record<string, BoardState>; put: (id: string, b: BoardState) => void; reset: (id: string) => void }
export const useBoards = create<BoardsStore>((set) => ({
  boards: {},
  put: (id, b) => set((s) => ({ boards: { ...s.boards, [id]: b } })),
  reset: (id) => set((s) => ({ boards: { ...s.boards, [id]: freshBoard() } })),
}));
const pieces = (b: Board, s: Side) => b.flat().filter((p) => p && p.toLowerCase() === s).length;
const byPieces = (b: Board, a: string | null, bl: string | null): string | null => {
  const r = pieces(b, 'r'); const k = pieces(b, 'b');
  return r > k ? a : k > r ? bl : null;
};
const MAT: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const byMaterial = (fen: string, a: string | null, bl: string | null): string | null => {
  let s = 0;
  for (const row of new Chess(fen).board()) for (const p of row) if (p) s += (p.color === 'w' ? 1 : -1) * MAT[p.type];
  return s >= 2 ? a : s <= -2 ? bl : null;
};
/** Winner of an unfinished game decided on material (used for demo safety nets). */
const bySize = (game: GameType, bs: BoardState, a: string | null, b: string | null) => (game === 'chess' ? byMaterial(bs.fen, a, b) : byPieces(bs.board, a, b));

// ---------- schedule builders ----------
function roundRobin(players: string[]): [string, string][][] {
  const list: (string | null)[] = [...players];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = list[i]; const y = list[n - 1 - i];
      if (x && y) pairs.push(r % 2 === 0 ? [x, y] : [y, x]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop() as string | null);
  }
  return rounds;
}

function seedOrder(n: number): number[] {
  let o = [1, 2];
  while (o.length < n) { const m = o.length * 2 + 1; o = o.flatMap((s) => [s, m - s]); }
  return o;
}

function fakeResult(a: string, b: string, salt: number): ArenaResult {
  const h = (hash(a + b) + salt * 13) % 10;
  if (h === 0) return { winner: null, reason: 'draw' };
  const higher = rating(a) >= rating(b) ? a : b;
  const lower = higher === a ? b : a;
  return { winner: h <= 7 ? higher : lower, reason: 'played' };
}

function prizesFor(kind: CompKind, pool: number): Prize[] {
  const split: [string, number][] = kind === 'monthly'
    ? [['1st', 0.5], ['2nd', 0.3], ['3rd', 0.2]]
    : [['Champion', 0.5], ['Runner-up', 0.25], ['Semi-finalist', 0.125], ['Semi-finalist', 0.125]];
  return split.map(([place, f]) => ({ place, tokens: Math.round(pool * f), to: null, paid: false }));
}

interface BuildArgs { id: string; name: string; game: GameType; kind: CompKind; players: string[]; prizePool: number; firstStart: number; gapMinutes: number }

function buildComp(a: BuildArgs, now: number, past: boolean): Competition {
  const matches: ArenaMatch[] = [];
  if (a.kind === 'monthly') {
    roundRobin(a.players).forEach((pairs, r) => {
      pairs.forEach(([x, y], k) => {
        const startsAt = a.firstStart + r * a.gapMinutes * MIN;
        const m: ArenaMatch = { id: a.id + '-m' + r + '-' + k, compId: a.id, round: 'Matchday ' + (r + 1), a: x, b: y, startsAt, status: 'scheduled', accepted: { a: false, b: false } };
        if (past && startsAt < now - 30000) { m.status = 'finished'; m.accepted = { a: true, b: true }; m.result = fakeResult(x, y, r * 7 + k); }
        matches.push(m);
      });
    });
  } else {
    const seeded = [...a.players].sort((p, q) => rating(q) - rating(p));
    const n = seeded.length;
    const order = seedOrder(n);
    const roundCount = Math.round(Math.log2(n));
    const names = ['Final', 'Semi-final', 'Quarter-final', 'Round of 16', 'Round of 32'];
    const rounds: ArenaMatch[][] = [];
    let count = n / 2;
    for (let r = 0; r < roundCount; r++) {
      const rm: ArenaMatch[] = [];
      for (let i = 0; i < count; i++) {
        rm.push({
          id: a.id + '-r' + r + '-' + i, compId: a.id, round: names[roundCount - 1 - r],
          a: r === 0 ? seeded[order[i * 2] - 1] : null, b: r === 0 ? seeded[order[i * 2 + 1] - 1] : null,
          startsAt: r === 0 ? a.firstStart : null, status: 'scheduled', accepted: { a: false, b: false },
        });
      }
      rounds.push(rm);
      count = count / 2;
    }
    rounds.forEach((rm, r) => rm.forEach((m, i) => {
      if (r < rounds.length - 1) m.next = { matchId: rounds[r + 1][Math.floor(i / 2)].id, slot: i % 2 === 0 ? 'a' : 'b' };
      matches.push(m);
    }));
  }
  return {
    id: a.id, name: a.name, game: a.game, kind: a.kind, status: matches.some((m) => m.status === 'finished') ? 'live' : 'upcoming',
    players: a.players, prizePool: a.prizePool, prizes: prizesFor(a.kind, a.prizePool), matches, gapMinutes: a.gapMinutes, createdAt: now,
  };
}

// ---------- derived data ----------
export function standings(c: Competition): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  c.players.forEach((p) => rows.set(p, { user: p, p: 0, w: 0, d: 0, l: 0, pts: 0, form: [], live: false }));
  const done = c.matches.filter((m) => m.status === 'finished' && m.a && m.b && m.result).sort((x, y) => (x.startsAt ?? 0) - (y.startsAt ?? 0));
  for (const m of done) {
    const ra = rows.get(m.a as string); const rb = rows.get(m.b as string);
    if (!ra || !rb || !m.result) continue;
    ra.p++; rb.p++;
    const w = m.result.winner;
    if (w === null) {
      if (m.result.reason === 'draw') { ra.d++; rb.d++; ra.pts++; rb.pts++; ra.form.push('D'); rb.form.push('D'); }
      else { ra.l++; rb.l++; ra.form.push('L'); rb.form.push('L'); }
    } else {
      const win = w === m.a ? ra : rb; const lose = w === m.a ? rb : ra;
      win.w++; win.pts += 3; win.form.push('W'); lose.l++; lose.form.push('L');
    }
  }
  for (const m of c.matches) {
    if (m.status !== 'live') continue;
    [m.a, m.b].forEach((u) => { const r = u ? rows.get(u) : undefined; if (r) r.live = true; });
  }
  return Array.from(rows.values())
    .map((r) => ({ ...r, form: r.form.slice(-5) }))
    .sort((x, y) => y.pts - x.pts || y.w - x.w || rating(y.user) - rating(x.user));
}

export type MatchRef = { comp: Competition; match: ArenaMatch };

export function nextMatchFor(comps: Competition[], user: string): MatchRef | null {
  let best: MatchRef | null = null; let bestRank = 9; let bestT = Infinity;
  for (const comp of comps) {
    for (const match of comp.matches) {
      if (match.status === 'finished' || (match.a !== user && match.b !== user)) continue;
      const rank = match.status === 'live' || match.status === 'invited' ? 0 : 1;
      const t = match.startsAt ?? Infinity;
      if (!best || rank < bestRank || (rank === bestRank && t < bestT)) { best = { comp, match }; bestRank = rank; bestT = t; }
    }
  }
  return best;
}

export function pickFeatured(comps: Competition[], official: { featuredMatchId: string | null }): MatchRef | null {
  const all: MatchRef[] = comps.flatMap((comp) => comp.matches.map((match) => ({ comp, match })));
  const ready = (x: MatchRef) => !!x.match.a && !!x.match.b;
  const pinned = official.featuredMatchId ? all.find((x) => x.match.id === official.featuredMatchId && x.match.status !== 'finished' && ready(x)) : undefined;
  if (pinned) return pinned;
  const ordered = [...all].sort((x, y) => (x.comp.kind === 'championship' ? 0 : 1) - (y.comp.kind === 'championship' ? 0 : 1));
  const live = ordered.find((x) => x.match.status === 'live');
  if (live) return live;
  const invited = ordered.find((x) => x.match.status === 'invited');
  if (invited) return invited;
  const upcoming = ordered.filter((x) => x.match.status === 'scheduled' && ready(x) && x.match.startsAt !== null).sort((x, y) => (x.match.startsAt as number) - (y.match.startsAt as number));
  return upcoming[0] ?? null;
}

export const fundOf = (s: { gifts: GiftRecord[]; fundPaidOut: number }) => s.gifts.reduce((n, g) => n + g.tokens, 0) - s.fundPaidOut;

// ---------- result engine ----------
function completeComp(c: Competition) {
  c.status = 'completed';
  if (c.kind === 'monthly') {
    const rows = standings(c);
    c.prizes.forEach((p, i) => { p.to = rows[i] ? rows[i].user : null; });
    return;
  }
  const final = c.matches.find((m) => m.round === 'Final');
  const fw = final && final.result ? final.result.winner : null;
  const fl = final && fw ? (final.a === fw ? final.b : final.a) : null;
  const losers = c.matches.filter((m) => m.round === 'Semi-final').map((m) => (m.result && m.result.winner ? (m.a === m.result.winner ? m.b : m.a) : null));
  const order: (string | null)[] = [fw, fl, ...losers];
  c.prizes.forEach((p, i) => { p.to = order[i] ?? null; });
}

/** Records a result, fills the next bracket slot, schedules the next match and closes the competition when done. */
function finishIn(comps: Competition[], matchId: string, win: string | null, reason: EndReason, now: number) {
  for (const c of comps) {
    const m = c.matches.find((x) => x.id === matchId);
    if (!m || m.status === 'finished') continue;
    let w = win;
    // A knockout needs a winner: if nobody can be separated, the higher-rated player goes through.
    if (c.kind === 'championship' && w === null && m.a && m.b) w = rating(m.a) >= rating(m.b) ? m.a : m.b;
    m.status = 'finished';
    m.result = { winner: w, reason };
    if (m.next && w) {
      const nx = c.matches.find((x) => x.id === (m.next as { matchId: string }).matchId);
      if (nx) {
        if (m.next.slot === 'a') nx.a = w; else nx.b = w;
        if (nx.a && nx.b && nx.startsAt === null) nx.startsAt = now + c.gapMinutes * MIN;
      }
    }
    if (c.matches.every((x) => x.status === 'finished')) completeComp(c);
  }
}

// ---------- store ----------
const emptyState = (): ArenaState => ({
  seededFor: null, seededAt: 0, comps: [], gifts: [], fundPaidOut: 0,
  official: { live: true, title: 'Kinggdom Official Arena', featuredMatchId: null, startedAt: null },
});

function seedGifts(now: number): GiftRecord[] {
  const base: [string, string, string, number][] = [
    ['KingMaster23', 'Crown', '👑', 100], ['QueenBee', 'Rocket', '🚀', 200], ['SilentMove', 'Diamond', '💎', 500], ['LadyTactics', 'Rose', '🌹', 10],
    ['RookBoss', 'King', '🤴', 1000], ['ChessPro', 'Whale', '🐋', 50], ['NightKnight', 'Diamond', '💎', 500], ['DiscoDama', 'Rocket', '🚀', 200],
  ];
  const out: GiftRecord[] = [];
  for (let i = 0; i < 40; i++) {
    const [from, name, emoji, tokens] = base[i % base.length];
    out.push({ id: 'sg' + i, from, name, emoji, tokens: tokens * (1 + (i % 3)), at: now - i * 17 * MIN });
  }
  return out;
}

function seed(me: User, now: number): ArenaState {
  registerUser(me);
  const pool = ['QueenBee', 'KingMaster23', 'SilentMove', 'LadyTactics', 'RookBoss', 'ChessPro', 'NightKnight', 'DiscoDama'].filter((n) => n !== me.username);
  const month = new Date(now).toLocaleString('en-US', { month: 'long' });
  const six = [me.username, ...pool.slice(0, 5)];
  const eight = [me.username, ...pool.slice(0, 7)];
  const comps = [
    // Timeline for the demo: invitations arrive at about +1.5, +5, +9 and +13 minutes.
    buildComp({ id: 'cmp-chk-league', name: month + ' Checkers League', game: 'checkers', kind: 'monthly', players: six, prizePool: 3000, firstStart: now + 90000 - 2 * 4 * MIN, gapMinutes: 4 }, now, true),
    buildComp({ id: 'cmp-chs-league', name: month + ' Chess League', game: 'chess', kind: 'monthly', players: six.slice().reverse(), prizePool: 3000, firstStart: now + 5 * MIN - 2 * 6 * MIN, gapMinutes: 6 }, now, true),
    buildComp({ id: 'cmp-chs-champ', name: 'Kinggdom Chess Championship', game: 'chess', kind: 'championship', players: eight, prizePool: 8000, firstStart: now + 9 * MIN, gapMinutes: 3 }, now, false),
    buildComp({ id: 'cmp-chk-champ', name: 'Kinggdom Checkers Championship', game: 'checkers', kind: 'championship', players: eight, prizePool: 6000, firstStart: now + 13 * MIN, gapMinutes: 3 }, now, false),
  ];
  return { ...emptyState(), seededFor: me.username, seededAt: now, comps, gifts: seedGifts(now), official: { live: true, title: 'Kinggdom Official Arena', featuredMatchId: null, startedAt: now } };
}

interface ArenaStore extends ArenaState {
  init: (me: User) => void;
  reset: (me: User) => void;
  tick: (now: number, me: string) => void;
  accept: (matchId: string, who: string) => void;
  forfeit: (matchId: string, who: string) => void;
  finishMatch: (matchId: string, winner: string | null, reason: EndReason) => void;
  startNow: (matchId: string) => void;
  recordGift: (from: string, name: string, emoji: string, tokens: number) => void;
  createCompetition: (i: NewComp) => string;
  deleteCompetition: (id: string) => void;
  setOfficial: (p: Partial<ArenaState['official']>) => void;
  payPrize: (compId: string, idx: number) => string | null;
}

export const useArena = create<ArenaStore>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      init: (me) => {
        registerUser(me);
        const s = get();
        const now = Date.now();
        if (s.seededFor !== me.username || now - s.seededAt > SEED_MAX_AGE_MS) set(seed(me, now));
      },
      reset: (me) => set(seed(me, Date.now())),

      tick: (now, me) => {
        const comps = clone(get().comps);
        const boards = useBoards.getState();
        const finishes: { id: string; w: string | null; reason: EndReason }[] = [];
        let changed = false;

        for (const c of comps) {
          if (c.status === 'completed') continue;
          for (const m of c.matches) {
            if (m.status === 'scheduled') {
              // Automatic invitation when the match time arrives.
              if (m.a && m.b && m.startsAt !== null && m.startsAt <= now) {
                m.status = 'invited';
                m.inviteExpiresAt = now + INVITE_MS;
                m.accepted = { a: false, b: false };
                m.botAcceptAt = {};
                if (m.a !== me) m.botAcceptAt.a = now + 1500 + Math.random() * 6000;
                if (m.b !== me) m.botAcceptAt.b = now + 1500 + Math.random() * 6000;
                changed = true;
              }
            } else if (m.status === 'invited') {
              const bt = m.botAcceptAt ?? {};
              if (bt.a && now >= bt.a && !m.accepted.a) { m.accepted.a = true; changed = true; }
              if (bt.b && now >= bt.b && !m.accepted.b) { m.accepted.b = true; changed = true; }
              if (m.accepted.a && m.accepted.b) {
                m.status = 'live'; m.liveSince = now; boards.reset(m.id); changed = true;
              } else if (m.inviteExpiresAt && now >= m.inviteExpiresAt) {
                if (m.accepted.a) finishes.push({ id: m.id, w: m.a, reason: 'forfeit' });
                else if (m.accepted.b) finishes.push({ id: m.id, w: m.b, reason: 'forfeit' });
                else finishes.push({ id: m.id, w: null, reason: 'no-show' });
              }
            } else if (m.status === 'live') {
              const human = m.a === me || m.b === me;
              const bs = clone(boards.boards[m.id] ?? freshBoard());
              if (human) {
                // A real player drives this board from the match screen. Safety net if they walk away.
                if (m.liveSince && now - m.liveSince > HUMAN_MATCH_MAX_MS) {
                  const w = bySize(c.game, bs, m.a, m.b);
                  finishes.push({ id: m.id, w, reason: w ? 'played' : 'draw' });
                }
                continue;
              }
              // Demo engine: plays the other matches so standings and brackets update on their own.
              for (let k = 0; k < 2; k++) {
                if (c.game === 'chess') {
                  const g = new Chess(bs.fen);
                  const mv = bestMove(g, levelFor(g.turn() === 'w' ? m.a : m.b));
                  if (!mv) {
                    if (g.isCheckmate()) finishes.push({ id: m.id, w: g.turn() === 'w' ? m.b : m.a, reason: 'played' });
                    else finishes.push({ id: m.id, w: null, reason: 'draw' });
                    break;
                  }
                  const r = g.move(mv);
                  bs.fen = g.fen(); bs.lastSq = { from: r.from, to: r.to }; bs.n += 1; bs.turn = g.turn() === 'w' ? 'r' : 'b';
                  if (g.isCheckmate()) { finishes.push({ id: m.id, w: r.color === 'w' ? m.a : m.b, reason: 'played' }); break; }
                  if (g.isDraw()) { finishes.push({ id: m.id, w: null, reason: 'draw' }); break; }
                  if (bs.n >= 140) { const w = byMaterial(bs.fen, m.a, m.b); finishes.push({ id: m.id, w, reason: w ? 'played' : 'draw' }); break; }
                } else {
                  const mv = aiMove(bs.board, bs.turn, bs.cont, levelFor(bs.turn === 'r' ? m.a : m.b));
                  if (!mv) { finishes.push({ id: m.id, w: bs.turn === 'r' ? m.b : m.a, reason: 'played' }); break; }
                  const r = applyMove(bs.board, mv);
                  bs.board = r.board; bs.turn = r.next; bs.cont = r.cont; bs.n += 1; bs.last = { from: mv.from, to: mv.to };
                  if (bs.n >= 110) { const w = byPieces(bs.board, m.a, m.b); finishes.push({ id: m.id, w, reason: w ? 'played' : 'draw' }); break; }
                }
              }
              boards.put(m.id, bs);
            }
          }
        }

        for (const f of finishes) { finishIn(comps, f.id, f.w, f.reason, now); changed = true; }
        for (const c of comps) {
          if (c.status === 'upcoming' && c.matches.some((m) => m.status !== 'scheduled')) { c.status = 'live'; changed = true; }
        }
        if (changed) set({ comps });
      },

      accept: (matchId, who) => {
        const comps = clone(get().comps);
        for (const c of comps) {
          const m = c.matches.find((x) => x.id === matchId);
          if (!m || m.status !== 'invited') continue;
          if (m.a === who) m.accepted.a = true;
          if (m.b === who) m.accepted.b = true;
          if (m.accepted.a && m.accepted.b) { m.status = 'live'; m.liveSince = Date.now(); useBoards.getState().reset(m.id); }
        }
        set({ comps });
      },

      forfeit: (matchId, who) => {
        const comps = clone(get().comps);
        const m = comps.flatMap((c) => c.matches).find((x) => x.id === matchId);
        if (!m) return;
        finishIn(comps, matchId, m.a === who ? m.b : m.a, 'forfeit', Date.now());
        set({ comps });
      },

      finishMatch: (matchId, winner, reason) => {
        const comps = clone(get().comps);
        finishIn(comps, matchId, winner, reason, Date.now());
        set({ comps });
      },

      startNow: (matchId) => {
        const comps = clone(get().comps);
        const m = comps.flatMap((c) => c.matches).find((x) => x.id === matchId);
        if (m && m.status === 'scheduled' && m.a && m.b) m.startsAt = Date.now();
        set({ comps });
      },

      recordGift: (from, name, emoji, tokens) => {
        const rec: GiftRecord = { id: 'g' + Date.now() + Math.random().toString(36).slice(2, 5), from, name, emoji, tokens, at: Date.now() };
        set((s) => ({ gifts: [rec, ...s.gifts].slice(0, 300) }));
      },

      createCompetition: (i) => {
        const now = Date.now();
        const id = 'cmp-' + now.toString(36);
        const comp = buildComp({ id, name: i.name, game: i.game, kind: i.kind, players: i.players, prizePool: i.prizePool, firstStart: now + i.firstStartMinutes * MIN, gapMinutes: i.gapMinutes }, now, false);
        set((s) => ({ comps: [comp, ...s.comps] }));
        return id;
      },

      deleteCompetition: (id) => set((s) => ({ comps: s.comps.filter((c) => c.id !== id) })),

      setOfficial: (p) => set((s) => ({ official: { ...s.official, ...p, startedAt: p.live === true && !s.official.live ? Date.now() : s.official.startedAt } })),

      payPrize: (compId, idx) => {
        const s = get();
        const comps = clone(s.comps);
        const c = comps.find((x) => x.id === compId);
        const p = c ? c.prizes[idx] : undefined;
        if (!c || !p) return 'Prize not found';
        if (!p.to) return 'No winner yet';
        if (p.paid) return 'Already paid';
        if (fundOf(s) < p.tokens) return 'Not enough gift revenue in the prize fund';
        p.paid = true; p.paidAt = Date.now();
        set({ comps, fundPaidOut: s.fundPaidOut + p.tokens });
        return null;
      },
    }),
    {
      name: 'kinggdom-arena-v2',
      partialize: (s) => ({ seededFor: s.seededFor, seededAt: s.seededAt, comps: s.comps, gifts: s.gifts, fundPaidOut: s.fundPaidOut, official: s.official }),
    }
  )
);
