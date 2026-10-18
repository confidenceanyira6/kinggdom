import { useEffect, useState } from 'react';

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'Now';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + pad(m) + 'm';
  return pad(m) + ':' + pad(s);
}

export function Countdown({ to }: { to: number | null }) {
  const now = useNow();
  if (to === null) return <span className='cd'>TBD</span>;
  return <span className='cd'>{fmtCountdown(to - now)}</span>;
}

export const fmtTime = (ts: number) => new Date(ts).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
