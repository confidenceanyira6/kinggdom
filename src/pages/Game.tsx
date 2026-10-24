import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';
import type { ChessMove } from '../components/ChessBoard';
import { CheckersBoard } from '../components/CheckersBoard';
import { DraughtsBoard } from '../components/DraughtsBoard';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Avatar, Button, Sheet, Spinner, TopBar } from '../components/ui';
import { bestMove } from '../lib/chessAI';
import { aiMove, applyMove, initialBoard, winner } from '../lib/checkers';
import type { CMove, Pos, Side } from '../lib/checkers';
import { applyDMove, boardKey, dAiMove, dWinner, initialDBoard, isKing, other } from '../lib/draughts';
import type { DMove, DSide } from '../lib/draughts';
import { goBack } from '../lib/nav';
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

type SideName = 'White' | 'Black' | 'Red';

function PlayerBar({ name, side, sub, active }: { name: string; side: SideName; sub?: string; active: boolean }) {
  return (
    <div className='player-bar'>
      <Avatar name={name} size={36} ring={active} />
      <div className='grow'>
        <div className='row gap8'><b>{name}</b><span className={'side-chip ' + side.toLowerCase()}><i />{side}</span></div>
        {sub && <div className='tiny muted'>{sub}</div>}
      </div>
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
        <Button variant='ghost' onClick={() => goBack(nav, '/play')}>Exit</Button>
      </div>
    </Sheet>
  );
}

function Searching() {
  return <div className='col center gap12' style={{ minHeight: '60vh' }}><Spinner /><b>Finding an opponent...</b></div>;
}

function ResignConfirm({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ConfirmSheet
      open={open}
      title='Resign this match?'
      message='If you resign, you will lose this match.'
      confirmLabel='OK'
      danger
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function ChessGame({ mode, level, onAgain }: GameProps) {
  const nav = useNavigate();
  const user = useApp((s) => s.user)!;
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [askResign, setAskResign] = useState(false);
  const { result, reward, finish } = useReport('chess', mode);
  const searching = useSearching(mode);
  const opp = mode === 'ai' ? 'Kinggdom AI' : mode === 'local' ? 'Player 2' : 'Opponent';

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

  const confirmResign = () => {
    setAskResign(false);
    if (!result) void finish({ text: 'You resigned', outcome: 'loss' });
    useApp.getState().toast('You resigned the match');
    goBack(nav, '/play');
  };

  if (searching) return <Searching />;
  const turn = game.current.turn();
  const history = game.current.history();
  return (
    <>
      <PlayerBar name={opp} side='Black' sub={mode === 'ai' ? 'AI level ' + level : undefined} active={turn === 'b'} />
      <ChessBoard fen={fen} onMove={onMove} side={mode === 'local' ? 'both' : 'w'} last={last} />
      <PlayerBar name={mode === 'local' ? 'Player 1' : user.username} side='White' active={turn === 'w'} />
      <div className='moves'>{history.length === 0 ? <span>Your move, White</span> : history.map((m, i) => <span key={i}>{i % 2 === 0 ? Math.floor(i / 2) + 1 + '.' : ''}{m}</span>)}</div>
      <div className='grid2 mt8'>
        <Button variant='danger' onClick={() => !result && setAskResign(true)}>Resign</Button>
        <Button variant='ghost' onClick={onAgain}>New game</Button>
      </div>
      <ResultSheet result={result} reward={reward} onAgain={onAgain} mode={mode} />
      <ResignConfirm open={askResign} onCancel={() => setAskResign(false)} onConfirm={confirmResign} />
    </>
  );
}

function CheckersGame({ mode, level, onAgain }: GameProps) {
  const nav = useNavigate();
  const user = useApp((s) => s.user)!;
  const [board, setBoard] = useState(initialBoard);
  const [turn, setTurn] = useState<Side>('r');
  const [cont, setCont] = useState<Pos | null>(null);
  const [askResign, setAskResign] = useState(false);
  const { result, reward, finish } = useReport('checkers', mode);
  const searching = useSearching(mode);
  const opp = mode === 'ai' ? 'Kinggdom AI' : mode === 'local' ? 'Player 2' : 'Opponent';

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

  const confirmResign = () => {
    setAskResign(false);
    if (!result) void finish({ text: 'You resigned', outcome: 'loss' });
    useApp.getState().toast('You resigned the match');
    goBack(nav, '/play');
  };

  if (searching) return <Searching />;
  const count = (s: Side) => board.flat().filter((p) => p && p.toLowerCase() === s).length;
  return (
    <>
      <PlayerBar name={opp} side='Black' sub={count('b') + ' pieces'} active={turn === 'b'} />
      <CheckersBoard board={board} turn={turn} cont={cont} side={mode === 'local' ? 'both' : 'r'} onMove={apply} />
      <PlayerBar name={mode === 'local' ? 'Player 1' : user.username} side='Red' sub={count('r') + ' pieces'} active={turn === 'r'} />
      <p className='tiny muted tc'>Captures are mandatory. Reach the far row to crown a king.</p>
      <div className='grid2 mt8'>
        <Button variant='danger' onClick={() => !result && setAskResign(true)}>Resign</Button>
        <Button variant='ghost' onClick={onAgain}>New game</Button>
      </div>
      <ResultSheet result={result} reward={reward} onAgain={onAgain} mode={mode} />
      <ResignConfirm open={askResign} onCancel={() => setAskResign(false)} onConfirm={confirmResign} />
    </>
  );
}

function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title='International Checkers rules'>
      <ol className='drules'>
        <li><b>Board.</b> 10×10 board, 20 pieces each on the dark squares. White moves first.</li>
        <li><b>Men.</b> A man moves one square diagonally forward onto an empty dark square.</li>
        <li><b>Capturing.</b> Jump over an adjacent enemy piece to the empty square just behind it. Men may capture forwards and backwards.</li>
        <li><b>Kings.</b> A king is a flying king: it moves any number of empty squares diagonally, and captures from a distance, landing on any empty square beyond the captured piece.</li>
        <li><b>Capture is mandatory.</b> If you can capture, you must.</li>
        <li><b>Majority rule.</b> You must choose the route that captures the most pieces, whether with a man or a king.</li>
        <li><b>Multi-jumps.</b> Keep jumping with the same piece until it cannot capture any more. A piece cannot be jumped twice, and captured pieces come off the board only when your move ends.</li>
        <li><b>Crowning.</b> A man becomes a king only if its move ENDS on the far row. If it passes through that row while still capturing, it stays a man.</li>
        <li><b>Winning.</b> You win when the opponent has no pieces left or no legal move.</li>
        <li><b>Draws.</b> Same position three times, or 25 moves each with only king moves and no captures.</li>
      </ol>
      <p className='tiny muted mt8'>To make a multi-jump, tap your piece, then tap each landing square in order. The dots show your legal next squares.</p>
    </Sheet>
  );
}

function InternationalGame({ mode, level, onAgain }: GameProps) {
  const nav = useNavigate();
  const user = useApp((s) => s.user)!;
  const [board, setBoard] = useState(initialDBoard);
  const [turn, setTurn] = useState<DSide>('w');
  const [lastMove, setLastMove] = useState<DMove | null>(null);
  const [askResign, setAskResign] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const quiet = useRef(0);
  const seen = useRef<Record<string, number>>({});
  const { result, reward, finish } = useReport('checkers', mode);
  const searching = useSearching(mode);
  const opp = mode === 'ai' ? 'Kinggdom AI' : mode === 'local' ? 'Player 2' : 'Opponent';

  const apply = (m: DMove) => {
    const mover = board[m.from[0]][m.from[1]];
    const nb = applyDMove(board, m);
    const next = other(turn);
    setBoard(nb); setTurn(next); setLastMove(m);
    quiet.current = m.caps.length === 0 && isKing(mover) ? quiet.current + 1 : 0;
    const key = boardKey(nb) + next;
    seen.current[key] = (seen.current[key] || 0) + 1;
    const w = dWinner(nb, next);
    if (w) { finish({ text: w === 'w' ? 'White wins' : 'Black wins', outcome: w === 'w' ? 'win' : 'loss' }); return; }
    if (seen.current[key] >= 3) { finish({ text: 'Draw by repetition', outcome: 'draw' }); return; }
    if (quiet.current >= 50) finish({ text: 'Draw: 25 moves each with only kings and no capture', outcome: 'draw' });
  };

  useEffect(() => {
    if (mode === 'local' || turn !== 'b' || result || searching) return;
    const t = setTimeout(() => {
      const m = dAiMove(board, 'b', mode === 'online' ? 2 : level);
      if (m) apply(m);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, turn, result, searching]);

  const confirmResign = () => {
    setAskResign(false);
    if (!result) void finish({ text: 'You resigned', outcome: 'loss' });
    useApp.getState().toast('You resigned the match');
    goBack(nav, '/play');
  };

  if (searching) return <Searching />;
  const count = (s: DSide) => board.flat().filter((p) => p && p.toLowerCase() === s).length;
  return (
    <>
      <PlayerBar name={opp} side='Black' sub={count('b') + ' pieces'} active={turn === 'b'} />
      <DraughtsBoard board={board} turn={turn} side={mode === 'local' ? 'both' : 'w'} last={lastMove} onMove={apply} />
      <PlayerBar name={mode === 'local' ? 'Player 1' : user.username} side='White' sub={count('w') + ' pieces'} active={turn === 'w'} />
      <p className='tiny muted tc'>Capture is mandatory and you must take the most pieces. Kings fly.</p>
      <div className='grid2 mt8'>
        <Button variant='danger' onClick={() => !result && setAskResign(true)}>Resign</Button>
        <Button variant='ghost' onClick={onAgain}>New game</Button>
      </div>
      <div className='mt8'><Button variant='ghost' onClick={() => setShowRules(true)}>Rules</Button></div>
      <RulesSheet open={showRules} onClose={() => setShowRules(false)} />
      <ResultSheet result={result} reward={reward} onAgain={onAgain} mode={mode} />
      <ResignConfirm open={askResign} onCancel={() => setAskResign(false)} onConfirm={confirmResign} />
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
  const name = game === 'international' ? 'International Checkers' : game === 'checkers' ? 'Checkers' : 'Chess';
  return (
    <div className='screen nonav'>
      <TopBar title={name + ' · ' + (mode === 'ai' ? 'vs AI' : mode === 'local' ? 'Pass and play' : 'Online')} />
      {game === 'international' ? (
        <InternationalGame key={round} mode={mode} level={level} onAgain={again} />
      ) : game === 'checkers' ? (
        <CheckersGame key={round} mode={mode} level={level} onAgain={again} />
      ) : (
        <ChessGame key={round} mode={mode} level={level} onAgain={again} />
      )}
    </div>
  );
}
