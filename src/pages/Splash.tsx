import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui';
import { useApp } from '../store/useApp';

export default function Splash() {
  const nav = useNavigate();
  const user = useApp((s) => s.user);
  useEffect(() => {
    const t = setTimeout(() => nav(user ? '/home' : '/onboarding', { replace: true }), 1500);
    return () => clearTimeout(t);
  }, [nav, user]);
  return (
    <div className='splash'>
      <Logo big />
      <p className='muted'>Play · Compete · Connect</p>
      <div className='splash-foot small muted'>Chess · Checkers · Tournaments · Live Streams · Chat · Gifts</div>
    </div>
  );
}
