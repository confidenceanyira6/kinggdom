import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Edit3, Gamepad2, Home, Inbox, Plus, User, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Sheet } from './ui';

export function RequireAuth() {
  const user = useApp((s) => s.user);
  const loc = useLocation();
  if (!user) return <Navigate to='/login' replace state={{ from: loc.pathname }} />;
  if (!user.profileComplete && loc.pathname !== '/setup') return <Navigate to='/setup' replace />;
  return <Outlet />;
}

function NavTab({ to, label, icon: Icon, badge }: { to: string; label: string; icon: LucideIcon; badge?: number }) {
  return (
    <NavLink to={to} className={({ isActive }) => 'bn' + (isActive ? ' active' : '')}>
      <span className='bn-ico'><Icon size={22} /></span>
      <small>{label}</small>
      {!!badge && <i className='badge'>{badge > 9 ? '9+' : badge}</i>}
    </NavLink>
  );
}

export function TabLayout() {
  const nav = useNavigate();
  const [create, setCreate] = useState(false);
  const chats = useAsync(() => api.chat.list());
  const unread = (chats.data ?? []).reduce((n, c) => n + c.unread, 0);
  const go = (to: string) => { setCreate(false); nav(to); };

  return (
    <>
      <Outlet />
      <nav className='bnav'>
        <NavTab to='/home' label='Home' icon={Home} />
        <NavTab to='/discover' label='Discover' icon={Compass} />
        <button className='bn center' onClick={() => setCreate(true)} aria-label='Create'>
          <span className='bn-ico'><Plus size={24} strokeWidth={3} /></span>
        </button>
        <NavTab to='/chat' label='Inbox' icon={Inbox} badge={unread} />
        <NavTab to='/profile' label='Profile' icon={User} />
      </nav>

      <Sheet open={create} onClose={() => setCreate(false)} title='Create'>
        <button className='gc-row' style={{ width: '100%', textAlign: 'left' }} onClick={() => go('/create-post')}>
          <span className='ico'><Edit3 size={20} /></span><div className='grow'><b>Create post</b><div className='tiny muted'>Share a photo, clip, replay or puzzle</div></div>
        </button>
        <button className='gc-row' style={{ width: '100%', textAlign: 'left' }} onClick={() => go('/live/start')}>
          <span className='ico'><Video size={20} /></span><div className='grow'><b>Go Live</b><div className='tiny muted'>Stream your game with your face cam</div></div>
        </button>
        <button className='gc-row' style={{ width: '100%', textAlign: 'left' }} onClick={() => go('/play')}>
          <span className='ico'><Gamepad2 size={20} /></span><div className='grow'><b>Play a game</b><div className='tiny muted'>Chess, checkers and tournaments</div></div>
        </button>
      </Sheet>
    </>
  );
}

export function PlainLayout() {
  return <Outlet />;
}
