import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { hostApi } from '../services/hostApi';
import { useFeePct } from '../hooks/useFeePct';
import { useApp } from '../store/useApp';
import { Button, Field, Loading, TopBar } from '../components/ui';
import type { GameType } from '../types';

export default function CreateTournament() {
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  const pct = useFeePct();
  const [host, setHost] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [game, setGame] = useState<GameType>('chess');
  const [prize, setPrize] = useState('1000');
  const [fee, setFee] = useState('0');
  const [max, setMax] = useState('32');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    hostApi.dashboard().then((d) => { if (alive) setHost(d.isHost); }).catch(() => { if (alive) setHost(false); });
    return () => { alive = false; };
  }, []);

  const create = async () => {
    if (name.trim().length < 3) { toast('Give your tournament a name'); return; }
    setBusy(true);
    try {
      const t = await api.tournaments.create({ name: name.trim(), game, prizePool: Number(prize) || 0, entryFee: Number(fee) || 0, maxPlayers: Number(max) || 8 });
      toast('Tournament created');
      nav('/tournaments/' + t.id, { replace: true });
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  if (host === null) return <div className='screen nonav'><TopBar title='Host a competition' /><Loading /></div>;

  if (!host) {
    return (
      <div className='screen nonav'>
        <TopBar title='Host a competition' />
        <div className='card hero'>
          <b>Hosting needs a Kingdom Host subscription</b>
          <p className='small muted mt8'>Subscribe for $5 a month to create your own competitions, set the entry fee and prizes, and earn from gifts while you are live.</p>
          {pct !== null && <p className='tiny muted mt8'>Kinggdom keeps a {pct}% platform fee on entry fees and on gifts you receive while live with your competition.</p>}
          <Link to='/host'><Button full className='mt12'>See Host plan</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className='screen nonav'>
      <TopBar title='Host a competition' />
      {pct !== null && (
        <div className='card mb12'>
          <b className='small'>Platform fee: {pct}%</b>
          <p className='tiny muted mt8'>{pct}% of every entry fee goes to Kinggdom and the rest goes to your prize pool. While you are live with this competition you keep {100 - pct}% of gifts and tips. <Link to='/host' className='link'>See how it works</Link></p>
        </div>
      )}
      <Field label='Name' placeholder='Friday Night Blitz' value={name} onChange={(e) => setName(e.target.value)} />
      <span className='small muted'>Game</span>
      <div className='row gap8 mt8 mb12'>{(['chess', 'checkers'] as GameType[]).map((g) => <button key={g} className={'chip' + (game === g ? ' active' : '')} onClick={() => setGame(g)}>{g === 'chess' ? 'Chess' : 'Checkers'}</button>)}</div>
      <Field label='Starting prize pool from your wallet (tokens)' type='number' inputMode='numeric' value={prize} onChange={(e) => setPrize(e.target.value)} />
      <Field label='Entry fee (0 for free)' type='number' inputMode='numeric' value={fee} onChange={(e) => setFee(e.target.value)} />
      <Field label='Max players' type='number' inputMode='numeric' value={max} onChange={(e) => setMax(e.target.value)} />
      <Button full loading={busy} onClick={create}>Create Competition</Button>
    </div>
  );
}
