import { supabase } from '../lib/supabase';
import type { Post, Tournament } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const MAX_POST_IMAGES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const BUCKET = 'post-media';

export function checkImage(f: File): string | null {
  if (!f.type.startsWith('image/')) return 'Please choose an image file.';
  if (f.size > MAX_IMAGE_BYTES) return 'Each image must be smaller than 8 MB.';
  return null;
}

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/**
 * Uploads the images to the public `post-media` bucket (folder = the user's id, as the storage policy requires)
 * and records them in `post_media`. If anything fails the uploaded files are removed again.
 */
export async function uploadPostImages(postId: string, files: File[]): Promise<string[]> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Please log in again.');
  const me = data.user.id;
  const paths: string[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const bad = checkImage(f);
      if (bad) throw new Error(bad);
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = me + '/' + postId + '-' + i + '.' + ext;
      const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) throw new Error('Image upload failed: ' + up.error.message);
      paths.push(path);
    }
    const rows = paths.map((path, position) => ({ post_id: postId, media_type: 'image', path, position }));
    const r = await supabase.from('post_media').insert(rows);
    if (r.error) throw new Error('Could not save the images: ' + r.error.message);
  } catch (e) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    throw e;
  }
  return paths.map(publicUrl);
}

/** Adds image URLs and the authors' profile pictures to posts. Never breaks the feed if a lookup fails. */
export async function attachMedia(posts: Post[]): Promise<Post[]> {
  if (!posts.length) return posts;
  const ids = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.author.id).filter(Boolean)));
  const [media, people] = await Promise.all([
    supabase.from('post_media').select('post_id,path,position').eq('media_type', 'image').in('post_id', ids).order('position', { ascending: true }),
    supabase.from('profiles').select('id,avatar_url').in('id', authorIds),
  ]);
  const imgs = new Map<string, string[]>();
  ((media.data ?? []) as Row[]).forEach((m) => {
    const list = imgs.get(m.post_id) ?? [];
    list.push(publicUrl(m.path));
    imgs.set(m.post_id, list);
  });
  const avatars = new Map<string, string>();
  ((people.data ?? []) as Row[]).forEach((a) => { if (a.avatar_url) avatars.set(a.id, a.avatar_url); });
  return posts.map((p) => ({
    ...p,
    images: imgs.get(p.id) ?? p.images,
    author: avatars.has(p.author.id) ? { ...p.author, avatarUrl: avatars.get(p.author.id) } : p.author,
  }));
}

/** Adds the competition scope (daily / weekly / monthly / special) to tournaments. */
export async function attachScope(ts: Tournament[]): Promise<Tournament[]> {
  if (!ts.length) return ts;
  const r = await supabase.from('tournaments').select('id,scope').in('id', ts.map((t) => t.id));
  if (r.error || !r.data) return ts;
  const scopes = new Map<string, Tournament['scope']>((r.data as Row[]).map((x) => [x.id as string, x.scope as Tournament['scope']]));
  return ts.map((t) => ({ ...t, scope: scopes.get(t.id) }));
}
