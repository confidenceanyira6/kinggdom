import { ChessBoard } from '../components/ChessBoard';
import { CheckersBoard } from '../components/CheckersBoard';
import type { GameType } from '../types';
import type { BoardState } from './types';

/** Read-only board for viewers. Same square 8x8 grid as the playable boards. */
export function SpectatorBoard({ game, bs }: { game: GameType; bs: BoardState }) {
  return (
    <div className='ro'>
      {game === 'chess'
        ? <ChessBoard fen={bs.fen} last={bs.lastSq} />
        : <CheckersBoard board={bs.board} turn={bs.turn} cont={bs.cont} onMove={() => undefined} />}
    </div>
  );
}
