import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';

export interface ChessMove { from: string; to: string; promotion?: string }

interface Props {
  fen: string;
  onMove?: (m: ChessMove) => boolean;
  side?: 'w' | 'b' | 'both';
  flip?: boolean;
  last?: { from: string; to: string } | null;
}

export function ChessBoard({ fen, onMove, side = 'both', flip, last }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [sel, setSel] = useState<string | null>(null);
  const board = chess.board();
  const hints = useMemo(
    () => (sel ? chess.moves({ square: sel as Square, verbose: true }).map((m) => m.to as string) : []),
    [sel, chess]
  );

  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  const rows = flip ? [...order].reverse() : order;
  const cols = flip ? [...order].reverse() : order;

  const click = (sq: string) => {
    if (!onMove) return;
    if (sel && hints.includes(sq)) {
      const p = chess.get(sel as Square);
      const promo = p && p.type === 'p' && (sq[1] === '8' || sq[1] === '1') ? 'q' : undefined;
      onMove({ from: sel, to: sq, promotion: promo });
      setSel(null);
      return;
    }
    const piece = chess.get(sq as Square);
    if (piece && piece.color === chess.turn() && (side === 'both' || side === piece.color)) setSel(sq);
    else setSel(null);
  };

  return (
    <div className='board'>
      {rows.map((ri) =>
        cols.map((fi) => {
          const sq = FILES[fi] + (8 - ri);
          const piece = board[ri][fi];
          const dark = (ri + fi) % 2 === 1;
          const cls = ['sq', dark ? 'd' : 'l', sel === sq ? 'sel' : '', hints.includes(sq) ? 'hint' : '', last && (last.from === sq || last.to === sq) ? 'last' : ''].join(' ');
          return (
            <div key={sq} className={cls} onClick={() => click(sq)}>
              {piece && <span className={piece.color === 'w' ? 'pw' : 'pb'}>{GLYPH[piece.type]}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
