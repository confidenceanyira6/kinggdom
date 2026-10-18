import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Loading, fmt } from '../components/ui';

type Tab = 'foryou' | 'gaming' | 'live' | 'follow';
interface Item { id: string; to: string; emoji: string; title: string; meta: string; live?: boolean }

const POST_EMOJI: Record<string, string> = { text: '💬', image: '🖼️', video: '▶️', replay: '♟️', puzzle: '🧩', tournament: '🏆', stream: '🔴' };
const PALETTES = [['#0b3b3a', '#14507a'], ['#3a1a3a', '#0b3b3a'], ['#12306b', '#0f766e'], ['#3b2a06', '#0f5a4f'], ['#2a1a4e', '#0f766e']];
const HEIGHTS = [190, 150, 175, 215];
const grad = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return 'linear-gradient(160deg,' + a + ',' + b + ')';
};
const mix = <T,>(...lists: T[][]) => {
  const out: T[] = [];
  const n = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < n; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
};

const GAMES: Item[] = [
  { id: 'g-chess', to: '/play/chess', emoji: '♞', title: 'Chess · Tips & Tricks', meta: '12.4k playing' },
  { id: 'g-checkers', to: '/play/checkers', emoji: '⛀', title: 'Checkers · Quick Match', meta: '5.4k playing' },
];

export default function Discover() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('foryou');
  const feed = useAsync(() => api.feed.list());
  const live = useAsync(() => api.matches.live());
  const tours = useAsync(() => api.tournaments.list('upcoming'));

  const posts = feed.data ?? [];
  const liveItems: Item[] = (live.data ?? []).map((m) => ({ id: m.id, to: '/live/' + m.id, emoji: m.game === 'chess' ? '♞' : '⛀', title: m.title, meta: fmt(m.viewers) + ' watching', live: true }));
  const tourItems: Item[] = (tours.data ?? []).map((t) => ({ id: t.id, to: '/tournaments/' + t.id, emoji: '🏆', title: 'Win real rewards · ' + t.name, meta: fmt(t.prizePool) + ' tokens' }));
  const toItem = (p: (typeof posts)[number]): Item => ({ id: p.id, to: '/u/' + p.author.username, emoji: POST_EMOJI[p.kind] ?? '💬', title: p.text || '@' + p.author.username, meta: '@' + p.author.username + ' · ♥ ' + fmt(p.likes) });
  const postItems = posts.map(toItem);
  const followItems = posts.filter((p) => p.author.isFollowing).map(toItem);

  const list: Item[] =
    tab === 'foryou' ? mix(postItems, liveItems, tourItems, GAMES) :
    tab === 'gaming' ? mix(GAMES, tourItems) :
    tab === 'live' ? liveItems : followItems;

  const tabs: { id: Tab; label: string }[] = [{ id: 'foryou', label: 'For You' }, { id: 'gaming', label: 'Gaming' }, { id: 'live', label: 'Live' }, { id: 'follow', label: 'Follow' }];
  const loading = feed.loading || live.loading || tours.loading;

  return (
    <div className='screen'>
      <header className='topbar'><h1>Discover</h1></header>
      <button className='search-bar' onClick={() => nav('/search')}><SearchIcon size={16} /> Search videos, users, games...</button>
      <div className='utabs'>{tabs.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {loading ? <Loading /> : list.length === 0 ? (
        <div className='empty muted'>{tab === 'follow' ? 'Follow players to see their posts here.' : 'Nothing here yet.'}</div>
      ) : (
        <div className='masonry'>
          {list.map((it, i) => (
            <Link key={it.id} to={it.to} className='m-card'>
              <div className='m-thumb' style={{ height: HEIGHTS[i % HEIGHTS.length], background: grad(it.id) }}>{it.emoji}</div>
              {it.live && <span className='live-tag m-tag'>LIVE</span>}
              <div className='m-cap'><b>{it.title}</b><span>{it.meta}</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
