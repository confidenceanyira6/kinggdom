import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Button, Loading } from '../components/ui';
import { Reel } from '../components/Reel';
import '../styles/reels.css';

type FeedTab = 'following' | 'foryou';

export default function Home() {
  const feed = useAsync(() => api.feed.list());
  const [tab, setTab] = useState<FeedTab>('foryou');

  const all = feed.data ?? [];
  const posts = tab === 'following' ? all.filter((p) => p.author.isFollowing) : all;

  return (
    <>
      <header className='reels-top'>
        <div className='side' />
        <div className='reel-tabs'>
          <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Following</button>
          <button className={tab === 'foryou' ? 'active' : ''} onClick={() => setTab('foryou')}>For You</button>
        </div>
        <div className='side end'>
          <Link to='/search' className='icon-btn' aria-label='Search'><Search size={18} /></Link>
        </div>
      </header>

      <main className='reels' key={tab}>
        {feed.loading && <div className='reels-state'><Loading /></div>}
        {feed.error && <div className='reels-state'><p className='muted'>{feed.error}</p></div>}
        {!feed.loading && !feed.error && posts.length === 0 && (
          <div className='reels-state'>
            <h3>{tab === 'following' ? 'Nothing here yet' : 'No posts yet'}</h3>
            <p className='muted small'>{tab === 'following' ? 'Follow players to see their posts here.' : 'Tap + to share something.'}</p>
            {tab === 'following' && <Button sm onClick={() => setTab('foryou')}>Browse For You</Button>}
          </div>
        )}
        {posts.map((p) => <Reel key={p.id} post={p} />)}
      </main>
    </>
  );
}
