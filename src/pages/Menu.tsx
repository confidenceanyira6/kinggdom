import { Link } from 'react-router-dom';
import { BarChart3, Bell, ChevronRight, Coins, Edit3, Gift, HelpCircle, History, Radio, Settings as Cog, Shield, Trophy, Users, ArrowUpFromLine, Wallet as WalletIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Button, Coin, TopBar, fmt } from '../components/ui';
import { useApp } from '../store/useApp';

const SHOW_ADMIN = import.meta.env.VITE_SHOW_ADMIN === 'true';

interface Row { to: string; label: string; icon: LucideIcon }

export default function Menu() {
  const user = useApp((s) => s.user)!;
  const tokens = useApp((s) => s.tokens);

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Money',
      rows: [
        { to: '/store', label: 'Purchase Tokens', icon: Coins },
        { to: '/wallet?action=withdraw', label: 'Withdraw Tokens', icon: ArrowUpFromLine },
        { to: '/wallet', label: 'Wallet', icon: WalletIcon },
        { to: '/wallet#tx', label: 'Transaction History', icon: History },
        { to: '/referral', label: 'Invite and Earn', icon: Gift },
      ],
    },
    {
      title: 'Play and compete',
      rows: [
        { to: '/arena', label: 'Arena (leagues and championships)', icon: Radio },
        { to: '/tournaments', label: 'Tournaments', icon: Trophy },
        { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
        { to: '/friends', label: 'Friends', icon: Users },
        { to: '/community', label: 'Communities', icon: Users },
      ],
    },
    {
      title: 'Account',
      rows: [
        { to: '/profile/edit', label: 'Edit Profile', icon: Edit3 },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/settings', label: 'Settings', icon: Cog },
        { to: '/settings#help', label: 'Help and Support', icon: HelpCircle },
        ...(SHOW_ADMIN ? [{ to: '/admin/arena', label: 'Arena Admin', icon: Shield }, { to: '/admin', label: 'Admin Panel', icon: Shield }] : []),
      ],
    },
  ];

  return (
    <div className='screen'>
      <TopBar title='Menu' />
      <Link to='/profile' className='card row gap12'>
        <Avatar name={user.name} size={50} ring />
        <div className='grow'><b>{user.username}</b><div className='tiny muted'>View profile</div></div>
        <ChevronRight size={18} className='muted' />
      </Link>

      <div className='card mt12'>
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
              <Link key={r.label} to={r.to} className='list-row'><r.icon size={18} className='gold' /><b className='grow small'>{r.label}</b><ChevronRight size={16} className='muted' /></Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
