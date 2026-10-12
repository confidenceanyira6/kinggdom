import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { TopBar, Tabs, Avatar, Button, Empty, Loading } from '../components/ui';
import { api } from '../services/api';
import { trending } from '../data/mock';
import type { User } from '../types';

type Kind = 'users' | 'streamers' | 'games';
const KEY = 'kg-recent-searches';
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export default function Search() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [submitted, setSubmitted] = useState(sp.get('q') ?? '');
  const [kind, setKind] = useState<Kind>('users');
  const [recent, setRecent] = useState<string[]>(readRecent());
  const [results, setResults] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!submitted) { setResults(null); return; }
    setLoading(true);
    api.users.search(submitted, kind).then(setResults).finally(() => setLoading(false));
  }, [submitted, kind]);

  const run = (term: string) => {
    const t = term.trim();
    setQ(t); setSubmitted(t);
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const clear = () => { setRecent([]); try { localStorage.removeItem(KEY); } catch { /* noop */ } };
  const follow = async (u: User) => {
    const f = await api.users.follow(u.username);
    setResults((r) => (r ?? []).map((x) => (x.id === u.id ? { ...x, isFollowing: f } : x)));
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Search' />
      <div className='input-wrap'>
        <span className='ico'><SearchIcon size={16} /></span>
        <input style={{ paddingLeft: 40 }} autoFocus placeholder='Search users, streamers, games...' value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run(q)} />
      </div>
      <Tabs<Kind> tabs={[{ id: 'users', label: 'Users' }, { id: 'streamers', label: 'Streamers' }, { id: 'games', label: 'Games' }]} value={kind} onChange={setKind} />

      {!submitted ? (
        <>
          <div className='section-title'><h3>Recent Searches</h3>{recent.length > 0 && <button className='link small' onClick={clear}>Clear</button>}</div>
          {recent.length === 0 && <Empty text='No recent searches' />}
          {recent.map((r) => <button key={r} className='list-row muted' style={{ width: '100%' }} onClick={() => run(r)}>{r}</button>)}
          <div className='section-title'><h3>Trending</h3></div>
          <div className='row wrap gap8'>{trending.map((t) => <button key={t} className='chip' onClick={() => run(t.slice(1))}>{t}</button>)}</div>
        </>
      ) : loading ? <Loading /> : (
        <div className='card'>
          {(results ?? []).length === 0 && <Empty text='No results found' />}
          {(results ?? []).map((u) => (
            <div key={u.id} className='list-row'>
              <Link to={'/u/' + u.username}><Avatar name={u.name} size={42} online={u.online} /></Link>
              <Link to={'/u/' + u.username} className='grow'><b>{u.username}</b><div className='tiny muted'>Level {u.level} · {u.favoriteGame ?? 'chess'}</div></Link>
              <Button sm variant={u.isFollowing ? 'ghost' : 'primary'} onClick={() => follow(u)}>{u.isFollowing ? 'Following' : 'Follow'}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
