import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Crown, MessageCircle, Plus, Swords, Trophy, Video } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Button, Coin, Empty, Loading, Logo, fmt } from '../components/ui';
import { PostCard } from '../components/PostCard';
import { MatchCard } from '../components/MatchCard';
import { Fab } from '../components/Fab';

export default function Home() {
  const nav = useNavigate();
  const tokens = useApp((s) => s.tokens);
  const setTokens = useApp((s) => s.setTokens);
  const feed = useAsync(() => api.feed.list());
  const live = useAsync(() => api.matches.live());
  const notifs = useAsync(() => api.notifications.list());
  const tours = useAsync(() => api.tournaments.list());

  useEffect(() => { api.wallet.get().then((w) => setTokens(w.tokens)); }, [setTokens]);
  const unread = (notifs.data ?? []).filter((n) => !n.read).length;

  // Featured tournament comes from the backend (ids are UUIDs there, so never hardcode one).
  const all = tours.data ?? [];
  const featured = all.find((t) => t.status === 'live') ?? all.find((t) => t.status === 'upcoming');

  return (
    <div className='screen'>
      <header className='topbar'>
        <Logo />
        <div className='row gap8'>
          <Link to='/chat' className='icon-btn'><MessageCircle size={18} /></Link>
          <Link to='/notifications' className='icon-btn'><Bell size={18} />{unread > 0 && <i className='badge-dot' />}</Link>
        </div>
      </header>

      <div className='row between mb12'>
        <Link to='/wallet' className='token-pill'><Coin />{fmt(tokens)}<span className='plus' onClick={(e) => { e.preventDefault(); nav('/store'); }}><Plus size={14} /></span></Link>
      </div>

      <div className='hero row gap12'>
        <Trophy size={44} className='gold' />
        <div className='grow'>
          <span className='pill' style={{ background: 'rgba(245,196,81,.18)', color: 'var(--gold)' }}>{featured?.status === 'live' ? 'LIVE NOW' : 'FEATURED'}</span>
          <h3 className='mt8'>{featured?.name ?? 'Daily Tournament'}</h3>
          <p className='small muted'>{featured ? 'Prize pool ' + fmt(featured.prizePool) + ' tokens' : 'Win big · Top 1000'}</p>
        </div>
        <Button variant='gold' sm onClick={() => nav(featured ? '/tournaments/' + featured.id : '/tournaments')}>{featured ? 'Join Now' : 'Browse'}</Button>
      </div>

      <div className='grid4 mt16'>
        <Link to='/play/chess' className='tile'><span className='t-ico'><Crown size={20} /></span>Chess</Link>
        <Link to='/play/checkers' className='tile'><span className='t-ico'><Swords size={20} /></span>Checkers</Link>
        <Link to='/tournaments' className='tile'><span className='t-ico'><Trophy size={20} /></span>Tournaments</Link>
        <Link to='/live' className='tile'><span className='t-ico'><Video size={20} /></span>Stream</Link>
      </div>

      <div className='section-title'><h3>Live Matches</h3><Link to='/live' className='link small'>See All</Link></div>
      {live.loading ? <Loading /> : <div className='col gap8'>{(live.data ?? []).slice(0, 2).map((m) => <MatchCard key={m.id} match={m} />)}</div>}

      <div className='section-title'><h3>For you</h3></div>
      {feed.loading && <Loading />}
      {feed.error && <Empty text={feed.error} />}
      {(feed.data ?? []).map((p) => <PostCard key={p.id} post={p} />)}
      <Fab />
    </div>
  );
}
