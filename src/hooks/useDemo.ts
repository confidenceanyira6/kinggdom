import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { bestMove } from '../lib/chessAI';

/** Plays an auto-running demo board for the live-stream / watch screens (no accounts involved). */
export function useDemoGame(ms = 2200) {
  const g = useRef(new Chess());
  const [fen, setFen] = useState(g.current.fen());
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  useEffect(() => {
    const t = setInterval(() => {
      if (g.current.isGameOver()) { g.current = new Chess(); setMoves([]); }
      const m = bestMove(g.current, 2);
      if (!m) return;
      const r = g.current.move(m);
      setLast({ from: r.from, to: r.to });
      setFen(g.current.fen());
      setMoves(g.current.history());
    }, ms);
    return () => clearInterval(t);
  }, [ms]);
  return { fen, last, moves };
}

/** Live chat shows only messages sent by real people in this session. No made-up viewers or messages. */
export function useFakeChat() {
  const [lines, setLines] = useState<{ by: string; text: string }[]>([]);
  const send = (by: string, text: string) => setLines((x) => [...x.slice(-60), { by, text }]);
  return { lines, send };
}
