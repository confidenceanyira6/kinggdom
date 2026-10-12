import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Loading, Tabs, TopBar, fmt } from '../components/ui';
import type { Period } from '../types';

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('global');
  const { data, loading } = useAsync(() => api.leaderboard.get(period), [period]);
  return (
    <div className='screen nonav'>
      <TopBar title='Leaderboard' />
      <Tabs<Period> tabs={[{ id: 'global', label: 'Global' }, { id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }]} value={period} onChange={setPeriod} />
      {period === 'monthly' && data && data[0] && <div className='hero mb12 tc'>👑 <b className='gold'>Crown holder</b><div className='small muted'>{data[0].user.username} leads the month. The monthly Kinggdom final crowns the champion.</div></div>}
      {loading ? <Loading /> : (
        <div className='card'>
          {(data ?? []).map((e) => (
            <Link key={e.user.id} to={'/u/' + e.user.username} className='list-row'>
              <span className={'rank r' + e.rank}>{e.rank}</span><Avatar name={e.user.name} size={38} /><b className='grow'>{e.user.username}</b><span className='bold'>{fmt(e.score)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
