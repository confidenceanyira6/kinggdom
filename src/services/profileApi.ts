import type { Post, User } from '../types';
import { supabase } from '../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface MiniUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface GameLine {
  id: string;
  title: string;
  sub: string;
  r: 'W' | 'L' | 'D';
}

/**
 * Everything the profile screens need beyond the shared ApiClient:
 * own-post edit/delete, a user's posts and games, avatar upload, username / password / email
 * changes, password reset, follower lists and reporting a user. All of it is real data.
 */
export interface ProfileApi {
  postsBy(user: User): Promise<Post[]>;
  recentGames(userId: string): Promise<GameLine[]>;
  updatePost(id: string, text: string): Promise<void>;
  deletePost(id: string): Promise<void>;
  avatarOf(userId: string): Promise<string | null>;
  uploadAvatar(file: File): Promise<string>;
  updateUsername(username: string): Promise<void>;
  changePassword(password: string): Promise<void>;
  changeEmail(email: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  connections(userId: string, kind: 'followers' | 'following'): Promise<MiniUser[]>;
  reportUser(userId: string, reason: string): Promise<void>;
}

const fail = (m: string) => new Error(m);
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const USERNAME_MSG = 'Username must be 3-20 letters, numbers or underscores.';

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw fail(r.error.message);
  return r.data as T;
}

function ago(iso?: string | null): string {
  if (!iso) return '';
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return m + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  return Math.floor(m / 1440) + 'd ago';
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw fail('Please log in again.');
  return data.user.id;
}

const toMini = (p: Row): MiniUser => ({
  id: p.id,
  name: p.display_name || p.username || 'Player',
  username: p.username || '',
  avatarUrl: p.avatar_url || undefined,
});

const POST_COLS = 'id,kind,body,likes_count,comments_count,shares_count,created_at';

export const profileApi: ProfileApi = {
  async postsBy(user) {
    const rows = (ok(await supabase.from('posts').select(POST_COLS).eq('author_id', user.id).order('created_at', { ascending: false }).limit(60)) as Row[] | null) ?? [];
    const ids = rows.map((r) => r.id);
    let liked = new Set<string>();
    let saved = new Set<string>();
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
      author: user,
      kind: (r.kind === 'repost' ? 'text' : r.kind) as Post['kind'],
      text: r.body ?? '',
      likes: r.likes_count ?? 0,
      comments: r.comments_count ?? 0,
      shares: r.shares_count ?? 0,
      liked: liked.has(r.id),
      saved: saved.has(r.id),
      createdAt: ago(r.created_at),
    }));
  },

  async recentGames(userId) {
    const rows = (ok(await supabase.from('games').select('*').eq('status', 'finished').or('white_id.eq.' + userId + ',black_id.eq.' + userId).order('created_at', { ascending: false }).limit(20)) as Row[] | null) ?? [];
    const oppOf = (r: Row) => (r.white_id === userId ? r.black_id : r.white_id) as string | null;
    const oppIds = Array.from(new Set(rows.map(oppOf).filter(Boolean))) as string[];
    const names = new Map<string, string>();
    if (oppIds.length) {
      const ps = (ok(await supabase.from('profiles').select('id,username,display_name').in('id', oppIds)) as Row[] | null) ?? [];
      ps.forEach((p) => names.set(p.id, p.display_name || p.username || 'Player'));
    }
    return rows.map((r): GameLine => {
      const opp = names.get(oppOf(r) ?? '') ?? 'Opponent';
      const draw = r.result === 'draw';
      const won = !draw && r.winner_id === userId;
      const kind = r.game_type === 'checkers' ? 'Checkers' : 'Chess';
      return { id: r.id, title: (draw ? 'Draw vs ' : won ? 'Won vs ' : 'Lost vs ') + opp, sub: kind + (r.mode ? ' · ' + String(r.mode) : ''), r: draw ? 'D' : won ? 'W' : 'L' };
    });
  },

  async updatePost(id, text) {
    const r = await supabase.from('posts').update({ body: text }).eq('id', id).eq('author_id', await uid()).select('id');
    if (r.error) throw fail(r.error.message);
    if (!r.data || r.data.length === 0) throw fail('You can only edit your own posts.');
  },

  async deletePost(id) {
    const r = await supabase.from('posts').delete().eq('id', id).eq('author_id', await uid()).select('id');
    if (r.error) throw fail(r.error.message);
    if (!r.data || r.data.length === 0) throw fail('You can only delete your own posts.');
  },

  async avatarOf(userId) {
    const r = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
    if (r.error) return null; // column not present yet
    return (r.data as Row | null)?.avatar_url ?? null;
  },

  async uploadAvatar(file) {
    if (!file.type.startsWith('image/')) throw fail('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) throw fail('Image must be smaller than 5 MB.');
    const me = await uid();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = me + '/avatar-' + Date.now() + '.' + ext;
    const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) throw fail('Photo upload is not set up on the backend yet (' + up.error.message + ').');
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const r = await supabase.from('profiles').update({ avatar_url: url }).eq('id', me);
    if (r.error) throw fail('Could not save the photo: ' + r.error.message);
    return url;
  },

  async updateUsername(username) {
    const v = username.trim();
    if (!USERNAME_RE.test(v)) throw fail(USERNAME_MSG);
    const r = await supabase.from('profiles').update({ username: v }).eq('id', await uid());
    if (r.error) throw fail(r.error.code === '23505' ? 'That username is already taken.' : r.error.message);
  },

  async changePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw fail(error.message);
  },

  async changeEmail(email) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw fail(error.message);
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/home' });
    if (error) throw fail(error.message);
  },

  async connections(userId, kind) {
    const mine = kind === 'followers' ? 'following_id' : 'follower_id';
    const other = kind === 'followers' ? 'follower_id' : 'following_id';
    const rows = (ok(await supabase.from('follows').select(other).eq(mine, userId).limit(100)) as Row[] | null) ?? [];
    const ids = rows.map((r) => r[other] as string);
    if (!ids.length) return [];
    const ps = (ok(await supabase.from('profiles').select('*').in('id', ids)) as Row[] | null) ?? [];
    return ps.map(toMini);
  },

  async reportUser(userId, reason) {
    ok(await supabase.from('reports').insert({ target_type: 'user', target_id: userId, reason }));
  },
};
