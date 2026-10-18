import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Video } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Button, Loading, fmt } from '../components/ui';
import type { Match } from '../types';

type Tab = 'live' | 'games' | 'followed';

function LiveCard({ m }: { m: Match }) {
  const [f, setF] = useState(!!m.white.isFollowing);
  const bg = m.game === 'chess' ? 'linear-gradient(160deg,#0b3b3a,#14507a)' : 'linear-gradient(160deg,#3a1a3a,#0b3b3a)';
  const follow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setF((x) => !x);
    api.users.follow(m.white.username);
  };
  return (
    <Link to={'/live/' + m.id} className='live-card' style={{ background: bg }}>
      <div className='art'>{m.game === 'chess' ? '♞' : '⛀'}</div>
      <div className='lc-top'><span className='live-tag'>LIVE</span><span className='vpill'><Eye size={12} /> {fmt(m.viewers)}</span></div>
      <div className='lc-bot'>
        <Avatar name={m.white.name} size={38} ring />
        <div className='grow'><b className='small'>@{m.white.username} vs @{m.black.username}</b><div className='tiny' style={{ opacity: 0.8 }}>{m.title}</div></div>
        <Button sm onClick={follow}>{f ? 'Following' : 'Follow'}</Button>
      </div>
    </Link>
  );
}

export default function Live() {
  const live = useAsync(() => api.matches.live());
  const [tab, setTab] = useState<Tab>('live');
  const all = live.data ?? [];

  const tabs: { id: Tab; label: string }[] = [{ id: 'live', label: 'Live' }, { id: 'games', label: 'Games' }, { id: 'followed', label: 'Followed' }];
  const followed = all.filter((m) => m.white.isFollowing || m.black.isFollowing);

  return (
    <div className='screen'>
      <header className='topbar'>
        <h1>Live Streams</h1>
        <Link to='/live/start'><Button sm><Video size={14} /> Go Live</Button></Link>
      </header>
      <div className='utabs'>{tabs.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {live.loading ? <Loading /> : tab === 'live' ? (
        all.map((m) => <LiveCard key={m.id} m={m} />)
      ) : tab === 'games' ? (
        (['chess', 'checkers'] as const).map((g) => {
          const ms = all.filter((m) => m.game === g);
          return ms.length ? (
            <div key={g}>
              <div className='section-title' style={{ marginTop: 4 }}><h3>{g === 'chess' ? 'Chess' : 'Checkers'}</h3></div>
              {ms.map((m) => <LiveCard key={m.id} m={m} />)}
            </div>
          ) : null;
        })
      ) : followed.length ? (
        followed.map((m) => <LiveCard key={m.id} m={m} />)
      ) : (
        <div className='empty muted'>None of the players you follow are live right now.</div>
      )}
    </div>
  );
}
