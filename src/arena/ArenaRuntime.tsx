import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Flag } from 'lucide-react';
import { useApp } from '../store/useApp';
import { Avatar, Button } from '../components/ui';
import { Countdown } from './ui';
import { GAME_LABEL, playerUser, sideName, useArena } from './store';
import '../styles/arena.css';

/**
 * Mounted once for the whole app. Runs the competition clock (invitations go out automatically
 * when a match time arrives) and shows the Accept / Forfeit invitation to the signed-in player.
 * It never creates sample competitions or sample players: only competitions created in the
 * admin panel exist.
 */
export function ArenaRuntime() {
  const me = useApp((s) => s.user);
  const nav = useNavigate();
  const loc = useLocation();
  const comps = useArena((s) => s.comps);
  const [confirming, setConfirming] = useState(false);
  const username = me ? me.username : null;

  // Remove any sample competitions / gifts / players an earlier version stored on this device.
  useEffect(() => {
    const s = useArena.getState();
    if (s.seededFor !== null) {
      useArena.setState({
        seededFor: null, seededAt: 0, comps: [], gifts: [], fundPaidOut: 0,
        official: { live: false, title: 'Kinggdom Official Arena', featuredMatchId: null, startedAt: null },
      });
    }
  }, []);

  useEffect(() => {
    if (!username) return;
    const t = setInterval(() => useArena.getState().tick(Date.now(), username), 1000);
    return () => clearInterval(t);
  }, [username]);

  const invite = username
    ? comps.flatMap((c) => c.matches.map((m) => ({ c, m }))).find(({ m }) => m.status === 'invited' && ((m.a === username && !m.accepted.a) || (m.b === username && !m.accepted.b)))
    : undefined;
  const inviteId = invite ? invite.m.id : null;

  useEffect(() => {
    if (inviteId && navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setConfirming(false);
  }, [inviteId]);

  if (!username || !invite) return null;
  if (loc.pathname === '/' || loc.pathname === '/login' || loc.pathname === '/signup') return null;
  const { c, m } = invite;
  const mySlot: 'a' | 'b' = m.a === username ? 'a' : 'b';
  const oppName = mySlot === 'a' ? m.b : m.a;
  const opp = oppName ? playerUser(oppName) : null;
  const mine = sideName(c.game, mySlot);
  const theirs = sideName(c.game, mySlot === 'a' ? 'b' : 'a');

  const accept = () => {
    useArena.getState().accept(m.id, username);
    nav('/arena/match/' + m.id);
  };
  // The confirmation is drawn inside this card (not window.confirm, which mobile browsers can block).
  // After OK the invitation closes and the player stays on the page they were already on.
  const forfeit = () => {
    useArena.getState().forfeit(m.id, username);
    setConfirming(false);
    useApp.getState().toast('You forfeited the match');
    if (loc.pathname.startsWith('/arena/match/' + m.id)) nav('/arena', { replace: true });
  };

  return (
    <div className='invite-back'>
      <div className='invite'>
        {confirming ? (
          <>
            <div className='tiny gold bold'>FORFEIT MATCH</div>
            <h2 style={{ margin: '6px 0 2px' }}>Forfeit this match?</h2>
            <p className='small muted mt8'>If you forfeit, you will lose this match and {oppName ?? 'your opponent'} will get the win.</p>
            <div className='grid2 mt16'>
              <Button variant='ghost' onClick={() => setConfirming(false)}>Go back</Button>
              <Button variant='danger' onClick={forfeit}>OK</Button>
            </div>
          </>
        ) : (
          <>
            <div className='tiny gold bold'>MATCH INVITATION · {GAME_LABEL[c.game].toUpperCase()}</div>
            <h2 style={{ margin: '6px 0 2px' }}>Your match is starting!</h2>
            <p className='small muted'>{c.name} · {m.round}</p>
            <div className='row center gap16 mt16'>
              <div className='col center gap4'><Avatar name={username} size={56} ring /><b className='small'>You</b><span className={'side-chip ' + mine.toLowerCase()}><i />{mine}</span></div>
              <b className='gold' style={{ fontSize: 20 }}>VS</b>
              <div className='col center gap4'><Avatar name={opp ? opp.name : '?'} size={56} /><b className='small'>{oppName ?? 'TBD'}</b><span className={'side-chip ' + theirs.toLowerCase()}><i />{theirs}</span></div>
            </div>
            <p className='small mt16'>Respond in <b className='gold'><Countdown to={m.inviteExpiresAt ?? null} /></b> or you forfeit.</p>
            <div className='grid2 mt16'>
              <Button onClick={accept}><Check size={16} /> Accept</Button>
              <Button variant='danger' onClick={() => setConfirming(true)}><Flag size={16} /> Forfeit</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
