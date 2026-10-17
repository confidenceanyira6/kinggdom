import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Button, Coin, Loading, fmt } from '../components/ui';
import { Reel } from '../components/Reel';
import '../styles/reels.css';

type FeedTab = 'following' | 'foryou';

export default function Home() {
  const nav = useNavigate();
  const tokens = useApp((s) => s.tokens);
  const setTokens = useApp((s) => s.setTokens);
  const feed = useAsync(() => api.feed.list());
  const notifs = useAsync(() => api.notifications.list());
  const [tab, setTab] = useState<FeedTab>('foryou');

  useEffect(() => { api.wallet.get().then((w) => setTokens(w.tokens)); }, [setTokens]);
  const unread = (notifs.data ?? []).filter((n) => !n.read).length;

  const all = feed.data ?? [];
  const posts = tab === 'following' ? all.filter((p) => p.author.isFollowing) : all;

  return (
    <>
      <header className='reels-top'>
        <div className='side'>
          <Link to='/wallet' className='token-pill'>
            <Coin />{fmt(tokens)}
            <span className='plus' onClick={(e) => { e.preventDefault(); nav('/store'); }}><Plus size={12} /></span>
          </Link>
        </div>
        <div className='reel-tabs'>
          <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Following</button>
          <button className={tab === 'foryou' ? 'active' : ''} onClick={() => setTab('foryou')}>For You</button>
        </div>
        <div className='side end'>
          <Link to='/create-post' className='icon-btn' aria-label='Create post'><Plus size={18} /></Link>
          <Link to='/notifications' className='icon-btn' aria-label='Notifications'><Bell size={18} />{unread > 0 && <i className='badge-dot' />}</Link>
        </div>
      </header>

      <main className='reels' key={tab}>
        {feed.loading && <div className='reels-state'><Loading /></div>}
        {feed.error && <div className='reels-state'><p className='muted'>{feed.error}</p></div>}
        {!feed.loading && !feed.error && posts.length === 0 && (
          <div className='reels-state'>
            <h3>{tab === 'following' ? 'Nothing here yet' : 'No posts yet'}</h3>
            <p className='muted small'>{tab === 'following' ? 'Follow players to see their posts here.' : 'Be the first to share something.'}</p>
            <Button variant='gold' sm onClick={() => (tab === 'following' ? setTab('foryou') : nav('/create-post'))}>{tab === 'following' ? 'Browse For You' : 'Create post'}</Button>
          </div>
        )}
        {posts.map((p) => <Reel key={p.id} post={p} />)}
      </main>
    </>
  );
}
