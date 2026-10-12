import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Button, Empty, Loading, Tabs, TopBar, fmt } from '../components/ui';
import type { Tournament } from '../types';

type Tab = Tournament['status'];

export default function Tournaments() {
  const toast = useApp((s) => s.toast);
  const [tab, setTab] = useState<Tab>('upcoming');
  const { data, loading, reload } = useAsync(() => api.tournaments.list(), []);
  const list = (data ?? []).filter((t) => t.status === tab);

  const join = async (id: string) => {
    try { await api.tournaments.join(id); toast('You are in!'); reload(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Tournaments' right={<Link to='/tournaments/new' className='icon-btn'><Plus size={18} /></Link>} />
      <Tabs<Tab> tabs={[{ id: 'live', label: 'Live' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'completed', label: 'Completed' }]} value={tab} onChange={setTab} />
      {loading ? <Loading /> : list.length === 0 ? <Empty text='No tournaments here' /> : list.map((t) => (
        <div key={t.id} className='card row gap12'>
          <span style={{ fontSize: 34 }}>{t.game === 'chess' ? '🏆' : '🥇'}</span>
          <Link to={'/tournaments/' + t.id} className='grow'><b>{t.name}</b><div className='small gold'>Prize pool {fmt(t.prizePool)}</div><div className='tiny muted'>{t.status === 'completed' ? 'Ended' : 'Starts in ' + t.startsIn} · {t.players}/{t.maxPlayers} players</div></Link>
          {t.status !== 'completed' && <Button sm variant={t.joined ? 'ghost' : 'primary'} disabled={t.joined} onClick={() => join(t.id)}>{t.joined ? 'Joined' : 'Join'}</Button>}
        </div>
      ))}
    </div>
  );
}
