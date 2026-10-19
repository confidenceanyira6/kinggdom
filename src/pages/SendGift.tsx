import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { OFFICIAL, useArena } from '../arena/store';
import { Button, Loading, TopBar } from '../components/ui';

export default function SendGift() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const to = sp.get('to') || 'KingMaster23';
  const official = to === OFFICIAL;
  const { setTokens, toast } = useApp.getState();
  const gifts = useAsync(() => api.gifts.list());
  const [sel, setSel] = useState('g1');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      setTokens(await api.gifts.send({ to, giftId: sel, qty }));
      const g = (gifts.data ?? []).find((x) => x.id === sel);
      const me = useApp.getState().user;
      // Gifts to the official stream go to the admin prize fund, not to the players.
      if (official && g && me) useArena.getState().recordGift(me.username, g.name, g.emoji, g.cost * qty);
      toast(official ? 'Gift sent to Kinggdom Official 🎁 Thank you for funding the prizes' : 'Gift sent to ' + to + ' 🎁');
      nav(-1);
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title={official ? 'Gift Kinggdom Official' : 'Send Gift to ' + to} />
      {official && <div className='admin-note mb12'>Gifts go to Kinggdom Official (the admin), not to the players. The admin uses gift revenue to pay prizes and fund championships.</div>}
      {gifts.loading ? <Loading /> : (
        <div className='grid3'>
          {(gifts.data ?? []).map((g) => (
            <button key={g.id} className={'gift' + (sel === g.id ? ' sel' : '')} onClick={() => setSel(g.id)}>
              <span className='em'>{g.emoji}</span><b className='small'>{g.name}</b><span className='tiny gold'>{g.cost}</span>
            </button>
          ))}
        </div>
      )}
      <div className='row center gap16 mt24'>
        <button className='icon-btn' onClick={() => setQty(Math.max(1, qty - 1))}>-</button><b style={{ fontSize: 20 }}>{qty}</b><button className='icon-btn' onClick={() => setQty(Math.min(99, qty + 1))}>+</button>
      </div>
      <Button variant='gold' full loading={busy} className='mt24' onClick={send}>Send Gift</Button>
    </div>
  );
}
