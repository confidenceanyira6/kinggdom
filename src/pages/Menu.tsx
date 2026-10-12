import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Gift, HelpCircle, MessageCircle, Settings as Cog, Shield, Store, Trophy, Users, Wallet } from 'lucide-react';
import { Avatar, TopBar } from '../components/ui';
import { useApp } from '../store/useApp';

const SHOW_ADMIN = import.meta.env.VITE_SHOW_ADMIN === 'true';

export default function Menu() {
  const user = useApp((s) => s.user)!;
  const items = [
    { to: '/wallet', label: 'Wallet', icon: Wallet },
    { to: '/store', label: 'Store', icon: Store },
    { to: '/tournaments', label: 'Tournaments', icon: Trophy },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/friends', label: 'Friends', icon: Users },
    { to: '/community', label: 'Communities', icon: Users },
    { to: '/chat', label: 'Chat', icon: MessageCircle },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/referral', label: 'Invite and Earn', icon: Gift },
    { to: '/settings', label: 'Settings', icon: Cog },
    { to: '/settings#help', label: 'Help and Support', icon: HelpCircle },
    ...(SHOW_ADMIN ? [{ to: '/admin', label: 'Admin Panel', icon: Shield }] : []),
  ];
  return (
    <div className='screen'>
      <TopBar title='Menu' back={false} />
      <Link to='/profile' className='card row gap12'><Avatar name={user.name} size={50} ring /><div className='grow'><b>{user.username}</b><div className='tiny muted'>View profile</div></div><ChevronRight size={18} className='muted' /></Link>
      <div className='card mt12'>
        {items.map((i) => <Link key={i.label} to={i.to} className='list-row'><i.icon size={18} className='gold' /><b className='grow small'>{i.label}</b><ChevronRight size={16} className='muted' /></Link>)}
      </div>
    </div>
  );
}
