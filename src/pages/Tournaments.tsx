import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Button, Empty, Loading, Tabs, TopBar, fmt } from '../components/ui';
import { JoinSheet } from '../components/JoinSheet';
import type { Tournament } from '../types';

type Tab = 'daily' | Tournament['status'];

export default function Tournaments() {
  const [tab, setTab] = useState<Tab>('daily');
  const [joining, setJoining] = useState<Tournament | null>(null);
  const { data, loading, reload } = useAsync(() => api.tournaments.list(), []);
  const list = (data ?? []).filter((t) => (tab === 'daily' ? t.scope === 'daily' && t.status !== 'completed' : t.status === tab));

  return (
    <div className='screen nonav'>
      <TopBar title='Tournaments' right={<Link to='/tournaments/new' className='icon-btn'><Plus size={18} /></Link>} />
      <Tabs<Tab> tabs={[{ id: 'daily', label: 'Daily' }, { id: 'live', label: 'Live' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'completed', label: 'Completed' }]} value={tab} onChange={setTab} />
      {loading ? <Loading /> : list.length === 0 ? <Empty text={tab === 'daily' ? 'No daily competition open right now' : 'No tournaments here'} /> : list.map((t) => (
        <div key={t.id} className='card row gap12'>
          <span style={{ fontSize: 34 }}>{t.game === 'chess' ? '🏆' : '🥇'}</span>
          <Link to={'/tournaments/' + t.id} className='grow'>
            <b>{t.name}</b>
            <div className='small gold'>Prize pool {fmt(t.prizePool)}</div>
            <div className='tiny muted'>{t.status === 'completed' ? 'Ended' : 'Starts in ' + t.startsIn} · {t.players}/{t.maxPlayers} players</div>
            <div className='tiny muted'>{t.entryFee ? 'Entry ' + fmt(t.entryFee) + ' tokens' : 'Free entry'}</div>
          </Link>
          {t.status !== 'completed' && <Button sm variant={t.joined ? 'ghost' : 'primary'} disabled={t.joined} onClick={() => setJoining(t)}>{t.joined ? 'Joined' : 'Join'}</Button>}
        </div>
      ))}
      {joining && <JoinSheet t={joining} open onClose={() => setJoining(null)} onJoined={() => { setJoining(null); reload(); }} />}
    </div>
  );
}
