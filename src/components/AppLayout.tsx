import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Compass, Gamepad2, Home, Menu as MenuIcon, Radio, User } from 'lucide-react';
import { useApp } from '../store/useApp';

const tabs = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/play', label: 'Play', icon: Gamepad2, center: true },
  { to: '/live', label: 'Live', icon: Radio },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/menu', label: 'Menu', icon: MenuIcon },
];

export function RequireAuth() {
  const user = useApp((s) => s.user);
  const loc = useLocation();
  if (!user) return <Navigate to='/login' replace state={{ from: loc.pathname }} />;
  if (!user.profileComplete && loc.pathname !== '/setup') return <Navigate to='/setup' replace />;
  return <Outlet />;
}

export function TabLayout() {
  return (
    <>
      <Outlet />
      <nav className='bnav'>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => 'bn' + (isActive ? ' active' : '') + (t.center ? ' center' : '')}>
            <span className='bn-ico'>
              <t.icon size={t.center ? 26 : 21} />
            </span>
            <small>{t.label}</small>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function PlainLayout() {
  return <Outlet />;
}
