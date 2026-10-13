import type { ApiClient } from './client';
import { supabase } from '../lib/supabase';

/**
 * Real backend adapter (Supabase project "quantumretailmanager", schema "kingdom").
 *
 * Methods are wired here one group at a time against the real table columns.
 * Anything not implemented yet rejects with a clear error instead of guessing
 * table/column names. Money, game moves and payments must go through edge
 * functions (see ../lib/supabase.ts callFunction), never direct table writes.
 */
const notConnected = (path: string) => () => Promise.reject(new Error('Backend not connected yet: ' + path));

const implemented: Record<string, Record<string, unknown>> = {
  auth: {
    logOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  },
};

export const backendApi: ApiClient = new Proxy({} as ApiClient, {
  get: (_t, ns: string) =>
    new Proxy({}, {
      get: (_t2, method: string) => implemented[ns]?.[method] ?? notConnected(ns + '.' + method),
    }),
});
