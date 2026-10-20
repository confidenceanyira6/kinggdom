import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChevronLeft, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useCamera } from '../hooks/useCamera';
import { useMic } from '../hooks/useMic';
import { ChessBoard } from '../components/ChessBoard';
import type { ChessMove } from '../components/ChessBoard';
import { CheckersBoard } from '../components/CheckersBoard';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { FaceCam } from '../components/StreamStage';
import { Button, Sheet } from '../components/ui';
import { aiMove, applyMove, winner as boardWinner } from '../lib/checkers';
import type { CMove, Side } from '../lib/checkers';
import { bestMove } from '../lib/chessAI';
import { goBack } from '../lib/nav';
import { Countdown } from '../arena/ui';
import { SpectatorBoard } from '../arena/BoardView';
import { GAME_LABEL, freshBoard, levelFor, nextMatchFor, playerUser, sideName, standings, useArena, useBoards } from '../arena/store';
import type { ArenaMatch as MatchData, BoardState, EndReason } from '../arena/types';
import '../styles/stream.css';
import '../styles/arena.css';
import '../styles/arena-pages.css';

const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

export default function ArenaMatchPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const me = useApp((s) => s.user)!;
  const toast = useApp((s) => s.toast);
  const comps = useArena((s) => s.comps);
  const bs = useBoards((s) => s.boards[id]);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [askResign, setAskResign] = useState(false);
  const cam = useCamera(camOn);
  const mic = useMic(micOn);
  useEffect(() => { if (cam.error) toast(cam.error); }, [cam.error, toast]);
  useEffect(() => { if (mic.error) toast(mic.error); }, [mic.error, toast]);

  const found = comps.flatMap((c) => c.matches.map((m) => ({ c, m }))).find((x) => x.m.id === id);
  const status = found ? found.m.status : null;
  const board: BoardState = bs ?? freshBoard();

  const finish = (w: string | null, reason: EndReason = 'played') => useArena.getState().finishMatch(id, w, reason);

  const commitChess = (g: Chess, from: string, to: string, cur: BoardState, m: MatchData, mover: 'w' | 'b') => {
    useBoards.getState().put(id, { ...cur, fen: g.fen(), lastSq: { from, to }, n: cur.n + 1, turn: g.turn() === 'w' ? 'r' : 'b' });
    if (g.isCheckmate()) finish(mover === 'w' ? m.a : m.b);
    else if (g.isDraw()) finish(null, 'draw');
  };
  const commitChecker = (mv: CMove, cur: BoardState, m: MatchData) => {
    const r = applyMove(cur.board, mv);
    useBoards.getState().put(id, { ...cur, board: r.board, turn: r.next, cont: r.cont, n: cur.n + 1, last: { from: mv.from, to: mv.to } });
    const w = boardWinner(r.board, r.next, r.cont);
    if (w) finish(w === 'r' ? m.a : m.b);
  };

  // The opponent in this demo is a bot. With the realtime backend this is the other player's move.
  useEffect(() => {
    if (!found || found.m.status !== 'live') return;
    const { c, m } = found;
    const mySide: Side = m.a === me.username ? 'r' : 'b';
    const cur0 = useBoards.getState().boards[id] ?? freshBoard();
    if (cur0.turn === mySide) return;
    const t = setTimeout(() => {
      const cur = useBoards.getState().boards[id] ?? freshBoard();
      if (cur.turn === mySide) return;
      if (c.game === 'chess') {
        const g = new Chess(cur.fen);
        const mv = bestMove(g, levelFor(g.turn() === 'w' ? m.a : m.b));
        if (!mv) { if (g.isCheckmate()) finish(g.turn() === 'w' ? m.b : m.a); else finish(null, 'draw'); return; }
        const r = g.move(mv);
        commitChess(g, r.from, r.to, cur, m, r.color);
      } else {
        const mv = aiMove(cur.board, cur.turn, cur.cont, levelFor(cur.turn === 'r' ? m.a : m.b));
        if (!mv) { finish(cur.turn === 'r' ? m.b : m.a); return; }
        commitChecker(mv, cur, m);
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, board.n, board.turn]);

  if (!found) return <Navigate to='/arena' replace />;
  const { c, m } = found;
  if (m.a !== me.username && m.b !== me.username) return <Navigate to='/arena/live' replace />;

  const mySlot: 'a' | 'b' = m.a === me.username ? 'a' : 'b';
  const oppSlot: 'a' | 'b' = mySlot === 'a' ? 'b' : 'a';
  const oppName = mySlot === 'a' ? m.b : m.a;
  const opp = playerUser(oppName ?? '?');
  const live = m.status === 'live';
  const myTurn = live && board.turn === (mySlot === 'a' ? 'r' : 'b');

  const onChessMove = (mv: ChessMove): boolean => {
    if (m.status !== 'live') return false;
    const cur = useBoards.getState().boards[id] ?? freshBoard();
    const g = new Chess(cur.fen);
    try { const r = g.move(mv); commitChess(g, r.from, r.to, cur, m, r.color); return true; } catch { return false; }
  };
  const onCheckersMove = (mv: CMove) => {
    if (m.status !== 'live') return;
    commitChecker(mv, useBoards.getState().boards[id] ?? freshBoard(), m);
  };
  // window.confirm is blocked by many mobile browsers, so the confirmation is an in-app sheet.
  const resign = () => setAskResign(true);
  const confirmResign = () => {
    setAskResign(false);
    useArena.getState().forfeit(id, me.username);
    toast('You forfeited the match');
    goBack(nav, '/arena/' + c.id);
  };

  const result = m.result;
  const outcome = result ? (result.winner === me.username ? 'win' : result.winner === null ? 'draw' : 'loss') : null;
  const pos = c.kind === 'monthly' ? standings(c).findIndex((r) => r.user === me.username) + 1 : 0;
  const next = nextMatchFor(comps, me.username);
  const reasonText = result ? (result.reason === 'forfeit' ? ' by forfeit' : result.reason === 'no-show' ? ' (no show)' : '') : '';

  return (
    <div className='stage scroll'>
      <div className='stage-top'>
        <Link to={'/arena/' + c.id} className='stage-x' aria-label='Back'><ChevronLeft size={20} /></Link>
        {live && <span className='live-tag'>LIVE</span>}
        <span className='stage-title' style={{ textAlign: 'left' }}>{GAME_LABEL[c.game]} · {m.round}</span>
      </div>

      <div className='stage-cams dual'>
        <FaceCam user={opp} side={sideName(c.game, oppSlot)} active={live && !myTurn} />
        <span className='stage-vs'>VS</span>
        <FaceCam user={me} side={sideName(c.game, mySlot)} stream={cam.stream} mirror active={myTurn} camOff={!camOn} />
      </div>
      <div className='arena-sub'>{c.name}</div>

      <div className='stage-board'>
        {m.status === 'live' && c.game === 'chess' && <ChessBoard fen={board.fen} last={board.lastSq} onMove={onChessMove} side={mySlot === 'a' ? 'w' : 'b'} flip={mySlot === 'b'} />}
        {m.status === 'live' && c.game === 'checkers' && <CheckersBoard board={board.board} turn={board.turn} cont={board.cont} side={mySlot === 'a' ? 'r' : 'b'} onMove={onCheckersMove} />}
        {m.status === 'finished' && <SpectatorBoard game={c.game} bs={board} />}
        {m.status === 'invited' && (
          <div className='lobby'>
            <b>Waiting for {oppName ?? 'your opponent'} to accept...</b>
            <span className='small muted'>Match starts as soon as both players accept. Invitation ends in <Countdown to={m.inviteExpiresAt ?? null} /></span>
          </div>
        )}
        {m.status === 'scheduled' && (
          <div className='lobby'>
            <b>Your match starts in</b>
            <h1 className='gold'><Countdown to={m.startsAt} /></h1>
            <span className='small muted'>You will get an invitation automatically. Stay in the app.</span>
          </div>
        )}
      </div>

      {live && <div className={'turnbar' + (myTurn ? ' mine' : '')}>{myTurn ? 'Your turn (' + sideName(c.game, mySlot) + ')' : (oppName ?? 'Opponent') + ' is thinking...'}</div>}

      <div className='arena-controls'>
        <button className={'ctl' + (camOn ? ' on' : '')} onClick={() => setCamOn((v) => !v)}>{camOn ? <Video size={16} /> : <VideoOff size={16} />} Camera</button>
        <button className={'ctl' + (micOn ? ' on' : '')} onClick={() => setMicOn((v) => !v)}>{micOn ? <Mic size={16} /> : <MicOff size={16} />} Mic<span className='lvl'><i style={{ width: Math.round(Math.min(1, mic.level) * 100) + '%' }} /></span></button>
        {live && <button className='ctl danger' onClick={resign}>Resign</button>}
      </div>
      <p className='tiny tc' style={{ opacity: 0.6, padding: '8px 12px 14px' }}>Your face and voice go to your opponent peer-to-peer once the realtime backend is connected.</p>

      <ConfirmSheet
        open={askResign}
        title='Resign this match?'
        message={'If you resign, you will lose this match and ' + (oppName ?? 'your opponent') + ' wins.'}
        confirmLabel='OK'
        danger
        onCancel={() => setAskResign(false)}
        onConfirm={confirmResign}
      />

      <Sheet open={m.status === 'finished' && !askResign} onClose={() => undefined} title={outcome === 'win' ? '🏆 You won!' : outcome === 'draw' ? 'Draw' : 'You lost'}>
        <p className='muted mb8'>{result && result.winner ? result.winner + ' wins' + reasonText : 'The game ended in a draw'}</p>
        {c.kind === 'monthly' && pos > 0 && <p className='small mb8'>League position: <b className='gold'>{ordinal(pos)}</b></p>}
        {next ? (
          <p className='small mb12'>Next: <b>{next.comp.name}</b> · {next.match.round} {next.match.startsAt ? <>in <b className='gold'><Countdown to={next.match.startsAt} /></b></> : '(waiting for the opponent to be decided)'}</p>
        ) : (
          <p className='small mb12 muted'>{c.kind === 'championship' && outcome !== 'win' ? 'You are out of this championship.' : 'No more matches scheduled for you.'}</p>
        )}
        <div className='grid2'>
          <Button onClick={() => nav('/arena/' + c.id)}>{c.kind === 'monthly' ? 'View table' : 'View bracket'}</Button>
          <Button variant='ghost' onClick={() => nav('/arena')}>Arena home</Button>
        </div>
      </Sheet>
    </div>
  );
}
