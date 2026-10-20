import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpFromLine, Coins, Flag, Gift, Menu as MenuIcon, Plus, Settings as Cog, Share2 } from 'lucide-react';
import { api } from '../services/api';
import { profileApi } from '../services/profileApi';
import type { MiniUser } from '../services/profileApi';
import type { Post } from '../types';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Button, Coin, Empty, Loading, Sheet, Tabs, TopBar, fmt } from '../components/ui';
import { MenuList } from '../components/MenuList';
import { PostCard } from '../components/PostCard';
import '../styles/profile.css';

const BADGE: Record<string, string> = { crown: '👑', star: '⭐', trophy: '🏆', fire: '🔥' };
const POST_EMOJI: Record<string, string> = { text: '💬', image: '🖼️', video: '▶️', replay: '♟️', puzzle: '🧩', tournament: '🏆', stream: '🔴' };
const PALETTES = [['#0b3b3a', '#14507a'], ['#3a1a3a', '#0b3b3a'], ['#12306b', '#0f766e'], ['#3b2a06', '#0f5a4f'], ['#2a1a4e', '#0f766e']];
const grad = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return 'linear-gradient(160deg,' + a + ',' + b + ')';
};

type Tab = 'posts' | 'games' | 'badges' | 'wallet' | 'menu';

export default function Profile() {
  const { username } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const me = useApp((s) => s.user)!;
  const tokens = useApp((s) => s.tokens);
  const toast = useApp((s) => s.toast);
  const target = username ?? me.username;
  const isMe = target.toLowerCase() === me.username.toLowerCase();
  const { data: u, loading, setData } = useAsync(() => api.users.get(target), [target]);
  const posts = useAsync(() => (u ? profileApi.postsBy(u) : Promise.resolve([] as Post[])), [u?.id]);
  const avatar = useAsync(() => (u ? profileApi.avatarOf(u.id) : Promise.resolve(null as string | null)), [u?.id]);
  const [list, setList] = useState<'followers' | 'following' | null>(null);
  const conns = useAsync(() => (u && list ? profileApi.connections(u.id, list) : Promise.resolve([] as MiniUser[])), [u?.id, list]);
  const wallet = useAsync(() => api.wallet.get());
  const [tab, setTab] = useState<Tab>(isMe && sp.get('tab') === 'menu' ? 'menu' : 'posts');
  const [openPost, setOpenPost] = useState<string | null>(null);

  if (loading) return <div className='screen'><Loading /></div>;
  if (!u) return <div className='screen'><TopBar title='Profile' back={!!username} /><Empty text='Player not found' /></div>;

  const follow = async () => {
    const f = await api.users.follow(u.username);
    setData({ ...u, isFollowing: f, followers: u.followers + (f ? 1 : -1) });
  };
  const share = async () => {
    const url = location.origin + '/u/' + u.username;
    try {
      if (navigator.share) await navigator.share({ title: u.username + ' on Kinggdom', url });
      else { await navigator.clipboard.writeText(url); toast('Profile link copied'); }
    } catch { /* cancelled */ }
  };
  const reportUser = async () => {
    if (!window.confirm('Report @' + u.username + '?')) return;
    try { await profileApi.reportUser(u.id, 'user_report'); toast('Thanks, we will review it'); } catch (e) { toast((e as Error).message); }
  };
  const openMenu = () => {
    setTab('menu');
    setTimeout(() => document.getElementById('pf-tabs')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const winRate = u.games ? Math.round((u.wins / u.games) * 100) : 0;
  const postList = posts.data ?? [];
  const current = postList.find((p) => p.id === openPost);
  const connList = conns.data ?? [];
  const history = [
    { t: 'Won vs QueenBee', s: 'Chess · Rapid', r: 'W' },
    { t: 'Lost vs SilentMove', s: 'Checkers · Blitz', r: 'L' },
    { t: 'Draw vs ChessPro', s: 'Chess · Blitz', r: 'D' },
    { t: 'Won vs RookBoss', s: 'Checkers · Rapid', r: 'W' },
  ];
  const ach = [
    { em: '🏅', t: 'First Win', d: 'Win your first game', v: u.wins, max: 1 },
    { em: '🔥', t: 'Winning Streak', d: 'Win 50 games', v: u.wins, max: 50 },
    { em: '🎮', t: 'Dedicated Player', d: 'Play 200 games', v: u.games, max: 200 },
    { em: '⭐', t: 'Rising Star', d: 'Reach level 10', v: u.level, max: 10 },
    { em: '🏆', t: 'Tournament Pro', d: 'Join 10 tournaments', v: u.badges.includes('trophy') ? 10 : 3, max: 10 },
    { em: '👑', t: 'Rated 1500', d: 'Reach a rating of 1500', v: u.rating, max: 1500 },
    { em: '🤝', t: 'Social Star', d: 'Get 500 followers', v: u.followers, max: 500 },
  ];

  const tabs: { id: Tab; label: string }[] = isMe
    ? [{ id: 'posts', label: 'Posts' }, { id: 'games', label: 'Games' }, { id: 'badges', label: 'Badges' }, { id: 'wallet', label: 'Wallet' }, { id: 'menu', label: 'Menu' }]
    : [{ id: 'posts', label: 'Posts' }, { id: 'games', label: 'Games' }, { id: 'badges', label: 'Badges' }];

  return (
    <div className={'screen' + (username ? ' nonav' : '')}>
      <div className='pf-cover'>
        <div className='pf-cover-top'>
          {username ? <button className='icon-btn' onClick={() => nav(-1)} aria-label='Back'><ArrowLeft size={20} /></button> : <span />}
          {isMe ? (
            <div className='row gap8'>
              <button className='icon-btn' onClick={openMenu} aria-label='Menu'><MenuIcon size={18} /></button>
              <Link to='/settings' className='icon-btn' aria-label='Settings'><Cog size={18} /></Link>
            </div>
          ) : (
            <button className='icon-btn' onClick={reportUser} aria-label='Report user'><Flag size={18} /></button>
          )}
        </div>
      </div>

      <div className='pf-head'>
        <Avatar name={u.name} src={avatar.data} size={96} ring online={u.online} />
        <h2>{u.name}</h2>
        <div className='muted small'>@{u.username}</div>
        <div className='pf-chips'>
          <span className='pill' style={{ background: 'rgba(245,196,81,.15)', color: 'var(--gold)' }}>Level {u.level}</span>
          <span className='pill' style={{ background: 'rgba(30,224,190,.15)', color: 'var(--blue)' }}>Rating {u.rating}</span>
          {u.country && <span className='pill' style={{ background: 'rgba(255,255,255,.08)' }}>{u.country}</span>}
          {u.premium && <span className='pill' style={{ color: 'var(--gold)', background: 'rgba(245,196,81,.15)' }}>Prime Member</span>}
        </div>
        <p className='muted small' style={{ maxWidth: 300 }}>{u.bio || (isMe ? 'Add a bio in Edit Profile.' : 'No bio yet.')}</p>
        <div className='row gap8'>{u.badges.map((b) => <span key={b} style={{ fontSize: 20 }}>{BADGE[b] ?? '🏅'}</span>)}</div>
      </div>

      <div className='card pf-stats mt16'>
        <div role='button' style={{ cursor: 'pointer' }} onClick={() => setList('followers')}><b>{fmt(u.followers)}</b><span className='tiny muted'>Followers</span></div>
        <div role='button' style={{ cursor: 'pointer' }} onClick={() => setList('following')}><b>{fmt(u.following)}</b><span className='tiny muted'>Following</span></div>
        <div><b>{fmt(u.games)}</b><span className='tiny muted'>Games</span></div>
        <div><b className='gold'>{winRate}%</b><span className='tiny muted'>Win rate</span></div>
      </div>

      <div className='grid2 mt12'>
        {isMe ? (
          <>
            <Button onClick={() => nav('/profile/edit')}>Edit Profile</Button>
            <Button variant='ghost' onClick={share}><Share2 size={16} /> Share</Button>
          </>
        ) : (
          <>
            <Button variant={u.isFollowing ? 'ghost' : 'primary'} onClick={follow}>{u.isFollowing ? 'Following' : 'Follow'}</Button>
            <Button variant='ghost' onClick={() => nav('/chat/c-' + u.id)}>Message</Button>
          </>
        )}
      </div>
      {!isMe && <Button variant='gold' full className='mt8' onClick={() => nav('/gift?to=' + u.username)}><Gift size={16} /> Send Gift</Button>}

      <div className='card mt12'>
        <div className='grid3'>
          <div className='stat'><b className='green'>{fmt(u.wins)}</b><span className='tiny muted'>Wins</span></div>
          <div className='stat'><b className='red'>{fmt(u.losses)}</b><span className='tiny muted'>Losses</span></div>
          <div className='stat'><b>{fmt(u.draws)}</b><span className='tiny muted'>Draws</span></div>
        </div>
        <div className='progress mt12'><i style={{ width: winRate + '%' }} /></div>
      </div>

      <div id='pf-tabs'><Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} /></div>

      {tab === 'posts' && (
        <>
          {isMe && <Button full className='mb12' onClick={() => nav('/create-post')}><Plus size={16} /> New post</Button>}
          {posts.loading ? <Loading /> : postList.length === 0 ? <Empty text={isMe ? 'You have not posted yet. Share your first move!' : 'No posts yet'} /> : (
            <div className='pgrid'>
              {postList.map((p) => (
                <div key={p.id} role='button' className='p-tile' style={{ background: grad(p.id), cursor: 'pointer' }} onClick={() => setOpenPost(p.id)}>
                  {POST_EMOJI[p.kind] ?? '💬'}
                  <em style={{ fontStyle: 'normal', fontSize: 11, opacity: 0.9, padding: '0 6px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.text}</em>
                  <span>♥ {fmt(p.likes)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'games' && (
        <div className='card'>
          {history.map((a, i) => (
            <div key={i} className='list-row'>
              <span className={'pos ' + (a.r === 'W' ? 'p1' : a.r === 'D' ? 'p2' : '')} style={a.r === 'L' ? { background: 'var(--red)', color: '#fff' } : undefined}>{a.r}</span>
              <div className='grow'><b className='small'>{a.t}</b><div className='tiny muted'>{a.s}</div></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'badges' && (
        <div className='card'>
          {ach.map((a) => {
            const pct = Math.min(100, Math.round((a.v / a.max) * 100));
            const done = a.v >= a.max;
            return (
              <div key={a.t} className={'ach' + (done ? '' : ' locked')}>
                <span className='em'>{a.em}</span>
                <div className='grow'>
                  <b className='small'>{a.t}</b>
                  <div className='tiny muted'>{a.d}</div>
                  <div className='bar'><i style={{ width: pct + '%' }} /></div>
                </div>
                <span className='tiny muted'>{done ? 'Done' : Math.min(a.v, a.max) + '/' + a.max}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'wallet' && isMe && (
        <>
          <div className='card'>
            <div className='row gap8'><Coin /><span className='muted small'>Balance</span></div>
            <h2 className='gold mt8'>{fmt(tokens)} tokens</h2>
            {wallet.data && <div className='tiny muted'>≈ ${wallet.data.usd.toFixed(2)}</div>}
            <div className='grid2 mt12'>
              <Button onClick={() => nav('/store')}><Coins size={16} /> Purchase</Button>
              <Button variant='ghost' onClick={() => nav('/wallet?action=withdraw')}><ArrowUpFromLine size={16} /> Withdraw</Button>
            </div>
          </div>
          <div className='section-title'><h3>Recent activity</h3></div>
          <div className='card'>
            {(wallet.data ? wallet.data.transactions.slice(0, 5) : []).map((t) => (
              <div key={t.id} className='list-row'>
                <div className='grow'><b className='small'>{t.label}</b><div className='tiny muted'>{t.time}</div></div>
                <b className={t.amount > 0 ? 'green' : 'red'}>{t.amount > 0 ? '+' : ''}{fmt(t.amount)}</b>
              </div>
            ))}
            {wallet.data && wallet.data.transactions.length === 0 && <Empty text='No transactions yet' />}
          </div>
          <Button variant='ghost' full className='mt12' onClick={() => nav('/wallet')}>Open full wallet</Button>
        </>
      )}

      {tab === 'menu' && isMe && <MenuList />}

      <Sheet open={!!current} onClose={() => setOpenPost(null)} title='Post'>
        {current && (
          <PostCard
            key={current.id}
            post={current}
            onDeleted={(id) => { posts.setData(postList.filter((p) => p.id !== id)); setOpenPost(null); }}
            onEdited={(id, text) => posts.setData(postList.map((p) => (p.id === id ? { ...p, text } : p)))}
          />
        )}
      </Sheet>

      <Sheet open={!!list} onClose={() => setList(null)} title={list === 'following' ? 'Following' : 'Followers'}>
        {conns.loading ? <Loading /> : connList.length === 0 ? <Empty text='Nobody here yet' /> : connList.map((c) => (
          <div key={c.id} className='list-row' role='button' style={{ cursor: 'pointer' }} onClick={() => { setList(null); nav('/u/' + c.username); }}>
            <Avatar name={c.name} src={c.avatarUrl} size={36} />
            <div className='grow'><b className='small'>{c.name}</b><div className='tiny muted'>@{c.username}</div></div>
          </div>
        ))}
      </Sheet>
    </div>
  );
}
