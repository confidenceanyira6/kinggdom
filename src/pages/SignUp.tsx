import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { Button, Field, Logo } from '../components/ui';
import { api } from '../services/api';
import { useApp } from '../store/useApp';

export function SocialButtons() {
  const nav = useNavigate();
  const setUser = useApp((s) => s.setUser);
  const toast = useApp((s) => s.toast);
  const go = async (p: 'google' | 'apple') => {
    try {
      const u = await api.auth.social(p);
      setUser(u);
      nav(u.profileComplete ? '/home' : '/setup', { replace: true });
    } catch (e) { toast((e as Error).message); }
  };
  return (
    <div className='col gap8'>
      <Button variant='ghost' full onClick={() => go('google')}>🇦 Continue with Google</Button>
      <Button variant='ghost' full onClick={() => go('apple')}>🍎 Continue with Apple</Button>
    </div>
  );
}

export default function SignUp() {
  const nav = useNavigate();
  const setUser = useApp((s) => s.setUser);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!name.trim() || !id.trim().includes('@') || pw.length < 6) { setErr('Enter your name, a valid email address, and a password (6+ characters).'); return; }
    setBusy(true); setErr('');
    try {
      const u = await api.auth.signUp({ name: name.trim(), identifier: id.trim(), password: pw });
      setUser(u);
      nav('/setup', { replace: true });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav' style={{ paddingTop: 36 }}>
      <div className='center col gap8 mb12'><Logo /><h2>Create your account</h2></div>
      <Field icon={<User size={16} />} placeholder='Full Name' value={name} onChange={(e) => setName(e.target.value)} />
      <Field icon={<Mail size={16} />} type='email' placeholder='Email address' value={id} onChange={(e) => setId(e.target.value)} autoCapitalize='none' autoCorrect='off' />
      <Field icon={<Lock size={16} />} type='password' placeholder='Password' value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className='red small mb8'>{err}</p>}
      <Button full loading={busy} onClick={submit}>Sign Up</Button>
      <div className='divider'>or</div>
      <SocialButtons />
      <p className='tc muted small mt16'>Already have an account? <Link className='link' to='/login'>Log in</Link></p>
    </div>
  );
}
