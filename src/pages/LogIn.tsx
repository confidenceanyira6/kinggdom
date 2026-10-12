import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { Button, Field, Logo } from '../components/ui';
import { SocialButtons } from './SignUp';
import { api } from '../services/api';
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
    if (!id.trim() || !pw) { setErr('Enter your email or phone and password.'); return; }
    setBusy(true); setErr('');
    try {
      const u = await api.auth.logIn({ identifier: id.trim(), password: pw });
      setUser(u);
      nav('/home', { replace: true });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav' style={{ paddingTop: 36 }}>
      <div className='center col gap8 mb12'><Logo /><h2>Welcome back</h2></div>
      <Field icon={<Mail size={16} />} placeholder='Email or Phone Number' value={id} onChange={(e) => setId(e.target.value)} />
      <Field icon={<Lock size={16} />} type='password' placeholder='Password' value={pw} onChange={(e) => setPw(e.target.value)} />
      <div style={{ textAlign: 'right' }} className='mb12'><button className='link small' onClick={() => toast('Password reset link will be sent once the backend is connected')}>Forgot password?</button></div>
      {err && <p className='red small mb8'>{err}</p>}
      <Button full loading={busy} onClick={submit}>Log In</Button>
      <div className='divider'>or</div>
      <SocialButtons />
      <p className='tc muted small mt16'>Don't have an account? <Link className='link' to='/signup'>Sign Up</Link></p>
    </div>
  );
}
