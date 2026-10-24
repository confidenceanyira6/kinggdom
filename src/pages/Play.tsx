import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, Gift, Plus, Radio, Trophy, Users, Video } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { Coin, fmt } from '../components/ui';

const rows = [
  { to: '/arena', icon: Radio, title: 'Arena', sub: 'Monthly leagues, championships and the official live stream' },
  { to: '/tournaments', icon: Trophy, title: 'Tournaments', sub: 'Win rewards' },
  { to: '/referral', icon: Gift, title: 'Rewards', sub: 'Invite friends and earn tokens' },
  { to: '/leaderboard', icon: BarChart3, title: 'Rankings', sub: 'See top players' },
  { to: '/friends', icon: Users, title: 'Friends', sub: 'Challenge someone you know' },
];

export default function Play() {
  const tokens = useApp((s) => s.tokens);
  const setTokens = useApp((s) => s.setTokens);
  useEffect(() => { api.wallet.get().then((w) => setTokens(w.tokens)); }, [setTokens]);

  return (
    <div className='screen'>
      <div className='gc-head'>
        <h1 style={{ fontSize: 22 }}>Games</h1>
        <Link to='/wallet' className='token-pill'><Coin />{fmt(tokens)}<span className='plus'><Plus size={14} /></span></Link>
      </div>

      <Link to='/play/chess' className='gc-feature'>
        <div>
          <h2 style={{ fontSize: 22 }}>Kinggdom Chess</h2>
          <p className='small muted mt8 mb12'>Outplay your opponent.</p>
          <span className='btn primary sm'>Play Now</span>
        </div>
        <span className='glyph'>♞</span>
      </Link>

      <div className='section-title'><h3>Other Games</h3></div>
      <div className='grid2'>
        <Link to='/play/checkers' className='gc-mini'><div className='glyph'>⛀</div><b>Checkers</b><div className='tiny muted'>8×8 · Play Now</div></Link>
        <Link to='/play/international' className='gc-mini'><div className='glyph'>⛁</div><b>International Checkers</b><div className='tiny muted'>10×10 · Play Now</div></Link>
        <Link to='/live' className='gc-mini'><div className='glyph'><Video size={36} style={{ color: 'var(--blue)' }} /></div><b>Live Streams</b><div className='tiny muted'>Watch and chat</div></Link>
      </div>

      <div className='mt16'>
        {rows.map((r) => (
          <Link key={r.to} to={r.to} className='gc-row'>
            <span className='ico'><r.icon size={20} /></span>
            <div className='grow'><b>{r.title}</b><div className='tiny muted'>{r.sub}</div></div>
            <ChevronRight size={18} className='chev' />
          </Link>
        ))}
      </div>
    </div>
  );
}
