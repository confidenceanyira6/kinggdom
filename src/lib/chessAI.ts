import { Chess } from 'chess.js';

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluate(c: Chess): number {
  let s = 0;
  for (const row of c.board()) for (const p of row) if (p) s += (p.color === 'w' ? 1 : -1) * VAL[p.type];
  return s;
}

// Negamax with alpha-beta pruning; score is from the side-to-move's point of view.
function nega(c: Chess, d: number, a: number, b: number): number {
  if (c.isCheckmate()) return -100000 - d;
  if (c.isDraw()) return 0;
  if (d === 0) return (c.turn() === 'w' ? 1 : -1) * evaluate(c);
  let best = -Infinity;
  for (const m of c.moves()) {
    c.move(m);
    const s = -nega(c, d - 1, -b, -a);
    c.undo();
    if (s > best) best = s;
    if (best > a) a = best;
    if (a >= b) break;
  }
  return best;
}

/** level 1 = random, 2 = 1-ply greedy, 3 = 2-ply search. */
export function bestMove(c: Chess, level: number): { from: string; to: string; promotion?: string } | null {
  const moves = c.moves({ verbose: true });
  if (!moves.length) return null;
  if (level <= 1) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion };
  }
  const depth = level === 2 ? 1 : 2;
  let best: typeof moves = [];
  let bestScore = -Infinity;
  for (const m of moves) {
    c.move({ from: m.from, to: m.to, promotion: m.promotion });
    const s = -nega(c, depth - 1, -Infinity, Infinity);
    c.undo();
    if (s > bestScore) { bestScore = s; best = [m]; } else if (s === bestScore) best.push(m);
  }
  const m = best[Math.floor(Math.random() * best.length)];
  return { from: m.from, to: m.to, promotion: m.promotion };
}
