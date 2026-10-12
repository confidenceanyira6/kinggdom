import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field } from '../components/ui';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import type { GameType } from '../types';

export const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'United States', 'United Kingdom', 'Canada', 'India', 'Germany', 'Brazil', 'Other'];
const SKILLS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function Setup() {
  const nav = useNavigate();
  const user = useApp((s) => s.user)!;
  const { setUser, setTokens, toast } = useApp.getState();
  const [username, setUsername] = useState(user.username);
  const [country, setCountry] = useState('Nigeria');
  const [game, setGame] = useState<GameType>('chess');
  const [skill, setSkill] = useState('Beginner');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (username.trim().length < 3) { toast('Username must be at least 3 characters'); return; }
    setBusy(true);
    try {
      const r = await api.auth.completeProfile({ username: username.trim(), country, favoriteGame: game, skill, referralCode: ref.trim() || undefined });
      setUser(r.user);
      setTokens(r.starterTokens);
      toast('Welcome! ' + r.starterTokens + ' starter coins added');
      nav('/home', { replace: true });
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav' style={{ paddingTop: 28 }}>
      <h2 style={{ fontSize: 22 }}>Set up your profile</h2>
      <p className='muted mb12'>A few quick questions so we can match you with the right players.</p>
      <Field label='Username' value={username} onChange={(e) => setUsername(e.target.value)} />
      <label className='field'><span className='small muted'>Country</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <span className='small muted'>Favorite game</span>
      <div className='grid2 mb12 mt8'>
        {(['chess', 'checkers'] as GameType[]).map((g) => (
          <button key={g} className='tile' style={game === g ? { borderColor: 'var(--gold)' } : undefined} onClick={() => setGame(g)}>
            <span style={{ fontSize: 28 }}>{g === 'chess' ? '♞' : '⛀'}</span>{g === 'chess' ? 'Chess' : 'Checkers'}
          </button>
        ))}
      </div>
      <span className='small muted'>Skill level</span>
      <div className='row wrap gap8 mb12 mt8'>{SKILLS.map((s) => <button key={s} className={'chip' + (skill === s ? ' active' : '')} onClick={() => setSkill(s)}>{s}</button>)}</div>
      <Field label='Referral code (optional)' value={ref} onChange={(e) => setRef(e.target.value)} />
      <Button variant='gold' full loading={busy} onClick={submit}>Start playing</Button>
    </div>
  );
}
