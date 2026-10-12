import { useState } from 'react';

export function useLocalSetting<T>(key: string, init: T): [T, (v: T) => void] {
  const k = 'kg-' + key;
  const [v, setV] = useState<T>(() => {
    try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : init; } catch { return init; }
  });
  const set = (n: T) => {
    setV(n);
    try { localStorage.setItem(k, JSON.stringify(n)); } catch { /* storage unavailable */ }
  };
  return [v, set];
}
