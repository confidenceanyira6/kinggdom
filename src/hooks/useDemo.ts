import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { bestMove } from '../lib/chessAI';

/** Plays an auto-running demo game. Used until live game streams come from the backend. */
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

const LINES: [string, string][] = [['ChessFan', 'This is intense!'], ['RookLord', 'King is in trouble 😬'], ['TacticsFan', 'What a move!'], ['QueenBee', 'Big brain play!'], ['ChessPro', 'Who will win?']];

/** Simulated live chat. Swap for a realtime channel when the backend is connected. */
export function useFakeChat() {
  const [lines, setLines] = useState<{ by: string; text: string }[]>([{ by: 'ChessFan', text: 'This is intense!' }]);
  useEffect(() => {
    const t = setInterval(() => {
      const l = LINES[Math.floor(Math.random() * LINES.length)];
      setLines((x) => [...x.slice(-30), { by: l[0], text: l[1] }]);
    }, 3500);
    return () => clearInterval(t);
  }, []);
  const send = (by: string, text: string) => setLines((x) => [...x, { by, text }]);
  return { lines, send };
}
