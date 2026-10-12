import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Avatar, Button, Field, TopBar } from '../components/ui';
import { COUNTRIES } from './Setup';
import { api } from '../services/api';
import { useApp } from '../store/useApp';

export default function EditProfile() {
  const nav = useNavigate();
  const user = useApp((s) => s.user)!;
  const { setUser, toast } = useApp.getState();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [gender, setGender] = useState(user.gender ?? '');
  const [country, setCountry] = useState(user.country || 'Nigeria');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (username.trim().length < 3) { toast('Username must be at least 3 characters'); return; }
    setBusy(true);
    try {
      const u = await api.users.update({ name, username: username.trim(), bio, gender, country });
      setUser(u);
      toast('Profile updated');
      nav(-1);
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Edit Profile' />
      <div className='col center gap8 mb12'>
        <Avatar name={name || username} size={88} ring />
        <input ref={file} type='file' accept='image/*' hidden onChange={() => toast('Photo upload connects with the backend storage')} />
        <button className='link small row gap4' onClick={() => file.current?.click()}><Camera size={14} /> Change Photo</button>
      </div>
      <Field label='Display name' value={name} onChange={(e) => setName(e.target.value)} />
      <Field label='Username' value={username} onChange={(e) => setUsername(e.target.value)} />
      <label className='field'><span className='small muted'>Bio</span><textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} /></label>
      <label className='field'><span className='small muted'>Gender</span>
        <select value={gender} onChange={(e) => setGender(e.target.value)}><option value=''>Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></select>
      </label>
      <label className='field'><span className='small muted'>Location</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <Button full loading={busy} onClick={save}>Save Changes</Button>
    </div>
  );
}
