/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';
import type { ChessMove } from '../components/ChessBoard';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Avatar, Button, Sheet, Spinner, TopBar } from '../components/ui';
import { supabase, callFunction } from '../lib/supabase';
import { goBack } from '../lib/nav';
import { api } from '../services/api';
import { useApp } from '../store/useApp';

type Row = Record<string, any>;

/** Pull the real message out of a failed edge function call. */
async function errMsg(e: unknown): Promise<string> {
  const ctx = (e as any)?.context;
  try {
    if (ctx?.json) {
      const b = await ctx.json();
      if (b?.error) return String(b.error);
    }
  } catch { /* fall through */ }
  return (e as Error)?.message ?? 'Something went wrong.';
}

async function findActiveGame(me: string, since: number): Promise<string | null> {
  const { data } = await supabase.from('games').select('id,created_at')
    .eq('game_type', 'chess').eq('status', 'active').in('mode', ['random', 'online', 'friend'])
    .or('white_id.eq.' + me + ',black_id.eq.' + me)
    .gte('created_at', new Date(since).toISOString())
    .order('created_at', { ascending: false }).limit(1);
  return data?.[0]?.id ?? null;
}

function Bar({ name, sub, active }: { name: string; sub: string; active: boolean }) {
  return (
    <div className='player-bar'>
      <Avatar name={name} size={36} ring={active} />
      <div className='grow'><b>{name}</b><div className='tiny muted'>{sub}</div></div>
      {active && <span className='pill'>TURN</span>}
    </div>
  );
}

/**
 * Real online chess. The server owns the game: moves go through the
 * `submit-move` edge function, results/Elo are applied server-side, and the
 * board follows the `games` / `game_moves` realtime feed.
 */
export default function OnlineChess() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const urlId = sp.get('id');
  const setTokens = useApp((s) => s.setTokens);
  const toast = useApp((s) => s.toast);
  const [gameId, setGameId] = useState<string | null>(urlId);
  const [g, setG] = useState<Row | null>(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [names, setNames] = useState<{ white: string; black: string }>({ white: 'White', black: 'Black' });
  const [me, setMe] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'resign' | 'abort' | null>(null);
  const [ending, setEnding] = useState(false);
  const found = useRef(!!urlId);
  const rewarded = useRef(false);

  // 1) Matchmaking (skipped when opening a specific game with ?id=)
  useEffect(() => {
    if (urlId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        if (!uid) throw new Error('Please log in again.');
        setMe(uid);
        const since = Date.now() - 30000;
        const r = await supabase.rpc('join_matchmaking', { p_type: 'chess', p_time: 600, p_inc: 0, p_rated: true });
        if (r.error) throw new Error(r.error.message);
        const d: any = r.data;
        const direct = d?.game_id ?? d?.gameId ?? d?.game?.id;
        if (direct) { found.current = true; setGameId(direct); return; }
        const poll = async () => {
          if (stop) return;
          const id = await findActiveGame(uid, since);
          if (id) { found.current = true; setGameId(id); return; }
          timer = setTimeout(poll, 2500);
        };
        poll();
      } catch (e) { setErr((e as Error).message); }
    })();
    return () => {
      stop = true;
      clearTimeout(timer);
      if (!found.current) void supabase.rpc('leave_matchmaking');
    };
  }, [urlId]);

  // 2) Load + follow the game
  const load = useCallback(async (id: string) => {
    const gr = await supabase.from('games').select('*').eq('id', id).single();
    if (gr.error) throw new Error(gr.error.message);
    const row = gr.data as Row;
    const mv = await supabase.from('game_moves').select('ply,notation,from_sq,to_sq').eq('game_id', id).order('ply');
    const moves = (mv.data ?? []) as Row[];
    let c: Chess;
    try { c = new Chess(row.state); } catch {
      c = new Chess();
      for (const m of moves) c.move(m.notation);
    }
    const lm = moves[moves.length - 1];
    setG(row);
    setFen(c.fen());
    setLast(lm?.from_sq && lm?.to_sq ? { from: lm.from_sq, to: lm.to_sq } : null);
  }, []);

  useEffect(() => {
    if (!gameId) return;
    let dead = false;
    const safe = () => { load(gameId).catch((e) => !dead && setErr((e as Error).message)); };
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) setMe(u.user.id);
      safe();
      const gr = await supabase.from('games').select('white_id,black_id').eq('id', gameId).maybeSingle();
      const ids = [gr.data?.white_id, gr.data?.black_id].filter(Boolean) as string[];
      if (ids.length) {
        const ps = await supabase.from('profiles').select('id,username,display_name').in('id', ids);
        const nm = (id?: string) => { const p = (ps.data ?? []).find((x: Row) => x.id === id); return p ? p.display_name || p.username : 'Player'; };
        if (!dead) setNames({ white: nm(gr.data?.white_id), black: nm(gr.data?.black_id) });
      }
    })();
    const ch = supabase.channel('game-' + gameId)
      .on('postgres_changes', { event: '*', schema: 'kingdom', table: 'games', filter: 'id=eq.' + gameId }, safe)
      .on('postgres_changes', { event: 'INSERT', schema: 'kingdom', table: 'game_moves', filter: 'game_id=eq.' + gameId }, safe)
      .subscribe();
    const poll = setInterval(safe, 5000); // safety net if realtime drops
    return () => { dead = true; clearInterval(poll); void supabase.removeChannel(ch); };
  }, [gameId, load]);

  const mySide: 'w' | 'b' | null = g && me ? (g.white_id === me ? 'w' : g.black_id === me ? 'b' : null) : null;
  const turn = new Chess(fen).turn();
  const ended = g && (g.status === 'finished' || g.status === 'aborted');

  useEffect(() => {
    if (ended && !rewarded.current) {
      rewarded.current = true;
      api.wallet.get().then((w) => setTokens(w.tokens)).catch(() => undefined);
    }
  }, [ended, setTokens]);

  const onMove = (m: ChessMove): boolean => {
    if (!g || g.status !== 'active' || busy || !mySide || turn !== mySide) return false;
    const c = new Chess(fen);
    try { c.move(m); } catch { return false; }
    setFen(c.fen());
    setLast({ from: m.from, to: m.to });
    setBusy(true);
    callFunction('submit-move', { game_id: g.id, from: m.from, to: m.to, promotion: m.promotion })
      .catch(async (e) => setErr(await errMsg(e)))
      .finally(async () => { try { await load(g.id); } catch { /* realtime will resync */ } setBusy(false); });
    return true;
  };

  const act = async (fn: string, args: Record<string, unknown>): Promise<boolean> => {
    setErr('');
    const r = await supabase.rpc(fn, args);
    if (r.error) { setErr(r.error.message); toast(r.error.message); return false; }
    if (gameId) await load(gameId).catch(() => undefined);
    return true;
  };

  // Resign / abort: confirm in-app (window.confirm is blocked on many phones), then leave the match
  // and return to the page the player was on before it started.
  const confirmEnd = async () => {
    if (!g || !confirm) return;
    const kind = confirm;
    setEnding(true);
    const done = await act(kind === 'resign' ? 'resign_game' : 'abort_game', { p_game: g.id });
    setEnding(false);
    setConfirm(null);
    if (!done) return;
    toast(kind === 'resign' ? 'You resigned the match' : 'Match aborted');
    api.wallet.get().then((w) => setTokens(w.tokens)).catch(() => undefined);
    goBack(nav);
  };

  if (err && !g) return <div className='screen nonav'><TopBar title='Online Chess' /><div className='col center gap12' style={{ minHeight: '50vh' }}><p className='red'>{err}</p><Button onClick={() => nav('/play')}>Back</Button></div></div>;
  if (!g) return (
    <div className='screen nonav'>
      <TopBar title='Online Chess' />
      <div className='col center gap12' style={{ minHeight: '60vh' }}>
        <Spinner /><b>Finding an opponent...</b>
        <Button variant='ghost' onClick={() => nav('/play')}>Cancel</Button>
      </div>
    </div>
  );

  const meName = mySide === 'b' ? names.black : names.white;
  const oppName = mySide === 'b' ? names.white : names.black;
  const oppSide = mySide === 'b' ? 'w' : 'b';
  const mySideWord = mySide === 'b' ? 'black' : 'white';
  const drawFromOpp = g.draw_offered_by && g.draw_offered_by !== mySideWord;
  const iWon = g.winner_id && g.winner_id === me;
  const outcome = g.status === 'aborted' ? 'Game aborted' : g.result === 'draw' ? 'Draw' : iWon ? '🏆 You won!' : 'You lost';
  const reason = String(g.result_reason ?? '').replace(/_/g, ' ');

  return (
    <div className='screen nonav'>
      <TopBar title='Online Chess' />
      <Bar name={oppName} sub={oppSide === 'w' ? 'White' : 'Black'} active={g.status === 'active' && turn === oppSide} />
      <ChessBoard fen={fen} onMove={onMove} side={mySide ?? 'w'} flip={mySide === 'b'} last={last} />
      <Bar name={meName} sub={mySide === 'b' ? 'Black' : 'White'} active={g.status === 'active' && turn === mySide} />
      {err && <p className='red small tc'>{err}</p>}
      {g.status === 'active' && mySide && (
        <div className='grid2 mt8'>
          {g.move_count < 2
            ? <Button variant='ghost' onClick={() => setConfirm('abort')}>Abort</Button>
            : <Button variant='danger' onClick={() => setConfirm('resign')}>Resign</Button>}
          {drawFromOpp
            ? <Button onClick={() => act('respond_draw', { p_game: g.id, p_accept: true })}>Accept draw</Button>
            : <Button variant='ghost' onClick={() => act('offer_draw', { p_game: g.id })}>{g.draw_offered_by === mySideWord ? 'Draw offered' : 'Offer draw'}</Button>}
        </div>
      )}
      {drawFromOpp && g.status === 'active' && <Button variant='ghost' full onClick={() => act('respond_draw', { p_game: g.id, p_accept: false })}>Decline draw</Button>}

      <ConfirmSheet
        open={confirm !== null}
        title={confirm === 'abort' ? 'Abort this match?' : 'Resign this match?'}
        message={confirm === 'abort' ? 'The game will be cancelled with no rating change.' : 'If you resign, you will lose this match.'}
        confirmLabel='OK'
        danger
        busy={ending}
        onCancel={() => setConfirm(null)}
        onConfirm={confirmEnd}
      />

      <Sheet open={!!ended && confirm === null} onClose={() => undefined} title={outcome}>
        {reason && <p className='muted mb12' style={{ textTransform: 'capitalize' }}>{reason}</p>}
        {g.rated && g.status === 'finished' && mySide && (
          <p className='gold bold mb12'>Rating {(mySide === 'w' ? g.white_rating_change : g.black_rating_change) >= 0 ? '+' : ''}{(mySide === 'w' ? g.white_rating_change : g.black_rating_change) ?? 0}</p>
        )}
        <div className='grid2'>
          <Button onClick={() => { window.location.href = '/game/chess?mode=online'; }}>Play again</Button>
          <Button variant='ghost' onClick={() => goBack(nav, '/play')}>Exit</Button>
        </div>
      </Sheet>
    </div>
  );
}
