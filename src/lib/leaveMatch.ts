import type { NavigateFunction } from 'react-router-dom';

/** Shown before a player gives up a match. */
export const FORFEIT_MSG = 'If you forfeit, you will lose this match. Do you want to continue?';

/**
 * After a forfeit, send the player back to the page they were on before the
 * match started. If the match was opened directly (no earlier page in this
 * tab), go to the main page instead.
 */
export function leaveMatch(nav: NavigateFunction, fallback = '/home') {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) nav(-1);
  else nav(fallback, { replace: true });
}
