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
      <p className='muted'>Play · Connect · Win</p>
      <div className='splash-bar'><i /></div>
      <div className='splash-foot small muted'>Loading your kingdom...</div>
    </div>
  );
}
