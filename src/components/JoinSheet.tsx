import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useFeePct } from '../hooks/useFeePct';
import { useApp } from '../store/useApp';
import type { Tournament } from '../types';
import { Button, Coin, Sheet, fmt } from './ui';

/**
 * Confirm-and-pay sheet for joining a competition with tokens.
 * The actual charge happens server-side in the register_for_tournament RPC (balance check, fee, prize pool).
 * For hosted competitions the platform fee is shown so players can see exactly where their tokens go.
 */
export function JoinSheet({ t, open, onClose, onJoined }: { t: Tournament; open: boolean; onClose: () => void; onJoined: (t: Tournament) => void }) {
  const nav = useNavigate();
  const tokens = useApp((s) => s.tokens);
  const pct = useFeePct();
  const [busy, setBusy] = useState(false);
  const fee = t.entryFee;
  const short = tokens < fee;
  const hosted = t.official === false && fee > 0 && pct !== null;
  const cut = hosted && pct !== null ? Math.floor((fee * pct) / 100) : 0;

  useEffect(() => {
    if (!open) return;
    api.wallet.get().then((w) => useApp.getState().setTokens(w.tokens)).catch(() => undefined);
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    try {
      const joined = await api.tournaments.join(t.id);
      const w = await api.wallet.get().catch(() => null);
      if (w) useApp.getState().setTokens(w.tokens);
      useApp.getState().toast(fee > 0 ? 'You are in! ' + fmt(fee) + ' tokens paid' : 'You are in!');
      onJoined(joined);
    } catch (e) {
      const m = (e as Error).message;
      useApp.getState().toast(/insufficient/i.test(m) ? 'Not enough tokens. Buy more in the Store.' : m);
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={fee > 0 ? 'Join with tokens' : 'Join competition'}>
      <p className='small muted mb12'>{t.name}{t.host ? ' · hosted by @' + t.host.username : ''}</p>
      <div className='card'>
        <div className='list-row'><span className='grow small'>Entry fee</span><b className='gold row gap4'><Coin />{fee > 0 ? fmt(fee) + ' tokens' : 'Free'}</b></div>
        {hosted && (
          <>
            <div className='list-row'><span className='grow small'>Platform fee ({pct}%)</span><b className='row gap4'><Coin />{fmt(cut)}</b></div>
            <div className='list-row'><span className='grow small'>Goes to the prize pool</span><b className='row gap4'><Coin />{fmt(fee - cut)}</b></div>
          </>
        )}
        {fee > 0 && (
          <>
            <div className='list-row'><span className='grow small'>Your balance</span><b className='row gap4'><Coin />{fmt(tokens)}</b></div>
            {!short && <div className='list-row'><span className='grow small'>After joining</span><b className='row gap4'><Coin />{fmt(tokens - fee)}</b></div>}
          </>
        )}
      </div>
      {short && <p className='small red mt8'>You need {fmt(fee - tokens)} more tokens to enter.</p>}
      <div className='grid2 mt12'>
        <Button variant='ghost' disabled={busy} onClick={onClose}>Cancel</Button>
        {short
          ? <Button variant='gold' onClick={() => { onClose(); nav('/store'); }}>Get tokens</Button>
          : <Button loading={busy} onClick={confirm}>{fee > 0 ? 'Pay ' + fmt(fee) + ' tokens' : 'Join'}</Button>}
      </div>
    </Sheet>
  );
}
