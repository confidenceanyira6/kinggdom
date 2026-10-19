import { Link } from 'react-router-dom';
import { ChevronRight, Coins, Radio } from 'lucide-react';
import { useApp } from '../store/useApp';
import { TopBar, fmt } from '../components/ui';
import { Countdown } from '../arena/ui';
import { GAME_LABEL, fundOf, nextMatchFor, pickFeatured, playerUser, sideName, useArena } from '../arena/store';
import type { Competition } from '../arena/types';
import '../styles/arena-pages.css';

const icon = (c: Competition) => (c.game === 'chess' ? '♞' : '⛀');
const order = { live: 0, upcoming: 1, completed: 2 } as const;

export default function Arena() {
  const me = useApp((s) => s.user)!;
  const comps = useArena((s) => s.comps);
  const gifts = useArena((s) => s.gifts);
  const paid = useArena((s) => s.fundPaidOut);
  const official = useArena((s) => s.official);

  const fund = fundOf({ gifts, fundPaidOut: paid });
  const featured = official.live ? pickFeatured(comps, official) : null;
  const next = nextMatchFor(comps, me.username);
  const sorted = [...comps].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className='screen nonav'>
      <TopBar title='Arena' />

      <div className='card fund-card'>
        <span className='comp-ico'><Coins size={22} /></span>
        <div className='grow'>
          <div className='tiny muted'>Prize fund (from gifts to Kinggdom Official)</div>
          <div className='big'>{fmt(fund)} <span className='small muted'>tokens</span></div>
        </div>
      </div>

      <Link to='/arena/live' className={'onair mt12' + (featured ? '' : ' off')}>
        {featured ? (
          <>
            <div className='row gap8'>
              {featured.match.status === 'live' ? <span className='live-tag'>LIVE</span> : <span className='kpill'>UP NEXT</span>}
              <span className='tiny' style={{ opacity: 0.85 }}>{GAME_LABEL[featured.comp.game]} · {featured.match.round}</span>
            </div>
            <h3 className='mt8'>{featured.match.a} vs {featured.match.b}</h3>
            <div className='small' style={{ opacity: 0.85 }}>{featured.comp.name}{featured.match.status !== 'live' && featured.match.startsAt ? <> · starts in <Countdown to={featured.match.startsAt} /></> : null}</div>
            <span className='btn primary sm mt12'><Radio size={14} /> Watch official stream</span>
          </>
        ) : (
          <>
            <h3>Official stream is offline</h3>
            <p className='small muted mt8'>The admin starts the broadcast for featured matches. Check the schedule below.</p>
          </>
        )}
      </Link>

      {next && (
        <div className='card mt12'>
          <div className='tiny gold bold'>YOUR NEXT MATCH</div>
          <div className='row between mt8'>
            <div>
              <b>{next.match.a === me.username ? next.match.b ?? 'TBD' : next.match.a ?? 'TBD'}</b>
              <div className='tiny muted'>{next.comp.name} · {next.match.round} · you play {sideName(next.comp.game, next.match.a === me.username ? 'a' : 'b')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {next.match.status === 'live' || next.match.status === 'invited'
                ? <Link to={'/arena/match/' + next.match.id} className='btn primary sm'>Go to match</Link>
                : <b className='gold'>{next.match.startsAt ? <Countdown to={next.match.startsAt} /> : 'TBD'}</b>}
            </div>
          </div>
        </div>
      )}

      <div className='section-title'><h3>Competitions</h3></div>
      {comps.length === 0 && <div className='empty muted'>Loading competitions...</div>}
      {sorted.map((c) => {
        const done = c.matches.filter((m) => m.status === 'finished').length;
        return (
          <Link key={c.id} to={'/arena/' + c.id} className='card arena-card'>
            <div className='comp-row'>
              <span className='comp-ico' style={{ fontSize: 24 }}>{icon(c)}</span>
              <div className='grow'>
                <b>{c.name}</b>
                <div className='row gap8 mt4'>
                  <span className='kpill'>{c.kind === 'monthly' ? 'Monthly league' : 'Championship'}</span>
                  <span className={'kpill' + (c.status === 'live' ? ' live' : c.status === 'completed' ? ' done' : '')}>{c.status === 'live' ? 'LIVE' : c.status === 'completed' ? 'Finished' : 'Upcoming'}</span>
                </div>
                <div className='tiny muted mt4'>{c.players.length} players · {done}/{c.matches.length} matches · prize pool {fmt(c.prizePool)}</div>
              </div>
              <ChevronRight size={18} className='muted' />
            </div>
          </Link>
        );
      })}
      {gifts.length > 0 && <p className='tiny muted tc mt16'>{playerUser(gifts[0].from).username} just sent a {gifts[0].name} {gifts[0].emoji}</p>}
    </div>
  );
}
