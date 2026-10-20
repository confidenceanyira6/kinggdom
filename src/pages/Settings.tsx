import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Avatar, Button, Field, Sheet, Toggle, TopBar } from '../components/ui';
import { useApp } from '../store/useApp';
import { api } from '../services/api';
import { profileApi } from '../services/profileApi';
import { useLocalSetting } from '../hooks/useLocalSetting';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className='list-row'><b className='grow small'>{label}</b>{children}</div>;
}

export default function Settings() {
  const nav = useNavigate();
  const { user, theme, setTheme, signOut, toast } = useApp();
  const [push, setPush] = useLocalSetting('push', true);
  const [msgs, setMsgs] = useLocalSetting('msgs', true);
  const [sound, setSound] = useLocalSetting('sound', true);
  const [legal, setLegal] = useLocalSetting('legal', true);
  const [twofa, setTwofa] = useLocalSetting('2fa', false);
  const [priv, setPriv] = useLocalSetting('private', false);
  const [lang, setLang] = useLocalSetting('lang', 'English');
  const [sheet, setSheet] = useState<'password' | 'email' | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const logout = async () => { await api.auth.logOut(); signOut(); nav('/login', { replace: true }); };

  const close = () => { setSheet(null); setPw(''); setPw2(''); setEmail(''); };

  const submitPassword = async () => {
    if (pw.length < 8) { toast('Password must be at least 8 characters'); return; }
    if (pw !== pw2) { toast('Passwords do not match'); return; }
    setBusy(true);
    try { await profileApi.changePassword(pw); toast('Password changed'); close(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  const submitEmail = async () => {
    const v = email.trim();
    if (!v.includes('@') || !v.includes('.')) { toast('Enter a valid email address'); return; }
    setBusy(true);
    try { await profileApi.changeEmail(v); toast('Check your new email to confirm the change'); close(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Settings' />
      <Link to='/profile/edit' className='card row gap12'><Avatar name={user!.name} size={46} /><div className='grow'><b>{user!.username}</b><div className='tiny muted'>Edit Profile</div></div><ChevronRight size={18} className='muted' /></Link>

      <div className='section-title'><h3>Account and Security</h3></div>
      <div className='card'>
        <Row label='Change email'><button className='link small' onClick={() => setSheet('email')}>Change</button></Row>
        <Row label='Change password'><button className='link small' onClick={() => setSheet('password')}>Change</button></Row>
        <Row label='Two-factor authentication'><Toggle checked={twofa} onChange={(v) => { setTwofa(v); toast(v ? '2FA enabled once backend is connected' : '2FA disabled'); }} /></Row>
        <Row label='Private profile'><Toggle checked={priv} onChange={setPriv} /></Row>
      </div>

      <div className='section-title'><h3>Notifications</h3></div>
      <div className='card'>
        <Row label='Push notifications'><Toggle checked={push} onChange={setPush} /></Row>
        <Row label='Message alerts'><Toggle checked={msgs} onChange={setMsgs} /></Row>
      </div>

      <div className='section-title'><h3>Game Settings</h3></div>
      <div className='card'>
        <Row label='Sound effects'><Toggle checked={sound} onChange={setSound} /></Row>
        <Row label='Highlight legal moves'><Toggle checked={legal} onChange={setLegal} /></Row>
      </div>

      <div className='section-title'><h3>Appearance and Language</h3></div>
      <div className='card'>
        <Row label='Light theme'><Toggle checked={theme === 'light'} onChange={(v) => setTheme(v ? 'light' : 'dark')} /></Row>
        <Row label='Language'>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: 130, padding: '6px 10px' }}>{['English', 'French', 'Spanish', 'Portuguese', 'Arabic'].map((l) => <option key={l}>{l}</option>)}</select>
        </Row>
      </div>

      <div className='section-title' id='help'><h3>Help and About</h3></div>
      <div className='card'>
        <Row label='Help and Support'><a className='link small' href='mailto:support@kinggdom.app'>Contact us</a></Row>
        <Row label='Terms of Service'><span className='muted small'>View</span></Row>
        <Row label='Privacy Policy'><span className='muted small'>View</span></Row>
        <Row label='About Kinggdom'><span className='muted small'>v0.1.0</span></Row>
      </div>
      <Button variant='danger' full className='mt16' onClick={logout}>Log Out</Button>

      <Sheet open={sheet === 'password'} onClose={close} title='Change password'>
        <Field label='New password' type='password' value={pw} onChange={(e) => setPw(e.target.value)} autoComplete='new-password' />
        <Field label='Confirm new password' type='password' value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete='new-password' />
        <Button full loading={busy} onClick={submitPassword}>Update password</Button>
      </Sheet>

      <Sheet open={sheet === 'email'} onClose={close} title='Change email'>
        <Field label='New email address' type='email' value={email} onChange={(e) => setEmail(e.target.value)} autoComplete='email' />
        <p className='tiny muted mb12'>We will send a confirmation link to the new address.</p>
        <Button full loading={busy} onClick={submitEmail}>Update email</Button>
      </Sheet>
    </div>
  );
}
