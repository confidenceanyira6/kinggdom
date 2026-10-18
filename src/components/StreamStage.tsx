import { useEffect, useRef, useState } from 'react';
import { VideoOff } from 'lucide-react';
import type { GameType, User } from '../types';
import { useDemoGame } from '../hooks/useDemo';
import { aiMove, applyMove, initialBoard } from '../lib/checkers';
import type { Board, Pos, Side } from '../lib/checkers';
import { ChessBoard } from './ChessBoard';
import { CheckersBoard } from './CheckersBoard';
import { Avatar } from './ui';

export type SideLabel = 'White' | 'Black' | 'Red';

interface FaceProps {
  user: User;
  side?: SideLabel;
  stream?: MediaStream | null;
  mirror?: boolean;
  active?: boolean;
  big?: boolean;
  camOff?: boolean;
}

/** A player's face tile. Shows live video when a stream is given, otherwise their avatar. */
export function FaceCam({ user, side, stream, mirror, active, big, camOff }: FaceProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const live = !!stream && !camOff;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.srcObject = live ? stream! : null;
    if (live) {
      v.muted = true;
      v.play().catch(() => undefined);
    }
  }, [stream, live]);
  return (
    <div className={'cam-tile' + (big ? ' big' : '') + (active ? ' active' : '')}>
      {live ? <video ref={ref} autoPlay playsInline muted className={mirror ? 'mirror' : ''} /> : <Avatar name={user.name} size={big ? 64 : 52} />}
      {side && <span className={'cam-side side-chip ' + side.toLowerCase()}><i />{side}</span>}
      {camOff && <span className='off'><VideoOff size={12} /></span>}
      <div className='nm'>{user.username}<small>{user.rating}</small></div>
    </div>
  );
}

type Turn = 'a' | 'b';

function ChessDemo({ onTurn }: { onTurn: (t: Turn) => void }) {
  const demo = useDemoGame(2600);
  const side = demo.fen.split(' ')[1];
  useEffect(() => { onTurn(side === 'w' ? 'a' : 'b'); }, [side, onTurn]);
  return <ChessBoard fen={demo.fen} last={demo.last} />;
}

interface CState { board: Board; turn: Side; cont: Pos | null; n: number }
const fresh = (): CState => ({ board: initialBoard(), turn: 'r', cont: null, n: 0 });

function CheckersDemo({ onTurn }: { onTurn: (t: Turn) => void }) {
  const [s, setS] = useState<CState>(fresh);
  useEffect(() => {
    const t = setInterval(() => {
      setS((cur) => {
        const m = cur.n > 140 ? null : aiMove(cur.board, cur.turn, cur.cont, 3);
        if (!m) return fresh();
        const r = applyMove(cur.board, m);
        return { board: r.board, turn: r.next, cont: r.cont, n: cur.n + 1 };
      });
    }, 1400);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { onTurn(s.turn === 'r' ? 'a' : 'b'); }, [s.turn, onTurn]);
  return <CheckersBoard board={s.board} turn={s.turn} cont={s.cont} onMove={() => undefined} />;
}

/** Auto-playing spectator board until real game streams come from the backend. */
export function DemoBoard({ game, onTurn }: { game: GameType; onTurn: (t: Turn) => void }) {
  return game === 'checkers' ? <CheckersDemo onTurn={onTurn} /> : <ChessDemo onTurn={onTurn} />;
}
