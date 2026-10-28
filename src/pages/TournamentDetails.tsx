import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useFeePct } from '../hooks/useFeePct';
import { Avatar, Button, Coin, Empty, Loading, Tabs, TopBar, fmt } from '../components/ui';
import { JoinSheet } from '../components/JoinSheet';

type Tab = 'info' | 'players' | 'bracket';
const MEDAL: Record<string, string> = { '1st': '🥇', '2nd': '🥈', '3rd': '🥉' };

export default function TournamentDetails() {
  const { id = '' } = useParams();
  const { data: t, loading, setData } = useAsync(() => api.tournaments.get(id), [id]);
  const board = useAsync(() => api.leaderboard.get('global'));
  const pct = useFeePct();
  const [tab, setTab] = useState<Tab>('info');
  const [ask, setAsk] = useState(false);

  if (loading) return <div className='screen nonav'><Loading /></div>;
  if (!t) return <div className='screen nonav'><TopBar title='Tournament' /><Empty text='Tournament not found' /></div>;

  const p = (board.data ?? []).map((e) => e.user.username);
  const rounds = [
    { name: 'Quarter-finals', m: [[p[0], p[6]], [p[1], p[5]], [p[2], p[4]], [p[3], 'TBD']] },
    { name: 'Semi-finals', m: [[p[0], p[1]], [p[2], p[3]]] },
    { name: 'Final', m: [['TBD', 'TBD']] },
  ];

  return (
    <div className='screen nonav'>
      <TopBar title='Tournament Details' />
      <div className='hero row gap12'>
        <span style={{ fontSize: 44 }}>🏆</span>
        <div><h2>{t.name}</h2><div className='small muted'>{t.game === 'chess' ? 'Chess' : 'Checkers'} · {t.maxPlayers} players</div><div className='gold bold small'>Prize pool {fmt(t.prizePool)} tokens</div><div className='tiny muted'>{t.status === 'completed' ? 'Ended' : 'Starts in ' + t.startsIn}</div></div>
      </div>
      {t.host && (
        <div className='card mt12'>
          <div className='small'>Hosted by <Link to={'/u/' + t.host.username} className='bold'>@{t.host.username}</Link></div>
          {pct !== null && <div className='tiny muted mt8'>Platform fee: Kinggdom keeps {pct}% of entry fees ({t.entryFee ? 'the rest goes to the prize pool' : 'this competition is free to enter'}) and {pct}% of gifts the host receives while live with a competition.</div>}
        </div>
      )}
      <div className='progress mt12'><i style={{ width: (t.players / t.maxPlayers) * 100 + '%' }} /></div>
      <div className='tiny muted mt8'>{t.players}/{t.maxPlayers} registered · Entry {t.entryFee ? t.entryFee + ' tokens' : 'free'}</div>
      <Tabs<Tab> tabs={[{ id: 'info', label: 'Info' }, { id: 'players', label: 'Players' }, { id: 'bracket', label: 'Bracket' }]} value={tab} onChange={setTab} />
      {tab === 'info' && (
        <>
          <div className='card'><b>Description</b><p className='small muted mt8'>{t.description}</p></div>
          <div className='card'><b>Rewards</b>{t.rewards.map((r) => <div key={r.place} className='list-row'><span>{MEDAL[r.place]}</span><b className='grow small'>{r.place}</b><span className='gold bold row gap4'><Coin />{fmt(r.tokens)} Tokens</span></div>)}</div>
        </>
      )}
      {tab === 'players' && <div className='card'>{(board.data ?? []).map((e) => <div key={e.user.id} className='list-row'><Avatar name={e.user.name} size={34} /><b className='grow'>{e.user.username}</b><span className='small muted'>{e.user.rating}</span></div>)}</div>}
      {tab === 'bracket' && <div className='bracket'>{rounds.map((r) => <div key={r.name} className='rnd'><div className='tiny muted'>{r.name}</div>{r.m.map((m, i) => <div key={i} className='m'>{m[0] ?? 'TBD'}<br />{m[1] ?? 'TBD'}</div>)}</div>)}</div>}
      {t.status !== 'completed' && <Button full className='mt16' disabled={t.joined} onClick={() => setAsk(true)}>{t.joined ? 'Joined' : t.entryFee ? 'Join · ' + fmt(t.entryFee) + ' tokens' : 'Join free'}</Button>}
      <JoinSheet t={t} open={ask} onClose={() => setAsk(false)} onJoined={(nt) => { setData(nt); setAsk(false); }} />
    </div>
  );
}
