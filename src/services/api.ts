import type { ApiClient } from './client';
import { backendApi } from './backendApi';
import { profileApi } from './profileApi';
import { attachMedia, attachScope, uploadPostImages } from './mediaApi';

/**
 * Single entry point used by every screen. The app always talks to the real Supabase backend (no sample data).
 * Image posts and competition scope are layered on top of the base backend adapter.
 */
export const api: ApiClient = {
  ...backendApi,
  feed: {
    ...backendApi.feed,
    list: async () => attachMedia(await backendApi.feed.list()),
    create: async ({ text, kind, images }) => {
      const hasImages = !!images && images.length > 0;
      const post = await backendApi.feed.create({ text, kind: hasImages ? 'image' : kind });
      if (!hasImages) return post;
      try {
        await uploadPostImages(post.id, images);
      } catch (e) {
        await profileApi.deletePost(post.id).catch(() => undefined);
        throw e;
      }
      return (await attachMedia([post]))[0];
    },
  },
  tournaments: {
    ...backendApi.tournaments,
    list: async (status) => attachScope(await backendApi.tournaments.list(status)),
    get: async (id) => {
      const t = await backendApi.tournaments.get(id);
      return t ? (await attachScope([t]))[0] : null;
    },
    join: async (id) => (await attachScope([await backendApi.tournaments.join(id)]))[0],
  },
};
