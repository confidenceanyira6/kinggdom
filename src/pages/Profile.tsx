import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpFromLine, Coins, Gift, Menu as MenuIcon, Settings as Cog } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Button, Coin, Empty, Loading, Tabs, TopBar, fmt } from '../components/ui';

const BADGE: Record<string, string> = { crown: '👑', star: '⭐', trophy: '🏆', fire: '🔥' };
const POST_EMOJI: Record<string, string> = { text: '💬', image: '🖼️', video: '▶️', replay: '♟️', puzzle: '🧩', tournament: '🏆', stream: '🔴' };
const PALETTES = [['#0b3b3a', '#14507a'], ['#3a1a3a', '#0b3b3a'], ['#12306b', '#0f766e'], ['#3b2a06', '#0f5a4f'], ['#2a1a4e', '#0f766e']];
const grad = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return 'linear-gradient(160deg,' + a + ',' + b + ')';
};

type Tab = 'posts' | 'games' | 'wallet';

export default function Profile() {
  const { username } = useParams();
  const nav = useNavigate();
  const me = useApp((s) => s.user)!;
  const tokens = useApp((s) => s.tokens);
  const target = username ?? me.username;
  const isMe = target.toLowerCase() === me.username.toLowerCase();
  const { data: u, loading, setData } = useAsync(() => api.users.get(target), [target]);
  const feed = useAsync(() => api.feed.list());
  const [tab, setTab] = useState<Tab>('posts');

  if (loading) return <div className='screen'><Loading /></div>;
  if (!u) return <div className='screen'><TopBar title='Profile' back={!!username} /><Empty text='Player not found' /></div>;

  const follow = async () => {
    const f = await api.users.follow(u.username);
    setData({ ...u, isFollowing: f, followers: u.followers + (f ? 1 : -1) });
  };

  const winRate = u.games ? Math.round((u.wins / u.games) * 100) : 0;
  const posts = (feed.data ?? []).filter((p) => p.author.username === u.username);
  const history = [
    { t: 'Won vs QueenBee', s: 'Chess · Rapid' },
    { t: 'Lost vs SilentMove', s: 'Checkers · Blitz' },
    { t: 'Draw vs ChessPro', s: 'Chess · Blitz' },
  ];
  const tabs: { id: Tab; label: string }[] = isMe
    ? [{ id: 'posts', label: 'Posts' }, { id: 'games', label: 'Games' }, { id: 'wallet', label: 'Wallet' }]
    : [{ id: 'posts', label: 'Posts' }, { id: 'games', label: 'Games' }];

  return (
    <div className={'screen' + (username ? ' nonav' : '')}>
      <TopBar
        title=''
        back={!!username}
        right={isMe ? (
          <>
            <Link to='/menu' className='icon-btn' aria-label='Menu'><MenuIcon size={18} /></Link>
            <Link to='/settings' className='icon-btn' aria-label='Settings'><Cog size={18} /></Link>
          </>
        ) : undefined}
      />

      <div className='col center gap8'>
        <Avatar name={u.name} size={92} ring />
        <h2>{u.username}</h2>
        <div className='row gap8 wrap center'>
          <span className='pill' style={{ background: 'rgba(245,196,81,.15)', color: 'var(--gold)' }}>Level {u.level}</span>
          {u.premium && <span className='pill' style={{ color: 'var(--gold)', background: 'rgba(245,196,81,.15)' }}>Prime Member</span>}
          {isMe && <Link to='/wallet' className='token-pill'><Coin />{fmt(tokens)}</Link>}
        </div>
        <p className='muted small tc' style={{ maxWidth: 280 }}>{u.bio || 'No bio yet.'}</p>
        <div className='row gap8'>{u.badges.map((b) => <span key={b} style={{ fontSize: 20 }}>{BADGE[b] ?? '🏅'}</span>)}</div>
      </div>

      <div className='grid3 mt16 card'>
        <div className='stat'><b>{fmt(u.followers)}</b><span className='tiny muted'>Followers</span></div>
        <div className='stat'><b>{fmt(u.following)}</b><span className='tiny muted'>Following</span></div>
        <div className='stat'><b>{fmt(u.games)}</b><span className='tiny muted'>Games</span></div>
      </div>
      <div className='card mt12'>
        <div className='grid3'>
          <div className='stat'><b className='green'>{fmt(u.wins)}</b><span className='tiny muted'>Wins</span></div>
          <div className='stat'><b className='red'>{fmt(u.losses)}</b><span className='tiny muted'>Losses</span></div>
          <div className='stat'><b>{fmt(u.draws)}</b><span className='tiny muted'>Draws</span></div>
        </div>
        <div className='row between mt12 small'><span className='muted'>Win rate</span><b>{winRate}%</b></div>
        <div className='progress mt8'><i style={{ width: winRate + '%' }} /></div>
      </div>

      <div className='grid2 mt16'>
        {isMe ? (
          <>
            <Button onClick={() => nav('/profile/edit')}>Edit Profile</Button>
            <Button variant='ghost' onClick={() => nav('/referral')}>Invite friends</Button>
          </>
        ) : (
          <>
            <Button variant={u.isFollowing ? 'ghost' : 'primary'} onClick={follow}>{u.isFollowing ? 'Following' : 'Follow'}</Button>
            <Button variant='ghost' onClick={() => nav('/chat/c-' + u.id)}>Message</Button>
          </>
        )}
      </div>
      {!isMe && <Button variant='gold' full className='mt8' onClick={() => nav('/gift?to=' + u.username)}><Gift size={16} /> Send Gift</Button>}

      <Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'posts' && (
        posts.length === 0 ? <Empty text='No posts yet' /> : (
          <div className='pgrid'>
            {posts.map((p) => <div key={p.id} className='p-tile' style={{ background: grad(p.id) }}>{POST_EMOJI[p.kind] ?? '💬'}<span>♥ {fmt(p.likes)}</span></div>)}
          </div>
        )
      )}

      {tab === 'games' && (
        <div className='card'>
          {history.map((a, i) => <div key={i} className='list-row'><Avatar name={u.name} size={34} /><div><b className='small'>{a.t}</b><div className='tiny muted'>{a.s}</div></div></div>)}
        </div>
      )}

      {tab === 'wallet' && isMe && (
        <div className='card'>
          <div className='row gap8'><Coin /><span className='muted small'>Balance</span></div>
          <h2 className='gold mt8'>{fmt(tokens)} tokens</h2>
          <div className='grid2 mt12'>
            <Button onClick={() => nav('/store')}><Coins size={16} /> Purchase</Button>
            <Button variant='ghost' onClick={() => nav('/wallet?action=withdraw')}><ArrowUpFromLine size={16} /> Withdraw</Button>
          </div>
          <Button variant='ghost' full className='mt8' onClick={() => nav('/wallet')}>Wallet and history</Button>
        </div>
      )}
    </div>
  );
}
