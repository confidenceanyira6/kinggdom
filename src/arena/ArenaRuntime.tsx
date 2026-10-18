import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Flag } from 'lucide-react';
import { useApp } from '../store/useApp';
import { Avatar, Button } from '../components/ui';
import { Countdown } from './ui';
import { playerUser, useArena } from './store';
import '../styles/arena.css';

/**
 * Mounted once for the whole app. Runs the competition clock (invitations go out automatically
 * when a match time arrives) and shows the Accept / Forfeit invitation to the signed-in player.
 */
export function ArenaRuntime() {
  const me = useApp((s) => s.user);
  const nav = useNavigate();
  const loc = useLocation();
  const comps = useArena((s) => s.comps);
  const username = me ? me.username : null;

  useEffect(() => {
    if (me) useArena.getState().init(me);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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
  }, [inviteId]);

  if (!username || !invite) return null;
  if (loc.pathname === '/' || loc.pathname === '/login' || loc.pathname === '/signup') return null;
  const { c, m } = invite;
  const oppName = m.a === username ? m.b : m.a;
  const opp = oppName ? playerUser(oppName) : null;
  const mySide = m.a === username ? 'Red' : 'Black';

  const accept = () => {
    useArena.getState().accept(m.id, username);
    nav('/arena/match/' + m.id);
  };
  const forfeit = () => {
    if (!window.confirm('Forfeit this match? ' + (oppName ?? 'Your opponent') + ' will get the win.')) return;
    useArena.getState().forfeit(m.id, username);
  };

  return (
    <div className='invite-back'>
      <div className='invite'>
        <div className='tiny gold bold'>MATCH INVITATION</div>
        <h2 style={{ margin: '6px 0 2px' }}>Your match is starting!</h2>
        <p className='small muted'>{c.name} · {m.round}</p>
        <div className='row center gap16 mt16'>
          <div className='col center gap4'><Avatar name={username} size={56} ring /><b className='small'>You</b><span className={'side-chip ' + mySide.toLowerCase()}><i />{mySide}</span></div>
          <b className='gold' style={{ fontSize: 20 }}>VS</b>
          <div className='col center gap4'><Avatar name={opp ? opp.name : '?'} size={56} /><b className='small'>{oppName ?? 'TBD'}</b><span className={'side-chip ' + (mySide === 'Red' ? 'black' : 'red')}><i />{mySide === 'Red' ? 'Black' : 'Red'}</span></div>
        </div>
        <p className='small mt16'>Respond in <b className='gold'><Countdown to={m.inviteExpiresAt ?? null} /></b> or you forfeit.</p>
        <div className='grid2 mt16'>
          <Button onClick={accept}><Check size={16} /> Accept</Button>
          <Button variant='danger' onClick={forfeit}><Flag size={16} /> Forfeit</Button>
        </div>
      </div>
    </div>
  );
}
