import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { Button, Field, TopBar } from '../components/ui';
import type { GameType } from '../types';

export default function CreateTournament() {
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  const [name, setName] = useState('');
  const [game, setGame] = useState<GameType>('chess');
  const [prize, setPrize] = useState('1000');
  const [fee, setFee] = useState('0');
  const [max, setMax] = useState('32');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (name.trim().length < 3) { toast('Give your tournament a name'); return; }
    setBusy(true);
    try {
      const t = await api.tournaments.create({ name: name.trim(), game, prizePool: Number(prize) || 0, entryFee: Number(fee) || 0, maxPlayers: Number(max) || 8 });
      toast('Tournament created');
      nav('/tournaments/' + t.id, { replace: true });
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Create Tournament' />
      <Field label='Name' placeholder='Friday Night Blitz' value={name} onChange={(e) => setName(e.target.value)} />
      <span className='small muted'>Game</span>
      <div className='row gap8 mt8 mb12'>{(['chess', 'checkers'] as GameType[]).map((g) => <button key={g} className={'chip' + (game === g ? ' active' : '')} onClick={() => setGame(g)}>{g === 'chess' ? 'Chess' : 'Checkers'}</button>)}</div>
      <Field label='Prize pool (tokens)' type='number' inputMode='numeric' value={prize} onChange={(e) => setPrize(e.target.value)} />
      <Field label='Entry fee (0 for free)' type='number' inputMode='numeric' value={fee} onChange={(e) => setFee(e.target.value)} />
      <Field label='Max players' type='number' inputMode='numeric' value={max} onChange={(e) => setMax(e.target.value)} />
      <Button full loading={busy} onClick={create}>Create Tournament</Button>
    </div>
  );
}
