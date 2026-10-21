import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { useApp } from '../store/useApp';

const AUTH_PATHS = ['/', '/login', '/signup', '/onboarding'];

/**
 * Keeps the app in step with the Supabase session.
 * Covers Google/Apple redirects (session arrives with no stored user), password-reset links
 * and sessions that end elsewhere (token expiry, sign-out in another tab).
 */
export function useSessionSync() {
  const nav = useNavigate();
  const path = useRef('');
  path.current = useLocation().pathname;

  useEffect(() => {
    let busy = false;
    const hydrate = async () => {
      if (busy) return;
      busy = true;
      try {
        const user = await api.users.update({}); // empty patch just loads (and creates if missing) my profile
        const s = useApp.getState();
        s.setUser(user);
        try { s.setTokens((await api.wallet.get()).tokens); } catch { /* balance refreshes later */ }
        if (AUTH_PATHS.includes(path.current)) nav(user.profileComplete ? '/home' : '/setup', { replace: true });
      } catch { /* stay logged out */ } finally { busy = false; }
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { useApp.getState().signOut(); return; }
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && !useApp.getState().user) setTimeout(hydrate, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);
}
