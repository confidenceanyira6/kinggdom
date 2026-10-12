import { useEffect, useMemo, useState } from 'react';
import { allMoves, sideOf } from '../lib/checkers';
import type { Board, CMove, Pos, Side } from '../lib/checkers';

interface Props {
  board: Board;
  turn: Side;
  cont: Pos | null;
  side?: Side | 'both';
  onMove: (m: CMove) => void;
}

const same = (a: Pos, b: Pos) => a[0] === b[0] && a[1] === b[1];

export function CheckersBoard({ board, turn, cont, side = 'both', onMove }: Props) {
  const [sel, setSel] = useState<Pos | null>(null);
  const moves = useMemo(() => allMoves(board, turn, cont), [board, turn, cont]);

  useEffect(() => { setSel(cont); }, [cont, turn]);

  const dests = sel ? moves.filter((m) => same(m.from, sel)) : [];

  const click = (r: number, c: number) => {
    const dest = dests.find((m) => m.to[0] === r && m.to[1] === c);
    if (dest) { setSel(null); onMove(dest); return; }
    if (cont) return;
    const p = board[r][c];
    if (p && sideOf(p) === turn && (side === 'both' || side === turn) && moves.some((m) => m.from[0] === r && m.from[1] === c)) setSel([r, c]);
    else setSel(null);
  };

  return (
    <div className='board'>
      {board.map((row, r) =>
        row.map((p, c) => {
          const dark = (r + c) % 2 === 1;
          const isSel = sel && sel[0] === r && sel[1] === c;
          const hint = dests.some((m) => m.to[0] === r && m.to[1] === c);
          return (
            <div key={r + '-' + c} className={['sq', dark ? 'd' : 'l', isSel ? 'sel' : '', hint ? 'hint' : ''].join(' ')} onClick={() => click(r, c)}>
              {p && <div className={'disc ' + sideOf(p)}>{p === p.toUpperCase() ? '♕' : ''}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
