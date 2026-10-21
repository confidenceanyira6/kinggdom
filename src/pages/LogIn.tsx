import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { Button, Field, Logo } from '../components/ui';
import { SocialButtons } from './SignUp';
import { api } from '../services/api';
import { profileApi } from '../services/profileApi';
import { useApp } from '../store/useApp';

export default function LogIn() {
  const nav = useNavigate();
  const setUser = useApp((s) => s.setUser);
  const toast = useApp((s) => s.toast);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!id.trim() || !pw) { setErr('Enter your email and password.'); return; }
    setBusy(true); setErr('');
    try {
      const u = await api.auth.logIn({ identifier: id.trim(), password: pw });
      setUser(u);
      nav(u.profileComplete ? '/home' : '/setup', { replace: true });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const forgot = async () => {
    const v = id.trim();
    if (!v.includes('@')) { setErr('Type your email above, then tap Forgot password.'); return; }
    setErr('');
    try { await profileApi.resetPassword(v); toast('Password reset link sent. Check your email.'); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className='screen nonav' style={{ paddingTop: 36 }}>
      <div className='center col gap8 mb12'><Logo /><h2>Welcome back</h2></div>
      <Field icon={<Mail size={16} />} type='email' placeholder='Email address' value={id} onChange={(e) => setId(e.target.value)} autoCapitalize='none' autoCorrect='off' />
      <Field icon={<Lock size={16} />} type='password' placeholder='Password' value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      <div style={{ textAlign: 'right' }} className='mb12'><button className='link small' onClick={forgot}>Forgot password?</button></div>
      {err && <p className='red small mb8'>{err}</p>}
      <Button full loading={busy} onClick={submit}>Log In</Button>
      <div className='divider'>or</div>
      <SocialButtons />
      <p className='tc muted small mt16'>Don't have an account? <Link className='link' to='/signup'>Sign Up</Link></p>
    </div>
  );
}
