// International draughts (10x10, "International Checkers").
// White starts at the bottom and moves up (towards row 0). Black starts at the top.
// Rules implemented: flying kings, men capture backwards, mandatory capture,
// majority rule (must take the route capturing the most pieces), no piece jumped twice,
// crowning only when a move ENDS on the far row.

export type DPiece = 'w' | 'W' | 'b' | 'B' | null;
export type DBoard = DPiece[][];
export type DSide = 'w' | 'b';
export type DPos = [number, number];
/** One complete turn. `path` lists every landing square in order, `caps` the pieces taken. */
export interface DMove { from: DPos; path: DPos[]; caps: DPos[] }

export const DSIZE = 10;
const DIRS: DPos[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const inB = (r: number, c: number) => r >= 0 && r < DSIZE && c >= 0 && c < DSIZE;

export const dSideOf = (p: DPiece): DSide | null => (p ? (p.toLowerCase() as DSide) : null);
export const isKing = (p: DPiece) => !!p && p === p.toUpperCase();
export const other = (s: DSide): DSide => (s === 'w' ? 'b' : 'w');
/** Standard 1-50 square number (1 = top-left dark square from White's view). */
export const squareNumber = (r: number, c: number) => r * 5 + Math.floor(c / 2) + 1;

export function initialDBoard(): DBoard {
  const b: DBoard = Array.from({ length: DSIZE }, () => Array<DPiece>(DSIZE).fill(null));
  for (let r = 0; r < DSIZE; r++)
    for (let c = 0; c < DSIZE; c++)
      if ((r + c) % 2 === 1) {
        if (r < 4) b[r][c] = 'b';
        else if (r > 5) b[r][c] = 'w';
      }
  return b;
}

/** Every complete capture sequence for the piece on `from` (not yet filtered by the majority rule). */
function captureSeqs(b: DBoard, from: DPos): DMove[] {
  const piece = b[from[0]][from[1]]!;
  const side = dSideOf(piece)!;
  const king = isKing(piece);
  // The moving piece leaves its square, so it may pass over it again. Captured pieces stay
  // on the board until the move ends: they block the path and cannot be jumped twice.
  const nb = b.map((row) => [...row]) as DBoard;
  nb[from[0]][from[1]] = null;
  const out: DMove[] = [];

  const walk = (pos: DPos, caps: DPos[], path: DPos[]) => {
    let extended = false;
    for (const [dr, dc] of DIRS) {
      let r = pos[0] + dr;
      let c = pos[1] + dc;
      if (king) while (inB(r, c) && nb[r][c] === null) { r += dr; c += dc; }
      if (!inB(r, c)) continue;
      const t = nb[r][c];
      if (!t || dSideOf(t) === side || caps.some((p) => p[0] === r && p[1] === c)) continue;
      let lr = r + dr;
      let lc = c + dc;
      while (inB(lr, lc) && nb[lr][lc] === null) {
        extended = true;
        walk([lr, lc], [...caps, [r, c]], [...path, [lr, lc]]);
        if (!king) break;
        lr += dr;
        lc += dc;
      }
    }
    if (!extended && caps.length) out.push({ from, path, caps });
  };

  walk(from, [], []);
  return out;
}

function quietMoves(b: DBoard, from: DPos): DMove[] {
  const p = b[from[0]][from[1]]!;
  const king = isKing(p);
  const fwd = dSideOf(p) === 'w' ? -1 : 1;
  const out: DMove[] = [];
  for (const [dr, dc] of DIRS) {
    if (!king && dr !== fwd) continue;
    let r = from[0] + dr;
    let c = from[1] + dc;
    while (inB(r, c) && b[r][c] === null) {
      out.push({ from, path: [[r, c]], caps: [] });
      if (!king) break;
      r += dr;
      c += dc;
    }
  }
  return out;
}

/** All legal turns. Captures are mandatory and only the maximum-capture routes are legal. */
export function dAllMoves(b: DBoard, s: DSide): DMove[] {
  const caps: DMove[] = [];
  for (let r = 0; r < DSIZE; r++) for (let c = 0; c < DSIZE; c++) if (dSideOf(b[r][c]) === s) caps.push(...captureSeqs(b, [r, c]));
  if (caps.length) {
    const max = Math.max(...caps.map((m) => m.caps.length));
    return caps.filter((m) => m.caps.length === max);
  }
  const quiet: DMove[] = [];
  for (let r = 0; r < DSIZE; r++) for (let c = 0; c < DSIZE; c++) if (dSideOf(b[r][c]) === s) quiet.push(...quietMoves(b, [r, c]));
  return quiet;
}

export function applyDMove(b: DBoard, m: DMove): DBoard {
  const nb = b.map((row) => [...row]) as DBoard;
  const p = nb[m.from[0]][m.from[1]]!;
  nb[m.from[0]][m.from[1]] = null;
  for (const [r, c] of m.caps) nb[r][c] = null;
  const end = m.path[m.path.length - 1];
  const crown = (p === 'w' && end[0] === 0) || (p === 'b' && end[0] === DSIZE - 1);
  nb[end[0]][end[1]] = crown ? (p.toUpperCase() as DPiece) : p;
  return nb;
}

/** The side that has just won, given whose turn it is: no legal move (or no pieces) loses. */
export function dWinner(b: DBoard, turn: DSide): DSide | null {
  return dAllMoves(b, turn).length === 0 ? other(turn) : null;
}

export const boardKey = (b: DBoard) => b.map((row) => row.map((p) => p ?? '.').join('')).join('/');

function evaluate(b: DBoard, me: DSide): number {
  let score = 0;
  for (let r = 0; r < DSIZE; r++)
    for (let c = 0; c < DSIZE; c++) {
      const p = b[r][c];
      if (!p) continue;
      const s = dSideOf(p)!;
      const king = isKing(p);
      let v = king ? 320 : 100;
      if (!king) v += (s === 'w' ? DSIZE - 1 - r : r) * 5;
      v += 4.5 - Math.abs(c - 4.5);
      score += s === me ? v : -v;
    }
  return score;
}

function search(b: DBoard, side: DSide, depth: number, alpha: number, beta: number, me: DSide): number {
  const ms = dAllMoves(b, side);
  if (!ms.length) return side === me ? -100000 - depth : 100000 + depth;
  if (depth === 0) return evaluate(b, me);
  if (side === me) {
    let best = -Infinity;
    for (const m of ms) {
      best = Math.max(best, search(applyDMove(b, m), other(side), depth - 1, alpha, beta, me));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of ms) {
    best = Math.min(best, search(applyDMove(b, m), other(side), depth - 1, alpha, beta, me));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

/** level 1 = random legal move, 2 = looks 2 plies ahead, 3 = looks 3 plies ahead. */
export function dAiMove(b: DBoard, side: DSide, level: number): DMove | null {
  const ms = dAllMoves(b, side);
  if (!ms.length) return null;
  if (level <= 1 || ms.length === 1) return ms[Math.floor(Math.random() * ms.length)];
  const depth = level >= 3 ? 3 : 2;
  let best: DMove[] = [];
  let bestScore = -Infinity;
  for (const m of ms) {
    const sc = search(applyDMove(b, m), other(side), depth - 1, -Infinity, Infinity, side) + Math.random() * 0.5;
    if (sc > bestScore) { bestScore = sc; best = [m]; } else if (sc === bestScore) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)];
}
