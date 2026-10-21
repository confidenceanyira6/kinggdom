import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { useApp } from '../store/useApp';

const AUTH_PATHS = ['/', '/login', '/signup', '/onboarding'];

/**
 * Keeps the app in step with the real Supabase session.
 * - No real session on start (for example a leftover login saved by the old sample-data version):
 *   the saved user is cleared and the person is sent to the login page.
 * - Covers Google/Apple redirects, password-reset links and sessions that end elsewhere.
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
      const s = useApp.getState();
      if (event === 'SIGNED_OUT') {
        s.signOut();
        if (!AUTH_PATHS.includes(path.current)) nav('/login', { replace: true });
        return;
      }
      if (event === 'INITIAL_SESSION') {
        if (!session) {
          if (s.user) s.signOut();
          if (!AUTH_PATHS.includes(path.current)) nav('/login', { replace: true });
          return;
        }
        if (s.user && s.user.id !== session.user.id) s.signOut();
      }
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && !useApp.getState().user) setTimeout(hydrate, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);
}
