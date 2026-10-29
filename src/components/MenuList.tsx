import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpFromLine, BarChart3, Bell, ChevronRight, Coins, Edit3, Gamepad2, Gift, HelpCircle, History, LogOut, Pencil, Radio, Settings as Cog, Shield, Trophy, Users, Video, Wallet as WalletIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Coin, fmt } from './ui';
import { useApp } from '../store/useApp';
import { api } from '../services/api';

const SHOW_ADMIN = import.meta.env.VITE_SHOW_ADMIN === 'true';

interface Row { to: string; label: string; sub?: string; icon: LucideIcon }

/** The full app menu. Lives inside the Profile page (Menu tab). */
export function MenuList() {
  const nav = useNavigate();
  const tokens = useApp((s) => s.tokens);
  const signOut = useApp((s) => s.signOut);

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Money',
      rows: [
        { to: '/store', label: 'Purchase Tokens', sub: 'Buy tokens to play and send gifts', icon: Coins },
        { to: '/wallet?action=withdraw', label: 'Withdraw Tokens', sub: 'Cash out your winnings', icon: ArrowUpFromLine },
        { to: '/wallet', label: 'Wallet', icon: WalletIcon },
        { to: '/wallet#tx', label: 'Transaction History', icon: History },
        { to: '/referral', label: 'Invite and Earn', sub: 'Get tokens for every friend', icon: Gift },
      ],
    },
    {
      title: 'Play and compete',
      rows: [
        { to: '/arena', label: 'Arena', sub: 'Monthly leagues, championships, official live stream', icon: Radio },
        { to: '/play', label: 'Play a game', sub: 'Chess and checkers', icon: Gamepad2 },
        { to: '/tournaments', label: 'Tournaments', icon: Trophy },
        { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
        { to: '/live', label: 'Live Streams', icon: Video },
        { to: '/friends', label: 'Friends', icon: Users },
        { to: '/community', label: 'Communities', icon: Users },
      ],
    },
    {
      title: 'Create',
      rows: [
        { to: '/host', label: 'Host a competition', sub: 'Kingdom Host $5/month · 3% platform fee', icon: Trophy },
        { to: '/live/start', label: 'Go Live', sub: 'Stream your game with your face cam', icon: Video },
        { to: '/create-post', label: 'Create post', icon: Edit3 },
      ],
    },
    {
      title: 'Account',
      rows: [
        { to: '/profile/edit', label: 'Edit Profile', icon: Pencil },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/settings', label: 'Settings', sub: 'Security, privacy, theme, language', icon: Cog },
        { to: '/settings#help', label: 'Help and Support', icon: HelpCircle },
      ],
    },
    ...(SHOW_ADMIN ? [{ title: 'Admin', rows: [{ to: '/admin/arena', label: 'Arena Admin', sub: 'Competitions, stream, gifts, prizes', icon: Shield }, { to: '/admin', label: 'Admin Panel', icon: Shield }] }] : []),
  ];

  const logout = async () => {
    await api.auth.logOut();
    signOut();
    nav('/login', { replace: true });
  };

  return (
    <div>
      <div className='card'>
        <div className='row between'>
          <div className='row gap8'><Coin /><span className='muted small'>Token balance</span></div>
          <b className='gold'>{fmt(tokens)}</b>
        </div>
        <div className='grid2 mt12'>
          <Link to='/store'><Button full sm><Coins size={14} /> Purchase</Button></Link>
          <Link to='/wallet?action=withdraw'><Button full sm variant='ghost'><ArrowUpFromLine size={14} /> Withdraw</Button></Link>
        </div>
      </div>

      {sections.map((s) => (
        <div key={s.title} className='menu-sec'>
          <h4>{s.title}</h4>
          <div className='card'>
            {s.rows.map((r) => (
              <Link key={r.label} to={r.to} className='list-row'>
                <r.icon size={18} className='gold' />
                <div className='grow'><b className='small'>{r.label}</b>{r.sub && <div className='tiny muted'>{r.sub}</div>}</div>
                <ChevronRight size={16} className='muted' />
              </Link>
            ))}
          </div>
        </div>
      ))}

      <Button variant='danger' full className='mt16' onClick={logout}><LogOut size={16} /> Log Out</Button>
    </div>
  );
}
