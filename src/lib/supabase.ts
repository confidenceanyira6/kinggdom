import { createClient } from '@supabase/supabase-js';

/**
 * Kingdom backend = Supabase project "quantumretailmanager" (ref fpflwkgqdmgmrvsukyop).
 * Kingdom data lives in the custom schema "kingdom" (NOT public).
 * Only the publishable/anon key is used here. Never put service_role keys,
 * DB passwords or payment secrets in the frontend.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-anon-key', {
  db: { schema: 'kingdom' },
});

/**
 * Edge functions the app may call (all need a signed-in user).
 * `send-push` and `payment-webhook` are SERVER ONLY, and the retail manager
 * functions in the same project belong to another app, so none are callable here.
 */
const ALLOWED_FUNCTIONS = ['submit-move', 'stream-token', 'create-deposit', 'ai-coach'] as const;
export type KingdomFunction = (typeof ALLOWED_FUNCTIONS)[number];

export async function callFunction<T = unknown>(name: KingdomFunction, body?: Record<string, unknown>): Promise<T> {
  if (!ALLOWED_FUNCTIONS.includes(name)) throw new Error('Function not allowed from the frontend: ' + name);
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}
