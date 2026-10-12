import type { ApiClient } from './client';
import * as seed from '../data/mock';
import type { Message, Transaction, User } from '../types';

const wait = (ms = 220) => new Promise<void>((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

const db = {
  me: null as User | null,
  tokens: 2350,
  users: seed.users.map((u) => ({ ...u })),
  posts: seed.posts.map((p) => ({ ...p })),
  tournaments: seed.tournaments.map((t) => ({ ...t })),
  txs: [...seed.transactions],
  notifs: seed.notifications.map((n) => ({ ...n })),
  chats: seed.chats.map((c) => ({ ...c })),
  msgs: {} as Record<string, Message[]>,
  communities: seed.communities.map((c) => ({ ...c })),
  referral: { code: 'KING2026', invited: 0, earned: 0 },
};

const me = (): User => db.me ?? db.users[db.users.length - 1];
const tx = (label: string, amount: number, kind: Transaction['kind']) => {
  db.txs.unshift({ id: 'tx' + uid(), label, amount, kind, time: 'just now' });
};
const makeUser = (name: string, identifier: string): User => {
  const base = (name || identifier.split('@')[0] || 'Player').split(' ').join('');
  return {
    id: 'me', name: name || base, username: base, level: 1, bio: '', country: '', rating: 800,
    followers: 0, following: 0, games: 0, wins: 0, losses: 0, draws: 0, badges: [], online: true, profileComplete: false,
  };
};

export const mockApi: ApiClient = {
  auth: {
    async signUp(i) { await wait(); db.me = makeUser(i.name, i.identifier); return db.me; },
    async logIn(i) { await wait(); db.me = { ...makeUser('', i.identifier), profileComplete: true }; return db.me; },
    async social(p) { await wait(); db.me = { ...makeUser(p + 'User', p), profileComplete: false }; return db.me; },
    async completeProfile(i) {
      await wait();
      db.me = { ...me(), username: i.username, country: i.country, favoriteGame: i.favoriteGame, skill: i.skill, profileComplete: true };
      db.referral.code = i.username.slice(0, 4).toUpperCase() + '2026';
      db.tokens = 500 + (i.referralCode ? 100 : 0);
      tx('Starter coins', db.tokens, 'received');
      return { user: db.me, referralCode: db.referral.code, starterTokens: db.tokens };
    },
    async logOut() { await wait(100); db.me = null; },
  },
  feed: {
    async list() { await wait(); return db.posts.map((p) => ({ ...p })); },
    async create(i) {
      await wait();
      const p = { id: 'p' + uid(), author: me(), kind: i.kind, text: i.text, likes: 0, comments: 0, shares: 0, liked: false, saved: false, createdAt: 'just now' };
      db.posts.unshift(p);
      return p;
    },
    async like(id) { const p = db.posts.find((x) => x.id === id); if (p) { p.liked = !p.liked; p.likes += p.liked ? 1 : -1; } },
    async save(id) { const p = db.posts.find((x) => x.id === id); if (p) p.saved = !p.saved; },
    async comment(id) { const p = db.posts.find((x) => x.id === id); if (p) p.comments += 1; },
    async report() { await wait(150); },
  },
  users: {
    async get(username) {
      await wait(150);
      const m = me();
      if (m.username.toLowerCase() === username.toLowerCase()) return m;
      return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
    },
    async search(q, kind) {
      await wait(150);
      const s = q.trim().toLowerCase();
      let list = db.users.filter((u) => u.username.toLowerCase().includes(s));
      if (kind === 'streamers') list = list.filter((u) => u.online || u.premium);
      if (kind === 'games') list = db.users.filter((u) => (u.favoriteGame ?? '').includes(s));
      return list;
    },
    async follow(username) {
      const u = db.users.find((x) => x.username === username);
      if (!u) return false;
      u.isFollowing = !u.isFollowing;
      u.followers += u.isFollowing ? 1 : -1;
      return u.isFollowing;
    },
    async update(patch) { await wait(); db.me = { ...me(), ...patch }; return db.me; },
    async friends() { await wait(); return db.users.filter((u) => u.id !== 'anyira_001' && u.isFollowing || ['queenbee', 'ladytactics', 'silentmove', 'chesspro'].includes(u.id)); },
    async requests() { await wait(); return db.users.filter((u) => ['rookboss'].includes(u.id)); },
  },
  matches: {
    async live() { await wait(); return seed.matches; },
    async get(id) { await wait(150); return seed.matches.find((m) => m.id === id) ?? seed.matches[0]; },
  },
  tournaments: {
    async list(status) { await wait(); return db.tournaments.filter((t) => !status || t.status === status).map((t) => ({ ...t })); },
    async get(id) { await wait(150); const t = db.tournaments.find((x) => x.id === id); return t ? { ...t } : null; },
    async join(id) {
      await wait();
      const t = db.tournaments.find((x) => x.id === id);
      if (!t) throw new Error('Tournament not found');
      if (t.joined) return { ...t };
      if (db.tokens < t.entryFee) throw new Error('Not enough tokens');
      db.tokens -= t.entryFee;
      if (t.entryFee) tx('Entry: ' + t.name, -t.entryFee, 'tournament');
      t.joined = true; t.players += 1;
      return { ...t };
    },
    async create(i) {
      await wait();
      const t = { id: 't' + uid(), name: i.name, game: i.game, prizePool: i.prizePool, entryFee: i.entryFee, players: 1, maxPlayers: i.maxPlayers, startsIn: '24h', status: 'upcoming' as const, description: 'Community tournament.', rewards: [{ place: '1st', tokens: Math.round(i.prizePool * 0.6) }, { place: '2nd', tokens: Math.round(i.prizePool * 0.3) }, { place: '3rd', tokens: Math.round(i.prizePool * 0.1) }], joined: true };
      db.tournaments.unshift(t);
      return t;
    },
  },
  leaderboard: {
    async get(period) {
      await wait();
      const shift = period === 'global' ? 1 : period === 'weekly' ? 0.82 : 0.9;
      const base = [12450, 10230, 8760, 7420, 6310, 5100, 3200];
      return db.users.slice(0, 7).map((user, i) => ({ rank: i + 1, user, score: Math.round(base[i] * shift) }));
    },
  },
  wallet: {
    async get() { await wait(); return { tokens: db.tokens, usd: +(db.tokens * 0.01).toFixed(2), transactions: [...db.txs] }; },
    async packages() { return seed.packages; },
    async buy(id, method) {
      await wait(500);
      const p = seed.packages.find((x) => x.id === id);
      if (!p) throw new Error('Package not found');
      db.tokens += p.tokens;
      tx('Purchased ' + p.tokens + ' tokens (' + method + ')', p.tokens, 'purchase');
      return db.tokens;
    },
    async deposit(amount) { await wait(400); db.tokens += amount; tx('Deposit', amount, 'deposit'); return db.tokens; },
    async withdraw(amount) {
      await wait(400);
      if (amount > db.tokens) throw new Error('Insufficient balance');
      db.tokens -= amount; tx('Withdrawal', -amount, 'withdraw'); return db.tokens;
    },
  },
  gifts: {
    async list() { return seed.gifts; },
    async send(i) {
      await wait();
      const g = seed.gifts.find((x) => x.id === i.giftId);
      if (!g) throw new Error('Gift not found');
      const total = g.cost * i.qty;
      if (db.tokens < total) throw new Error('Not enough tokens');
      db.tokens -= total; tx('Gift to ' + i.to, -total, 'gift');
      return db.tokens;
    },
  },
  notifications: {
    async list() { await wait(); return db.notifs.map((n) => ({ ...n })); },
    async markAllRead() { db.notifs.forEach((n) => { n.read = true; }); },
  },
  chat: {
    async list() { await wait(); return db.chats.map((c) => ({ ...c })); },
    async messages(id) {
      await wait(150);
      if (!db.msgs[id]) db.msgs[id] = [
        { id: 'a', from: 'them', text: 'Hey! Ready for a game?', time: '10:02' },
        { id: 'b', from: 'me', text: 'Always. Chess or checkers?', time: '10:03' },
        { id: 'c', from: 'them', text: 'Chess. Challenge me in the lobby!', time: '10:03' },
      ];
      return [...db.msgs[id]];
    },
    async send(id, text) {
      const m: Message = { id: uid(), from: 'me', text, time: new Date().toTimeString().slice(0, 5) };
      (db.msgs[id] ||= []).push(m);
      return m;
    },
  },
  communities: {
    async list() { await wait(); return db.communities.map((c) => ({ ...c })); },
    async join(id) {
      const c = db.communities.find((x) => x.id === id)!;
      c.joined = !c.joined; c.members += c.joined ? 1 : -1;
      return { ...c };
    },
  },
  games: {
    async report(i) {
      await wait(150);
      const reward = i.result === 'win' ? 25 : i.result === 'draw' ? 5 : 0;
      db.tokens += reward;
      if (reward) tx('Game reward (' + i.game + ')', reward, 'tournament');
      const m = me();
      db.me = { ...m, games: m.games + 1, wins: m.wins + (i.result === 'win' ? 1 : 0), losses: m.losses + (i.result === 'loss' ? 1 : 0), draws: m.draws + (i.result === 'draw' ? 1 : 0) };
      return { tokens: db.tokens };
    },
  },
  referral: { async get() { return { ...db.referral }; } },
};
