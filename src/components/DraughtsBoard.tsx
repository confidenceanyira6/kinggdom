import { useEffect, useMemo, useState } from 'react';
import { dAllMoves, dSideOf, isKing, squareNumber } from '../lib/draughts';
import type { DBoard, DMove, DPos, DSide } from '../lib/draughts';
import '../styles/draughts.css';

interface Props {
  board: DBoard;
  turn: DSide;
  side?: DSide | 'both';
  last?: DMove | null;
  onMove: (m: DMove) => void;
}

const same = (a: DPos, b: DPos) => a[0] === b[0] && a[1] === b[1];

/**
 * 10x10 board. A turn can be a multi-jump: pick a piece, then tap each landing square in order.
 * Highlighted dots always show the legal next squares (mandatory capture and majority rule apply).
 */
export function DraughtsBoard({ board, turn, side = 'both', last = null, onMove }: Props) {
  const [from, setFrom] = useState<DPos | null>(null);
  const [steps, setSteps] = useState<DPos[]>([]);
  const moves = useMemo(() => dAllMoves(board, turn), [board, turn]);

  useEffect(() => { setFrom(null); setSteps([]); }, [board, turn]);

  const candidates = useMemo(
    () => (from ? moves.filter((m) => same(m.from, from) && steps.every((s, i) => !!m.path[i] && same(m.path[i], s))) : []),
    [moves, from, steps]
  );
  const nexts = candidates.filter((m) => m.path.length > steps.length).map((m) => m.path[steps.length]);
  const isNext = (r: number, c: number) => nexts.some((p) => p[0] === r && p[1] === c);

  const click = (r: number, c: number) => {
    if (from) {
      const matches = candidates.filter((m) => m.path[steps.length] && same(m.path[steps.length], [r, c]));
      if (matches.length) {
        const ns: DPos[] = [...steps, [r, c]];
        const done = matches.find((m) => m.path.length === ns.length);
        if (done) { setFrom(null); setSteps([]); onMove(done); } else setSteps(ns);
        return;
      }
    }
    const p = board[r][c];
    if (p && dSideOf(p) === turn && (side === 'both' || side === turn) && moves.some((m) => same(m.from, [r, c]))) {
      setFrom([r, c]);
      setSteps([]);
    } else {
      setFrom(null);
      setSteps([]);
    }
  };

  return (
    <div className='dboard'>
      {board.map((row, r) =>
        row.map((p, c) => {
          const dark = (r + c) % 2 === 1;
          const isSel = !!from && from[0] === r && from[1] === c;
          const via = steps.some((s) => s[0] === r && s[1] === c);
          const isLast = !!last && (same(last.from, [r, c]) || same(last.path[last.path.length - 1], [r, c]));
          const cls = ['dsq', dark ? 'd' : 'l', isSel ? 'sel' : '', isNext(r, c) ? 'hint' : '', via ? 'via' : '', isLast && !isSel ? 'last' : ''].join(' ');
          return (
            <div key={r + '-' + c} className={cls} onClick={() => click(r, c)}>
              {dark && <span className='dnum'>{squareNumber(r, c)}</span>}
              {p && <div className={'dpc ' + dSideOf(p)}>{isKing(p) ? '♛' : ''}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
