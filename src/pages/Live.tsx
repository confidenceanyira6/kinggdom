import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Button, Loading, TopBar } from '../components/ui';
import { MatchCard } from '../components/MatchCard';

export default function Live() {
  const live = useAsync(() => api.matches.live());
  return (
    <div className='screen'>
      <TopBar title='Live' back={false} right={<Link to='/live/start'><Button sm><Video size={14} /> Go Live</Button></Link>} />
      <div className='section-title' style={{ marginTop: 4 }}><h3>Live Matches</h3></div>
      {live.loading ? <Loading /> : <div className='col gap8'>{(live.data ?? []).map((m) => <MatchCard key={m.id} match={m} />)}</div>}
      <div className='section-title'><h3>Streams</h3></div>
      <div className='col gap8'>
        {(live.data ?? []).map((m) => (
          <Link key={m.id} to={'/live/' + m.id} className='card'>
            <div className='video' style={{ minHeight: 110 }}><span className='live-tag tl'>LIVE</span><b>{m.title}</b></div>
            <div className='small muted mt8'>{m.white.username} vs {m.black.username}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
