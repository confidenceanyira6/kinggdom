import { useEffect, useState } from 'react';
import { hostApi } from '../services/hostApi';

/** The platform fee percentage (null until loaded). */
export function useFeePct(): number | null {
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    hostApi.feePct().then((v) => { if (alive) setPct(v); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return pct;
}
