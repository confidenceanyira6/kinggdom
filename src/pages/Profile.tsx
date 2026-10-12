import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Gift, Settings as Cog } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Button, Empty, Loading, Tabs, TopBar, fmt } from '../components/ui';

const BADGE: Record<string, string> = { crown: '👑', star: '⭐', trophy: '🏆', fire: '🔥' };
type Tab = 'posts' | 'games' | 'tournaments';

export default function Profile() {
  const { username } = useParams();
  const nav = useNavigate();
  const me = useApp((s) => s.user)!;
  const target = username ?? me.username;
  const isMe = target.toLowerCase() === me.username.toLowerCase();
  const { data: u, loading, setData } = useAsync(() => api.users.get(target), [target]);
  const [tab, setTab] = useState<Tab>('posts');

  if (loading) return <div className='screen'><Loading /></div>;
  if (!u) return <div className='screen'><TopBar title='Profile' back={!!username} /><Empty text='Player not found' /></div>;

  const follow = async () => {
    const f = await api.users.follow(u.username);
    setData({ ...u, isFollowing: f, followers: u.followers + (f ? 1 : -1) });
  };

  const activity = [
    { t: u.username + ' won a match', s: 'Chess · 2h ago' },
    { t: 'Started a live stream', s: 'Playing Chess · 3h ago' },
    { t: 'Joined the Kinggdom Tournament', s: '4h ago' },
  ];
  const panes: Record<Tab, { t: string; s: string }[]> = {
    posts: activity,
    games: [{ t: 'Won vs QueenBee', s: 'Chess · Rapid' }, { t: 'Lost vs SilentMove', s: 'Checkers · Blitz' }, { t: 'Draw vs ChessPro', s: 'Chess · Blitz' }],
    tournaments: [{ t: 'Kinggdom Cup', s: 'Registered' }, { t: 'Weekly Chess Cup', s: '3rd place' }],
  };

  return (
    <div className={'screen' + (username ? ' nonav' : '')}>
      <TopBar title='' back={!!username} right={isMe ? <Link to='/settings' className='icon-btn'><Cog size={18} /></Link> : undefined} />
      <div className='col center gap8'>
        <Avatar name={u.name} size={92} ring />
        <h2>{u.username}</h2>
        <div className='row gap8'><span className='small gold'>Level {u.level}</span>{u.premium && <span className='pill' style={{ color: 'var(--gold)', background: 'rgba(245,196,81,.15)' }}>Prime Member</span>}</div>
        <p className='muted small tc' style={{ maxWidth: 280 }}>{u.bio || 'No bio yet.'}</p>
        <div className='row gap8 small muted'>{u.badges.map((b) => <span key={b} style={{ fontSize: 20 }}>{BADGE[b] ?? '🏅'}</span>)}</div>
      </div>

      <div className='grid3 mt16 card'>
        <div className='stat'><b>{fmt(u.followers)}</b><span className='tiny muted'>Followers</span></div>
        <div className='stat'><b>{fmt(u.following)}</b><span className='tiny muted'>Following</span></div>
        <div className='stat'><b>{fmt(u.games)}</b><span className='tiny muted'>Games</span></div>
      </div>
      <div className='grid3 mt12 card'>
        <div className='stat'><b className='green'>{fmt(u.wins)}</b><span className='tiny muted'>Wins</span></div>
        <div className='stat'><b className='red'>{fmt(u.losses)}</b><span className='tiny muted'>Losses</span></div>
        <div className='stat'><b>{fmt(u.draws)}</b><span className='tiny muted'>Draws</span></div>
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

      <Tabs<Tab> tabs={[{ id: 'posts', label: 'Posts' }, { id: 'games', label: 'Games' }, { id: 'tournaments', label: 'Tournaments' }]} value={tab} onChange={setTab} />
      <div className='card'>
        {panes[tab].map((a, i) => <div key={i} className='list-row'><Avatar name={u.name} size={34} /><div><b className='small'>{a.t}</b><div className='tiny muted'>{a.s}</div></div></div>)}
      </div>
    </div>
  );
}
