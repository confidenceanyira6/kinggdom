import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../store/useApp';
import { Avatar, Empty, Tabs, TopBar, fmt } from '../components/ui';
import { Countdown, fmtTime } from '../arena/ui';
import { GAME_LABEL, pickFeatured, standings, useArena } from '../arena/store';
import type { ArenaMatch } from '../arena/types';
import '../styles/arena.css';
import '../styles/arena-pages.css';

type Tab = 'main' | 'schedule' | 'prizes';

const score = (m: ArenaMatch) => {
  const r = m.result;
  if (!r) return '';
  if (r.winner === null) return r.reason === 'draw' ? '½ - ½' : '0 - 0';
  return r.winner === m.a ? '1 - 0' : '0 - 1';
};
const why = (m: ArenaMatch) => (m.result && m.result.reason === 'forfeit' ? 'Forfeit' : m.result && m.result.reason === 'no-show' ? 'No show' : '');

export default function ArenaCompetition() {
  const { compId = '' } = useParams();
  const me = useApp((s) => s.user)!;
  const comps = useArena((s) => s.comps);
  const official = useArena((s) => s.official);
  const [tab, setTab] = useState<Tab>('main');

  const comp = comps.find((c) => c.id === compId);
  if (!comp) return <div className='screen nonav'><TopBar title='Competition' /><Empty text='Competition not found' /></div>;

  const featured = official.live ? pickFeatured(comps, official) : null;
  const featuredId = featured ? featured.match.id : null;
  const rounds = Array.from(new Set(comp.matches.map((m) => m.round)));
  const nm = (u: string | null) => (u ? (u === me.username ? 'You' : u) : 'TBD');

  const table = () => {
    const rows = standings(comp);
    return (
      <div className='card tbl-wrap'>
        <table className='table'>
          <thead><tr><th>#</th><th className='pl'>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th><th>Form</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.user} className={r.user === me.username ? 'me' : ''}>
                <td><span className={'pos' + (i < 3 ? ' p' + (i + 1) : '')}>{i + 1}</span></td>
                <td className='pl'><div className='row gap8'><Avatar name={r.user} size={24} /><b className='small'>{r.user}</b>{r.live && <span className='livedot' />}</div></td>
                <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td className='pts'>{r.pts}</td>
                <td><span className='form'>{r.form.map((f, k) => <i key={k} className={f}>{f}</i>)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className='tiny muted mt8'>Win 3 points, draw 1, loss 0. Updates automatically when a match ends.</p>
      </div>
    );
  };

  const bracket = () => (
    <div className='brk'>
      {rounds.map((rd) => (
        <div key={rd} className='brk-col'>
          <h4>{rd}</h4>
          {comp.matches.filter((m) => m.round === rd).map((m) => {
            const w = m.result ? m.result.winner : null;
            return (
              <div key={m.id} className={'brk-m' + (m.status === 'live' ? ' live' : '')}>
                <div><span className={m.a ? '' : 'tbd'}>{m.a ? nm(m.a) : 'TBD'}</span>{m.status === 'finished' ? <b className={w === m.a ? 'win' : ''}>{w === m.a ? 1 : 0}</b> : null}</div>
                <div><span className={m.b ? '' : 'tbd'}>{m.b ? nm(m.b) : 'TBD'}</span>{m.status === 'finished' ? <b className={w === m.b ? 'win' : ''}>{w === m.b ? 1 : 0}</b> : null}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const schedule = () => rounds.map((rd) => (
    <div key={rd}>
      <div className='section-title'><h3>{rd}</h3></div>
      <div className='card'>
        {comp.matches.filter((m) => m.round === rd).map((m) => {
          const mine = m.a === me.username || m.b === me.username;
          const playable = mine && (m.status === 'live' || m.status === 'invited');
          return (
            <div key={m.id} className={'sched-row' + (mine ? ' mine' : '')}>
              <div className='sched-time'>
                {m.status === 'finished' ? 'FT' : m.status === 'live' ? <span className='live-tag'>LIVE</span> : m.status === 'invited' ? <b className='gold'>Invited</b> : m.startsAt ? <><b><Countdown to={m.startsAt} /></b><div className='tiny'>{fmtTime(m.startsAt)}</div></> : 'TBD'}
              </div>
              <div className='sched-vs'>
                <div>{nm(m.a)} <span className='muted'>vs</span> {nm(m.b)}</div>
                {why(m) && <span className='tiny muted'>{why(m)}</span>}
              </div>
              {playable ? <Link to={'/arena/match/' + m.id} className='btn primary sm'>Play</Link>
                : m.status === 'live' && m.id === featuredId ? <Link to='/arena/live' className='btn ghost sm'>Watch</Link>
                : <div className='score'>{score(m)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  ));

  const prizes = () => (
    <div className='card'>
      {comp.prizes.map((p, i) => (
        <div key={i} className='list-row'>
          <b className='small' style={{ width: 92 }}>{p.place}</b>
          <div className='grow'><b className='gold'>{fmt(p.tokens)}</b> <span className='tiny muted'>tokens</span></div>
          <span className='small'>{p.to ? p.to : 'TBD'}</span>
          {p.paid && <span className='kpill'>Paid</span>}
        </div>
      ))}
      <p className='tiny muted mt8'>Prizes are paid by the admin from the gift fund after the competition ends.</p>
    </div>
  );

  return (
    <div className='screen nonav'>
      <TopBar title={comp.name} />
      <p className='small muted mb8'>{GAME_LABEL[comp.game]} · {comp.kind === 'monthly' ? 'Monthly league' : 'Knockout championship'} · {comp.players.length} players</p>
      <Tabs<Tab> tabs={[{ id: 'main', label: comp.kind === 'monthly' ? 'Table' : 'Bracket' }, { id: 'schedule', label: 'Schedule' }, { id: 'prizes', label: 'Prizes' }]} value={tab} onChange={setTab} />
      {tab === 'main' && (comp.kind === 'monthly' ? table() : bracket())}
      {tab === 'schedule' && schedule()}
      {tab === 'prizes' && prizes()}
    </div>
  );
}
