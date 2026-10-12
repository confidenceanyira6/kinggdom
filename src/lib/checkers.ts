export type Piece = 'r' | 'R' | 'b' | 'B' | null;
export type Board = Piece[][];
export type Side = 'r' | 'b';
export type Pos = [number, number];
export interface CMove { from: Pos; to: Pos; cap?: Pos }

// Red starts at the bottom and moves up (towards row 0). Black starts at the top.
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const sideOf = (p: Piece): Side | null => (p ? (p.toLowerCase() as Side) : null);

export function initialBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array<Piece>(8).fill(null));
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) {
        if (r < 3) b[r][c] = 'b';
        else if (r > 4) b[r][c] = 'r';
      }
  return b;
}

export function movesFrom(b: Board, r: number, c: number, capOnly = false): CMove[] {
  const p = b[r][c];
  if (!p) return [];
  const king = p === p.toUpperCase();
  const s = sideOf(p)!;
  const dirs = king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : s === 'r' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  const out: CMove[] = [];
  for (const [dr, dc] of dirs) {
    const r1 = r + dr, c1 = c + dc;
    if (!inB(r1, c1)) continue;
    const t = b[r1][c1];
    if (!t) {
      if (!capOnly) out.push({ from: [r, c], to: [r1, c1] });
    } else if (sideOf(t) !== s) {
      const r2 = r1 + dr, c2 = c1 + dc;
      if (inB(r2, c2) && !b[r2][c2]) out.push({ from: [r, c], to: [r2, c2], cap: [r1, c1] });
    }
  }
  return out;
}

/** Captures are mandatory. `cont` = piece that must keep jumping. */
export function allMoves(b: Board, s: Side, cont: Pos | null = null): CMove[] {
  if (cont) return movesFrom(b, cont[0], cont[1], true);
  const all: CMove[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (sideOf(b[r][c]) === s) all.push(...movesFrom(b, r, c));
  const caps = all.filter((m) => m.cap);
  return caps.length ? caps : all;
}

export function applyMove(b: Board, m: CMove): { board: Board; next: Side; cont: Pos | null } {
  const nb = b.map((row) => [...row]) as Board;
  const p = nb[m.from[0]][m.from[1]]!;
  const s = sideOf(p)!;
  nb[m.from[0]][m.from[1]] = null;
  if (m.cap) nb[m.cap[0]][m.cap[1]] = null;
  const promoted = (p === 'r' && m.to[0] === 0) || (p === 'b' && m.to[0] === 7);
  nb[m.to[0]][m.to[1]] = promoted ? (p.toUpperCase() as Piece) : p;
  if (m.cap && !promoted && movesFrom(nb, m.to[0], m.to[1], true).length) return { board: nb, next: s, cont: m.to };
  return { board: nb, next: s === 'r' ? 'b' : 'r', cont: null };
}

export function winner(b: Board, turn: Side, cont: Pos | null): Side | null {
  return allMoves(b, turn, cont).length === 0 ? (turn === 'r' ? 'b' : 'r') : null;
}

export function aiMove(b: Board, s: Side, cont: Pos | null, level: number): CMove | null {
  const ms = allMoves(b, s, cont);
  if (!ms.length) return null;
  if (level <= 1) return ms[Math.floor(Math.random() * ms.length)];
  let best: CMove[] = [];
  let bestScore = -Infinity;
  for (const m of ms) {
    let sc = Math.random() * 0.5;
    if (m.cap) sc += 10;
    const piece = b[m.from[0]][m.from[1]]!;
    if ((s === 'b' && m.to[0] === 7 && piece === 'b') || (s === 'r' && m.to[0] === 0 && piece === 'r')) sc += 5;
    sc += s === 'b' ? (m.to[0] - m.from[0]) * 0.5 : (m.from[0] - m.to[0]) * 0.5;
    if (level >= 3) {
      const res = applyMove(b, m);
      const opp = res.next === s ? [] : allMoves(res.board, res.next);
      if (opp.some((o) => o.cap && o.cap[0] === m.to[0] && o.cap[1] === m.to[1])) sc -= 6;
    }
    if (sc > bestScore) { bestScore = sc; best = [m]; } else if (sc === bestScore) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)];
}
