import { Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Loading, fmt } from '../components/ui';
import { MatchCard } from '../components/MatchCard';
import { trending } from '../data/mock';

export default function Discover() {
  const nav = useNavigate();
  const live = useAsync(() => api.matches.live());
  const tours = useAsync(() => api.tournaments.list('upcoming'));
  const top = useAsync(() => api.leaderboard.get('global'));

  return (
    <div className='screen'>
      <header className='topbar'><h1>Discover</h1></header>
      <button className='card row gap8 muted' style={{ width: '100%', padding: 12 }} onClick={() => nav('/search')}><SearchIcon size={16} /> Search users, streamers, games...</button>

      <div className='section-title'><h3>Popular Games</h3></div>
      <div className='grid2'>
        <Link to='/play/chess' className='card tc'><div style={{ fontSize: 34 }}>♞</div><b>Chess</b><div className='tiny muted'>12.4k playing</div></Link>
        <Link to='/play/checkers' className='card tc' style={{ marginTop: 0 }}><div style={{ fontSize: 34 }}>⛀</div><b>Checkers</b><div className='tiny muted'>5.4k playing</div></Link>
      </div>

      <div className='section-title'><h3>Live Matches</h3><Link to='/live' className='link small'>See All</Link></div>
      {live.loading ? <Loading /> : <div className='col gap8'>{(live.data ?? []).map((m) => <MatchCard key={m.id} match={m} />)}</div>}

      <div className='section-title'><h3>Trending</h3></div>
      <div className='row wrap gap8'>{trending.map((t) => <button key={t} className='chip' onClick={() => nav('/search?q=' + t.slice(1))}>{t}</button>)}</div>

      <div className='section-title'><h3>Upcoming Tournaments</h3><Link to='/tournaments' className='link small'>See All</Link></div>
      <div className='hscroll'>
        {(tours.data ?? []).map((t) => (
          <Link key={t.id} to={'/tournaments/' + t.id} className='card' style={{ minWidth: 190 }}>
            <b>{t.name}</b><div className='small gold'>{fmt(t.prizePool)} tokens</div><div className='tiny muted'>Starts in {t.startsIn}</div>
          </Link>
        ))}
      </div>

      <div className='section-title'><h3>Top Players</h3><Link to='/leaderboard' className='link small'>Leaderboard</Link></div>
      <div className='card'>
        {(top.data ?? []).slice(0, 3).map((e) => (
          <Link key={e.user.id} to={'/u/' + e.user.username} className='list-row'><span className={'rank r' + e.rank}>{e.rank}</span><Avatar name={e.user.name} size={36} /><b className='grow'>{e.user.username}</b><span className='gold bold'>{fmt(e.score)}</span></Link>
        ))}
      </div>
    </div>
  );
}
