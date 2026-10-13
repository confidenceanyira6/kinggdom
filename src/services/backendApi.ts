import type { ApiClient } from './client';
import type { AppNotification, Community, GameType, Message, Post, Tournament, Transaction, User } from '../types';
import { supabase, callFunction } from '../lib/supabase';

/**
 * Real backend adapter: Supabase project "quantumretailmanager", schema "kingdom".
 * Written against backend-export (tables, RLS, RPCs, edge functions). Only the
 * publishable key is used; money/payments go through RPCs or the create-deposit
 * edge function; game moves go through submit-move (see Game page).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const fail = (m: string) => new Error(m);
const never = <T,>() => new Promise<T>(() => undefined);

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw fail(r.error.message);
  return r.data as T;
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw fail('Please log in again.');
  return data.user.id;
}

const clean = (q: string) => q.replace(/[,()%*]/g, ' ').trim();

function ago(iso?: string | null): string {
  if (!iso) return '';
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return m + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  return Math.floor(m / 1440) + 'd ago';
}

function startsIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Started';
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? d + 'd ' + h + 'h' : h + 'h ' + m + 'm';
}

function toUser(p: Row, ratings: Row[] = []): User {
  const chess = ratings.find((x) => x.game_type === 'chess');
  const sum = (k: string) => ratings.reduce((a, x) => a + (Number(x[k]) || 0), 0);
  return {
    id: p.id,
    name: p.display_name || p.username || 'Player',
    username: p.username || '',
    level: p.level ?? 1,
    bio: p.bio ?? '',
    country: p.country ?? '',
    rating: chess?.rating ?? 1200,
    followers: p.followers_count ?? 0,
    following: p.following_count ?? 0,
    games: p.games_count ?? sum('games'),
    wins: sum('wins'),
    losses: sum('losses'),
    draws: sum('draws'),
    badges: [],
    premium: !!p.is_premium,
    online: p.online_status === 'online',
    favoriteGame: p.favorite_game ?? undefined,
    skill: p.skill_level ?? undefined,
    gender: p.gender ?? undefined,
    profileComplete: !!p.onboarding_completed,
  };
}

async function loadMe(): Promise<User> {
  const id = await uid();
  let p: Row | null = ok(await supabase.from('profiles').select('*').eq('id', id).maybeSingle());
  if (!p) {
    const r = ok(await supabase.rpc('ensure_profile')) as Row | Row[];
    p = Array.isArray(r) ? r[0] : r;
  }
  const rt = ok(await supabase.from('user_ratings').select('*').eq('user_id', id)) as Row[] | null;
  return toUser(p as Row, rt ?? []);
}

async function profilesByIds(ids: string[]): Promise<User[]> {
  if (!ids.length) return [];
  const rows = ok(await supabase.from('profiles').select('*').in('id', ids)) as Row[] | null;
  return (rows ?? []).map((p) => toUser(p));
}

async function profileIdByUsername(u: string): Promise<string> {
  if (/^[0-9a-f-]{36}$/i.test(u)) return u;
  const p = ok(await supabase.from('profiles').select('id').eq('username', u).maybeSingle()) as Row | null;
  if (!p) throw fail('User not found.');
  return p.id;
}

async function tokens(): Promise<number> {
  const w = ok(await supabase.from('wallets').select('bonus_tokens,earned_tokens').eq('user_id', await uid()).maybeSingle()) as Row | null;
  return w ? Number(w.bonus_tokens) + Number(w.earned_tokens) : 0;
}

async function toggle(table: string, keyCol: string, key: string): Promise<boolean> {
  const me = await uid();
  const q = supabase.from(table).select(keyCol).eq(keyCol, key).eq('user_id', me);
  const has = ok(await q.maybeSingle());
  if (has) {
    const r = await supabase.from(table).delete().eq(keyCol, key).eq('user_id', me);
    if (r.error) throw fail(r.error.message);
    return false;
  }
  const r = await supabase.from(table).insert({ [keyCol]: key, user_id: me });
  if (r.error) throw fail(r.error.message);
  return true;
}

// ---- feed ----
const POST_SEL = 'id,kind,body,likes_count,comments_count,shares_count,created_at,author:author_id(*)';

async function mapPosts(rows: Row[]): Promise<Post[]> {
  const ids = rows.map((r) => r.id);
  let liked = new Set<string>(), saved = new Set<string>();
  if (ids.length) {
    const me = await uid();
    const [l, s] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', me).in('post_id', ids),
      supabase.from('post_saves').select('post_id').eq('user_id', me).in('post_id', ids),
    ]);
    liked = new Set((l.data ?? []).map((x: Row) => x.post_id));
    saved = new Set((s.data ?? []).map((x: Row) => x.post_id));
  }
  return rows.map((r) => ({
    id: r.id,
    author: toUser(r.author ?? {}),
    kind: r.kind === 'repost' ? 'text' : r.kind,
    text: r.body ?? '',
    likes: r.likes_count ?? 0,
    comments: r.comments_count ?? 0,
    shares: r.shares_count ?? 0,
    liked: liked.has(r.id),
    saved: saved.has(r.id),
    createdAt: ago(r.created_at),
  }));
}

// ---- tournaments ----
const ordinal = (n: number) => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]);
const T_STATUS: Record<string, Tournament['status']> = { in_progress: 'live', registration: 'upcoming', draft: 'upcoming', finished: 'completed', cancelled: 'completed' };

async function mapTournaments(rows: Row[]): Promise<Tournament[]> {
  const me = await uid();
  return rows.map((t) => {
    const parts: Row[] = t.tournament_participants ?? [];
    const pool = Number(t.prize_pool_tokens || 0) + Number(t.sponsor_pool_tokens || 0);
    return {
      id: t.id,
      name: t.name,
      game: t.game_type as GameType,
      prizePool: pool,
      entryFee: t.entry_fee_tokens ?? 0,
      players: parts.length,
      maxPlayers: t.max_players,
      startsIn: startsIn(t.starts_at),
      status: T_STATUS[t.status] ?? 'upcoming',
      description: t.description ?? '',
      rewards: ((t.prize_distribution ?? []) as Row[]).map((d) => ({ place: ordinal(d.place), tokens: Math.floor((pool * d.pct) / 100) })),
      joined: parts.some((p) => p.user_id === me),
    };
  });
}

const T_SEL = '*,tournament_participants(user_id)';

async function getTournament(id: string): Promise<Tournament | null> {
  const r = ok(await supabase.from('tournaments').select(T_SEL).eq('id', id).maybeSingle()) as Row | null;
  return r ? (await mapTournaments([r]))[0] : null;
}

// ---- wallet ----
const OUT = new Set(['withdrawal', 'tournament_entry', 'gift_sent', 'tip_sent', 'subscription', 'platform_fee']);
const TX_KIND: Record<string, Transaction['kind']> = {
  deposit: 'deposit', purchase_tokens: 'purchase', withdrawal: 'withdraw', tournament_entry: 'tournament', tournament_refund: 'tournament',
  tournament_prize: 'tournament', gift_sent: 'gift', gift_received: 'gift', tip_sent: 'gift', tip_received: 'gift',
};
function mapTx(r: Row): Transaction {
  const out = OUT.has(r.type);
  const label = String(r.type).replace(/_/g, ' ').replace(/^./, (c: string) => c.toUpperCase());
  return { id: r.id, label, amount: out ? -Math.abs(Number(r.amount)) : Math.abs(Number(r.amount)), time: ago(r.created_at), kind: TX_KIND[r.type] ?? (out ? 'sent' : 'received') };
}

const N_TYPE: Array<[RegExp, AppNotification['type']]> = [
  [/gift|tip/, 'gift'], [/comment|mention/, 'comment'], [/stream|live/, 'live'], [/tournament/, 'tournament'],
  [/follow|friend/, 'follow'], [/message|chat/, 'message'],
];

export const backendApi: ApiClient = {
  auth: {
    signUp: async ({ name, identifier, password }) => {
      if (!identifier.includes('@')) throw fail('Phone sign-up is not available yet. Please use an email address.');
      const { data, error } = await supabase.auth.signUp({ email: identifier, password, options: { data: { app: 'kingdom', full_name: name } } });
      if (error) throw error;
      if (!data.session) throw fail('Check your email to confirm your account, then log in.');
      return loadMe();
    },
    logIn: async ({ identifier, password }) => {
      if (!identifier.includes('@')) throw fail('Please log in with your email address.');
      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
      if (error) throw error;
      return loadMe();
    },
    social: async (provider) => {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/home' } });
      if (error) throw error;
      return never<User>();
    },
    completeProfile: async (i) => {
      ok(await supabase.rpc('complete_onboarding', {
        p_username: i.username, p_country: i.country.trim().toUpperCase().slice(0, 2), p_favorite_game: i.favoriteGame,
        p_skill_level: i.skill.toLowerCase(), p_referral_code: i.referralCode || null,
      }));
      const user = await loadMe();
      const p = ok(await supabase.from('profiles').select('referral_code').eq('id', user.id).maybeSingle()) as Row | null;
      const s = ok(await supabase.from('app_settings').select('value').eq('key', 'starter_tokens').maybeSingle()) as Row | null;
      return { user, referralCode: p?.referral_code ?? '', starterTokens: Number(s?.value ?? 100) };
    },
    logOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  },

  feed: {
    list: async () => mapPosts((ok(await supabase.from('posts').select(POST_SEL).order('created_at', { ascending: false }).limit(30)) as Row[]) ?? []),
    create: async ({ text, kind }) => {
      const row = ok(await supabase.from('posts').insert({ author_id: await uid(), kind, body: text }).select(POST_SEL).single()) as Row;
      return (await mapPosts([row]))[0];
    },
    like: async (id) => { await toggle('post_likes', 'post_id', id); },
    save: async (id) => { await toggle('post_saves', 'post_id', id); },
    comment: async (id, text) => {
      ok(await supabase.from('comments').insert({ post_id: id, body: text, author_id: await uid() }));
    },
    report: async (id, reason) => {
      ok(await supabase.from('reports').insert({ target_type: 'post', target_id: id, reason }));
    },
  },

  users: {
    get: async (username) => {
      const p = ok(await supabase.from('profiles').select('*').eq('username', username).maybeSingle()) as Row | null;
      if (!p) return null;
      const [rt, f] = await Promise.all([
        supabase.from('user_ratings').select('*').eq('user_id', p.id),
        supabase.from('follows').select('following_id').eq('follower_id', await uid()).eq('following_id', p.id).maybeSingle(),
      ]);
      return { ...toUser(p, (rt.data as Row[]) ?? []), isFollowing: !!f.data };
    },
    search: async (q, kind) => {
      const s = clean(q);
      if (kind === 'games') return [];
      if (kind === 'streamers') {
        const rows = ok(await supabase.from('streams').select('streamer:streamer_id(*)').eq('status', 'live').limit(30)) as Row[] | null;
        return (rows ?? []).map((r) => toUser(r.streamer ?? {})).filter((u) => !s || (u.username + u.name).toLowerCase().includes(s.toLowerCase()));
      }
      let query = supabase.from('profiles').select('*').limit(20);
      if (s) query = query.or('username.ilike.%' + s + '%,display_name.ilike.%' + s + '%');
      return ((ok(await query) as Row[]) ?? []).map((p) => toUser(p));
    },
    follow: async (username) => toggle('follows', 'following_id', await profileIdByUsername(username)).then(() => undefined).then(async () => {
      const me = await uid();
      const id = await profileIdByUsername(username);
      const f = await supabase.from('follows').select('following_id').eq('follower_id', me).eq('following_id', id).maybeSingle();
      return !!f.data;
    }),
    update: async (patch) => {
      const m: Row = {};
      if (patch.name !== undefined) m.display_name = patch.name;
      if (patch.bio !== undefined) m.bio = patch.bio;
      if (patch.country !== undefined) m.country = patch.country.toUpperCase().slice(0, 2);
      if (patch.gender !== undefined) m.gender = patch.gender;
      if (patch.favoriteGame !== undefined) m.favorite_game = patch.favoriteGame;
      if (Object.keys(m).length) ok(await supabase.from('profiles').update(m).eq('id', await uid()));
      return loadMe();
    },
    friends: async () => {
      const me = await uid();
      const rows = ok(await supabase.from('friendships').select('requester_id,addressee_id').eq('status', 'accepted').or('requester_id.eq.' + me + ',addressee_id.eq.' + me)) as Row[] | null;
      return profilesByIds((rows ?? []).map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id)));
    },
    requests: async () => {
      const rows = ok(await supabase.from('friendships').select('requester_id').eq('status', 'pending').eq('addressee_id', await uid())) as Row[] | null;
      return profilesByIds((rows ?? []).map((r) => r.requester_id));
    },
  },

  matches: {
    live: async () => {
      const rows = ok(await supabase.from('games').select('id,game_type,mode,white:white_id(*),black:black_id(*)').eq('status', 'active').neq('mode', 'ai').order('started_at', { ascending: false }).limit(20)) as Row[] | null;
      return (rows ?? []).filter((g) => g.white && g.black).map((g) => ({ id: g.id, game: g.game_type as GameType, title: g.game_type === 'chess' ? 'Chess' : 'Checkers', white: toUser(g.white), black: toUser(g.black), viewers: 0, live: true }));
    },
    get: async (id) => {
      const g = ok(await supabase.from('games').select('id,game_type,status,white:white_id(*),black:black_id(*)').eq('id', id).maybeSingle()) as Row | null;
      if (!g || !g.white || !g.black) return null;
      return { id: g.id, game: g.game_type as GameType, title: g.game_type === 'chess' ? 'Chess' : 'Checkers', white: toUser(g.white), black: toUser(g.black), viewers: 0, live: g.status === 'active' };
    },
  },

  tournaments: {
    list: async (status) => {
      const rows = ok(await supabase.from('tournaments').select(T_SEL).order('starts_at', { ascending: true }).limit(50)) as Row[] | null;
      const all = await mapTournaments(rows ?? []);
      return status ? all.filter((t) => t.status === status) : all;
    },
    get: getTournament,
    join: async (id) => {
      ok(await supabase.rpc('register_for_tournament', { p_t: id }));
      const t = await getTournament(id);
      if (!t) throw fail('Tournament not found.');
      return t;
    },
    create: async ({ name, game, prizePool, entryFee, maxPlayers }) => {
      const id = ok(await supabase.rpc('create_tournament', {
        p_name: name, p_game: game, p_starts_at: new Date(Date.now() + 3600000).toISOString(), p_entry_fee: entryFee,
        p_max_players: maxPlayers, p_min_players: Math.min(4, maxPlayers), p_seed_funding: prizePool,
      })) as string;
      const t = await getTournament(id);
      if (!t) throw fail('Tournament created but could not be loaded.');
      return t;
    },
  },

  leaderboard: {
    get: async (period) => {
      const rows = ok(await supabase.rpc('get_leaderboard', { p_game: 'chess', p_period: period === 'global' ? 'rating' : period, p_limit: 50 })) as Row[] | null;
      return (rows ?? []).map((r) => ({ rank: Number(r.rank), user: toUser({ id: r.user_id, username: r.username, display_name: r.display_name, country: r.country }), score: Number(r.score) }));
    },
  },

  wallet: {
    get: async () => {
      const t = await tokens();
      const tx = ok(await supabase.from('wallet_transactions').select('*').eq('user_id', await uid()).order('created_at', { ascending: false }).limit(30)) as Row[] | null;
      return { tokens: t, usd: t * 0.01, transactions: (tx ?? []).map(mapTx) };
    },
    packages: async () => {
      const rows = ok(await supabase.from('token_packages').select('*').eq('is_active', true).order('sort_order')) as Row[] | null;
      return (rows ?? []).map((p) => ({ id: String(p.id), tokens: p.tokens + (p.bonus_tokens ?? 0), price: p.price_cents / 100, popular: !!p.is_popular }));
    },
    buy: async (packageId) => {
      const r = await callFunction<{ authorization_url?: string; error?: string }>('create-deposit', { package_id: Number(packageId), callback_url: window.location.origin + '/wallet' });
      if (!r?.authorization_url) throw fail(r?.error ?? 'Could not start payment.');
      window.location.href = r.authorization_url;
      return never<number>();
    },
    deposit: async () => { throw fail('Tokens are added by buying a token package in the Store.'); },
    withdraw: async (amount) => {
      const me = await uid();
      const acc = ok(await supabase.from('withdrawal_accounts').select('id').eq('user_id', me).order('is_default', { ascending: false }).limit(1).maybeSingle()) as Row | null;
      if (!acc) throw fail('Add a payout account first.');
      ok(await supabase.rpc('request_withdrawal', { p_tokens: amount, p_account: acc.id }));
      return tokens();
    },
  },

  gifts: {
    list: async () => {
      const rows = ok(await supabase.from('gifts').select('*').eq('is_active', true).order('sort_order')) as Row[] | null;
      return (rows ?? []).map((g) => ({ id: String(g.id), name: g.name, emoji: g.icon ?? '🎁', cost: g.price_tokens }));
    },
    send: async ({ to, giftId, qty }) => {
      ok(await supabase.rpc('send_gift', { p_recipient: await profileIdByUsername(to), p_gift: Number(giftId), p_qty: qty }));
      return tokens();
    },
  },

  notifications: {
    list: async () => {
      const rows = ok(await supabase.from('notifications').select('*').eq('user_id', await uid()).order('created_at', { ascending: false }).limit(50)) as Row[] | null;
      return (rows ?? []).map((n) => ({
        id: n.id,
        type: (N_TYPE.find(([re]) => re.test(String(n.type)))?.[1] ?? 'reward') as AppNotification['type'],
        text: n.title ?? n.body ?? '',
        sub: n.title ? n.body ?? undefined : undefined,
        time: ago(n.created_at),
        read: !!n.read_at,
      }));
    },
    markAllRead: async () => {
      ok(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', await uid()).is('read_at', null));
    },
  },

  chat: {
    list: async () => {
      const me = await uid();
      const mine = ok(await supabase.from('conversation_members').select('conversation_id,last_read_at,conversations(id,kind,title,last_message_at,last_message_preview)').eq('user_id', me)) as Row[] | null;
      const ids = (mine ?? []).map((m) => m.conversation_id);
      const others = ids.length ? ((ok(await supabase.from('conversation_members').select('conversation_id,profiles:user_id(display_name,username,online_status)').in('conversation_id', ids).neq('user_id', me)) as Row[] | null) ?? []) : [];
      return (mine ?? []).map((m) => {
        const c: Row = m.conversations ?? {};
        const other = others.find((o) => o.conversation_id === m.conversation_id)?.profiles as Row | undefined;
        return {
          id: m.conversation_id,
          name: c.title || other?.display_name || other?.username || 'Chat',
          last: c.last_message_preview ?? '',
          time: ago(c.last_message_at),
          unread: c.last_message_at && new Date(c.last_message_at) > new Date(m.last_read_at) ? 1 : 0,
          group: c.kind !== 'direct',
          online: other?.online_status === 'online',
        };
      }).sort((a, b) => 0 * a.name.length - 0 * b.name.length);
    },
    messages: async (id) => {
      const me = await uid();
      const rows = ok(await supabase.from('messages').select('*').eq('conversation_id', id).is('deleted_at', null).order('created_at', { ascending: true }).limit(200)) as Row[] | null;
      await supabase.rpc('mark_conversation_read', { p_conv: id });
      return (rows ?? []).map((m): Message => ({ id: m.id, from: m.sender_id === me ? 'me' : 'them', text: m.body ?? '', time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    },
    send: async (id, text) => {
      const m = ok(await supabase.from('messages').insert({ conversation_id: id, body: text, kind: 'text' }).select('*').single()) as Row;
      return { id: m.id, from: 'me', text: m.body ?? text, time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    },
  },

  communities: {
    list: async () => {
      const rows = ok(await supabase.from('clubs').select('id,name,description,members_count,visibility').limit(40)) as Row[] | null;
      const mine = ok(await supabase.from('club_members').select('club_id').eq('user_id', await uid())) as Row[] | null;
      const set = new Set((mine ?? []).map((m) => m.club_id));
      return (rows ?? []).map((c): Community => ({ id: c.id, name: c.name, members: c.members_count ?? 0, preview: c.description ?? '', joined: set.has(c.id), scope: c.visibility === 'public' ? 'global' : 'groups' }));
    },
    join: async (id) => {
      const res = ok(await supabase.rpc('join_club', { p_club: id })) as string | null;
      const c = ok(await supabase.from('clubs').select('id,name,description,members_count,visibility').eq('id', id).single()) as Row;
      return { id: c.id, name: c.name, members: c.members_count ?? 0, preview: c.description ?? '', joined: !/request|pending/i.test(String(res ?? '')), scope: c.visibility === 'public' ? 'global' : 'groups' };
    },
  },

  // Results, Elo, XP and leaderboard points are written server-side by submit-move / resign / draw RPCs.
  // There is no token reward for results, so this only refreshes the balance.
  games: { report: async () => ({ tokens: await tokens() }) },

  referral: {
    get: async () => {
      const me = await uid();
      const p = ok(await supabase.from('profiles').select('referral_code').eq('id', me).maybeSingle()) as Row | null;
      const r = ok(await supabase.from('referrals').select('referrer_reward').eq('referrer_id', me)) as Row[] | null;
      return { code: p?.referral_code ?? '', invited: (r ?? []).length, earned: (r ?? []).reduce((a, x) => a + Number(x.referrer_reward || 0), 0) };
    },
  },
};
