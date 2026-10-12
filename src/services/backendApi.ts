import type { ApiClient } from './client';

/**
 * Real backend adapter (Supabase). Intentionally NOT connected yet.
 *
 * When the backend is ready, implement each method of ApiClient here
 * (see ./client.ts for the contract) using the public URL + anon key from
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, then set VITE_USE_MOCK=false.
 * Never ship a service-role key to the browser.
 */
const notConnected = (path: string) => () => Promise.reject(new Error('Backend not connected yet: ' + path));

export const backendApi: ApiClient = new Proxy({} as ApiClient, {
  get: (_t, ns: string) =>
    new Proxy({}, {
      get: (_t2, method: string) => notConnected(ns + '.' + method),
    }),
});
