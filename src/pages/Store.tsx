import { useState } from 'react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Button, Coin, Loading, TopBar, fmt } from '../components/ui';

const METHODS = ['Pay with Card', 'Pay with Google Pay', 'Pay with Apple Pay'];

export default function Store() {
  const tokens = useApp((s) => s.tokens);
  const { setTokens, toast } = useApp.getState();
  const pk = useAsync(() => api.wallet.packages());
  const [method, setMethod] = useState(METHODS[0]);
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (id: string) => {
    setBusy(id);
    try { setTokens(await api.wallet.buy(id, method)); toast('Tokens added to your wallet'); } catch (e) { toast((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Store' right={<span className='token-pill'><Coin />{fmt(tokens)}</span>} />
      <div className='section-title' style={{ marginTop: 4 }}><h3>Token Packages</h3></div>
      {pk.loading ? <Loading /> : (
        <div className='card'>
          {(pk.data ?? []).map((p) => (
            <div key={p.id} className='list-row'>
              <Coin /><b className='grow'>{fmt(p.tokens)} {p.popular && <span className='pill'>POPULAR</span>}</b>
              <Button sm loading={busy === p.id} onClick={() => buy(p.id)}>${p.price.toFixed(2)}</Button>
            </div>
          ))}
        </div>
      )}
      <div className='section-title'><h3>Payment Methods</h3></div>
      {METHODS.map((m) => <button key={m} className={'pay' + (m === method ? ' sel' : '')} style={{ width: '100%' }} onClick={() => setMethod(m)}>{m}</button>)}
      <p className='tiny muted'>Purchases are simulated until the payment provider is connected on the backend.</p>
    </div>
  );
}
