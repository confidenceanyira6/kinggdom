import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Avatar, Button, Toggle, TopBar } from '../components/ui';
import { useApp } from '../store/useApp';
import { api } from '../services/api';
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

  const logout = async () => { await api.auth.logOut(); signOut(); nav('/login', { replace: true }); };

  return (
    <div className='screen nonav'>
      <TopBar title='Settings' />
      <Link to='/profile/edit' className='card row gap12'><Avatar name={user!.name} size={46} /><div className='grow'><b>{user!.username}</b><div className='tiny muted'>Edit Profile</div></div><ChevronRight size={18} className='muted' /></Link>

      <div className='section-title'><h3>Account and Security</h3></div>
      <div className='card'>
        <Row label='Two-factor authentication'><Toggle checked={twofa} onChange={(v) => { setTwofa(v); toast(v ? '2FA enabled once backend is connected' : '2FA disabled'); }} /></Row>
        <Row label='Private profile'><Toggle checked={priv} onChange={setPriv} /></Row>
        <Row label='Change password'><button className='link small' onClick={() => toast('Available when the backend is connected')}>Change</button></Row>
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
    </div>
  );
}
