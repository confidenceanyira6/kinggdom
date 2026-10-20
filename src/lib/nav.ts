import type { NavigateFunction } from 'react-router-dom';

/** Go back to the page the player was on before the game; fall back to a safe page if there is no history. */
export function goBack(nav: NavigateFunction, fallback = '/home') {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === 'number' && idx > 0) nav(-1);
  else nav(fallback, { replace: true });
}
