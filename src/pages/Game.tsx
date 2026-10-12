import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';
import type { ChessMove } from '../components/ChessBoard';
import { CheckersBoard } from '../components/CheckersBoard';
import { Avatar, Button, Sheet, Spinner, TopBar } from '../components/ui';
import { bestMove } from '../lib/chessAI';
import { aiMove, applyMove, initialBoard, winner } from '../lib/checkers';
import type { CMove, Pos, Side } from '../lib/checkers';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import type { GameType } from '../types';

type Result = { text: string; outcome: 'win' | 'loss' | 'draw' };
interface GameProps { mode: string; level: number; onAgain: () => void }

function useReport(game: GameType, mode: string) {
  const [result, setResult] = useState<Result | null>(null);
  const [reward, setReward] = useState(0);
  const finish = async (r: Result) => {
    setResult(r);
    if (mode === 'local') return;
    try {
      const before = useApp.getState().tokens;
      const res = await api.games.report({ game, result: r.outcome, mode });
      setReward(Math.max(0, res.tokens - before));
      useApp.getState().setTokens(res.tokens);
    } catch { /* reward is best-effort */ }
  };
  return { result, reward, finish };
}

function useSearching(mode: string) {
  const [searching, setSearching] = useState(mode === 'online');
  useEffect(() => {
    if (!searching) return;
    const t = setTimeout(() => setSearching(false), 1800);
    return () => clearTimeout(t);
  }, [searching]);
  return searching;
}

function PlayerBar({ name, sub, active }: { name: string; sub: string; active: boolean }) {
  return (
    <div className='player-bar'>
      <Avatar name={name} size={36} ring={active} />
      <div className='grow'><b>{name}</b><div className='tiny muted'>{sub}</div></div>
      {active && <span className='pill'>TURN</span>}
    </div>
  );
}

function ResultSheet({ result, reward, onAgain, mode }: { result: Result | null; reward: number; onAgain: () => void; mode: string }) {
  const nav = useNavigate();
  return (
    <Sheet open={!!result} onClose={() => undefined} title={result?.outcome === 'win' ? '🏆 You won!' : result?.outcome === 'loss' ? 'Game over' : 'Game finished'}>
      <p className='muted mb12'>{result?.text}</p>
      {mode !== 'local' && reward > 0 && <p className='gold bold mb12'>+{reward} tokens earned</p>}
      <div className='grid2'>
        <Button onClick={onAgain}>Play again</Button>
        <Button variant='ghost' onClick={() => nav('/play')}>Exit</Button>
      </div>
    </Sheet>
  );
}

function Searching() {
  return <div className='col center gap12' style={{ minHeight: '60vh' }}><Spinner /><b>Finding an opponent...</b><span className='small muted'>Realtime matchmaking connects when the backend is live.</span></div>;
}

function ChessGame({ mode, level, onAgain }: GameProps) {
  const user = useApp((s) => s.user)!;
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const { result, reward, finish } = useReport('chess', mode);
  const searching = useSearching(mode);
  const opp = mode === 'ai' ? 'Kinggdom AI' : mode === 'local' ? 'Player 2' : 'QueenBee';

  const checkEnd = () => {
    const g = game.current;
    if (g.isCheckmate()) {
      const whiteWon = g.turn() === 'b';
      finish({ text: whiteWon ? 'White wins by checkmate' : 'Black wins by checkmate', outcome: whiteWon ? 'win' : 'loss' });
      return true;
    }
    if (g.isDraw()) { finish({ text: 'The game is a draw', outcome: 'draw' }); return true; }
    return false;
  };

  const onMove = (m: ChessMove) => {
    if (result || thinking) return false;
    try {
      const mv = game.current.move(m);
      setLast({ from: mv.from, to: mv.to });
      setFen(game.current.fen());
      if (checkEnd()) return true;
      if (mode !== 'local') {
        setThinking(true);
        setTimeout(() => {
          const ai = bestMove(game.current, mode === 'online' ? 2 : level);
          if (ai) {
            const r = game.current.move(ai);
            setLast({ from: r.from, to: r.to });
            setFen(game.current.fen());
            checkEnd();
          }
          setThinking(false);
        }, 350);
      }
      return true;
    } catch { return false; }
  };

  if (searching) return <Searching />;
  const turn = game.current.turn();
  const history = game.current.history();
  return (
    <>
      <PlayerBar name={opp} sub={mode === 'ai' ? 'AI level ' + level : 'Black'} active={turn === 'b'} />
      <ChessBoard fen={fen} onMove={onMove} side={mode === 'local' ? 'both' : 'w'} last={last} />
      <PlayerBar name={user.username} sub='White' active={turn === 'w'} />
      <div className='moves'>{history.length === 0 ? <span>Your move, White</span> : history.map((m, i) => <span key={i}>{i % 2 === 0 ? Math.floor(i / 2) + 1 + '.' : ''}{m}</span>)}</div>
      <div className='grid2 mt8'>
        <Button variant='danger' onClick={() => !result && finish({ text: 'You resigned', outcome: 'loss' })}>Resign</Button>
        <Button variant='ghost' onClick={onAgain}>New game</Button>
      </div>
      <ResultSheet result={result} reward={reward} onAgain={onAgain} mode={mode} />
    </>
  );
}

function CheckersGame({ mode, level, onAgain }: GameProps) {
  const user = useApp((s) => s.user)!;
  const [board, setBoard] = useState(initialBoard);
  const [turn, setTurn] = useState<Side>('r');
  const [cont, setCont] = useState<Pos | null>(null);
  const { result, reward, finish } = useReport('checkers', mode);
  const searching = useSearching(mode);
  const opp = mode === 'ai' ? 'Kinggdom AI' : mode === 'local' ? 'Player 2' : 'QueenBee';

  const apply = (m: CMove) => {
    const r = applyMove(board, m);
    setBoard(r.board); setTurn(r.next); setCont(r.cont);
    const w = winner(r.board, r.next, r.cont);
    if (w) finish({ text: w === 'r' ? 'Red wins' : 'Black wins', outcome: w === 'r' ? 'win' : 'loss' });
  };

  useEffect(() => {
    if (mode === 'local' || turn !== 'b' || result || searching) return;
    const t = setTimeout(() => {
      const m = aiMove(board, 'b', cont, mode === 'online' ? 2 : level);
      if (m) apply(m);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, turn, cont, result, searching]);

  if (searching) return <Searching />;
  const count = (s: Side) => board.flat().filter((p) => p && p.toLowerCase() === s).length;
  return (
    <>
      <PlayerBar name={opp} sub={'Black · ' + count('b') + ' pieces'} active={turn === 'b'} />
      <CheckersBoard board={board} turn={turn} cont={cont} side={mode === 'local' ? 'both' : 'r'} onMove={apply} />
      <PlayerBar name={user.username} sub={'Red · ' + count('r') + ' pieces'} active={turn === 'r'} />
      <p className='tiny muted tc'>Captures are mandatory. Reach the far row to crown a king.</p>
      <div className='grid2 mt8'>
        <Button variant='danger' onClick={() => !result && finish({ text: 'You resigned', outcome: 'loss' })}>Resign</Button>
        <Button variant='ghost' onClick={onAgain}>New game</Button>
      </div>
      <ResultSheet result={result} reward={reward} onAgain={onAgain} mode={mode} />
    </>
  );
}

export default function Game() {
  const { game } = useParams();
  const [sp] = useSearchParams();
  const mode = sp.get('mode') || 'ai';
  const level = Number(sp.get('level') || 2);
  const [round, setRound] = useState(0);
  const again = () => setRound((r) => r + 1);
  return (
    <div className='screen nonav'>
      <TopBar title={(game === 'checkers' ? 'Checkers' : 'Chess') + ' · ' + (mode === 'ai' ? 'vs AI' : mode === 'local' ? 'Pass and play' : 'Online')} />
      {game === 'checkers' ? <CheckersGame key={round} mode={mode} level={level} onAgain={again} /> : <ChessGame key={round} mode={mode} level={level} onAgain={again} />}
    </div>
  );
}
