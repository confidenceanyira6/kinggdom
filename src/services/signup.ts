import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { api } from './api';

/**
 * Creates a real account and signs the person straight in, so every new account is approved
 * automatically (no waiting for an admin and no extra steps).
 *
 * If the backend still has "Confirm email" switched on, Supabase returns no session after sign-up and
 * the sign-in below is refused; in that case we say so clearly instead of failing silently.
 */
export async function signUpApproved(i: { name: string; email: string; password: string }): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: i.email,
    password: i.password,
    options: { data: { app: 'kingdom', full_name: i.name } },
  });
  if (error) throw new Error(error.message);

  if (!data.session) {
    const si = await supabase.auth.signInWithPassword({ email: i.email, password: i.password });
    if (si.error) {
      const m = si.error.message.toLowerCase();
      if (m.includes('confirm')) throw new Error('Account created. Please confirm your email, then log in.');
      throw new Error('An account with this email may already exist. Try logging in instead.');
    }
  }
  // Loads the profile (and creates it on first sign-in).
  return api.users.update({});
}
