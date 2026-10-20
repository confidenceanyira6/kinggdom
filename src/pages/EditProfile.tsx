import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Avatar, Button, Field, TopBar } from '../components/ui';
import { COUNTRIES } from './Setup';
import { api } from '../services/api';
import { profileApi } from '../services/profileApi';
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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    profileApi.avatarOf(user.id).then((a) => { if (alive && a) setAvatar(a); }).catch(() => undefined);
    return () => { alive = false; };
  }, [user.id]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const before = avatar;
    setAvatar(URL.createObjectURL(f));
    setUploading(true);
    try {
      setAvatar(await profileApi.uploadAvatar(f));
      toast('Photo updated');
    } catch (err) {
      setAvatar(before);
      toast((err as Error).message);
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (username.trim().length < 3) { toast('Username must be at least 3 characters'); return; }
    if (!name.trim()) { toast('Display name cannot be empty'); return; }
    setBusy(true);
    try {
      if (username.trim() !== user.username) await profileApi.updateUsername(username.trim());
      const u = await api.users.update({ name: name.trim(), bio, gender, country });
      setUser(u);
      toast('Profile updated');
      nav(-1);
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Edit Profile' />
      <div className='col center gap8 mb12'>
        <Avatar name={name || username} src={avatar} size={88} ring />
        <input ref={file} type='file' accept='image/*' hidden onChange={onFile} />
        <button className='link small row gap4' disabled={uploading} onClick={() => file.current?.click()}><Camera size={14} /> {uploading ? 'Uploading…' : 'Change Photo'}</button>
      </div>
      <Field label='Display name' value={name} onChange={(e) => setName(e.target.value)} />
      <Field label='Username' value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize='none' autoCorrect='off' />
      <label className='field'><span className='small muted'>Bio</span><textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} /></label>
      <div className='tiny muted tc mb12'>{bio.length}/160</div>
      <label className='field'><span className='small muted'>Gender</span>
        <select value={gender} onChange={(e) => setGender(e.target.value)}><option value=''>Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></select>
      </label>
      <label className='field'><span className='small muted'>Location</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <Button full loading={busy} disabled={uploading} onClick={save}>Save Changes</Button>
    </div>
  );
}
