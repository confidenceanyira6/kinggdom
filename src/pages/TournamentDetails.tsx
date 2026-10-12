import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Button, Coin, Empty, Loading, Tabs, TopBar, fmt } from '../components/ui';

type Tab = 'info' | 'players' | 'bracket';
const MEDAL: Record<string, string> = { '1st': '🥇', '2nd': '🥈', '3rd': '🥉' };

export default function TournamentDetails() {
  const { id = '' } = useParams();
  const toast = useApp((s) => s.toast);
  const { data: t, loading, setData } = useAsync(() => api.tournaments.get(id), [id]);
  const board = useAsync(() => api.leaderboard.get('global'));
  const [tab, setTab] = useState<Tab>('info');
  const [busy, setBusy] = useState(false);

  if (loading) return <div className='screen nonav'><Loading /></div>;
  if (!t) return <div className='screen nonav'><TopBar title='Tournament' /><Empty text='Tournament not found' /></div>;

  const join = async () => {
    setBusy(true);
    try { setData(await api.tournaments.join(t.id)); toast('You joined ' + t.name); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
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
      {t.status !== 'completed' && <Button full className='mt16' loading={busy} disabled={t.joined} onClick={join}>{t.joined ? 'Joined' : 'Join Tournament'}</Button>}
    </div>
  );
}
