import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Button, Coin, Empty, Field, Loading, Sheet, TopBar, fmt } from '../components/ui';

export default function Wallet() {
  const nav = useNavigate();
  const { setTokens, toast } = useApp.getState();
  const { data, loading, reload } = useAsync(() => api.wallet.get().then((w) => { setTokens(w.tokens); return w; }));
  const [sheet, setSheet] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = Math.floor(Number(amount));
    if (!n || n <= 0) { toast('Enter a valid amount'); return; }
    setBusy(true);
    try {
      const t = sheet === 'deposit' ? await api.wallet.deposit(n) : await api.wallet.withdraw(n);
      setTokens(t);
      toast(sheet === 'deposit' ? 'Deposit successful' : 'Withdrawal requested');
      setSheet(null); setAmount('');
      reload();
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Wallet' />
      {loading || !data ? <Loading /> : (
        <>
          <div className='hero'>
            <div className='row gap8'><Coin /><span className='muted small'>Balance</span></div>
            <h1 style={{ fontSize: 32 }} className='gold'>{fmt(data.tokens)} <span className='small muted'>tokens</span></h1>
            <div className='small muted'>${data.usd.toFixed(2)}</div>
            <Button full className='mt12' onClick={() => nav('/store')}>Buy Tokens</Button>
          </div>
          <div className='grid3 mt16'>
            <button className='tile' onClick={() => setSheet('deposit')}><span className='t-ico'><ArrowDownToLine size={20} /></span>Deposit</button>
            <button className='tile' onClick={() => setSheet('withdraw')}><span className='t-ico'><ArrowUpFromLine size={20} /></span>Withdraw</button>
            <button className='tile' onClick={() => document.getElementById('tx')?.scrollIntoView({ behavior: 'smooth' })}><span className='t-ico'><History size={20} /></span>History</button>
          </div>
          <div className='section-title' id='tx'><h3>Transaction History</h3></div>
          <div className='card'>
            {data.transactions.length === 0 && <Empty text='No transactions yet' />}
            {data.transactions.map((t) => (
              <div key={t.id} className='list-row'>
                <div className='grow'><b className='small'>{t.label}</b><div className='tiny muted'>{t.time}</div></div>
                <b className={t.amount > 0 ? 'green' : 'red'}>{t.amount > 0 ? '+' : ''}{fmt(t.amount)}</b>
              </div>
            ))}
          </div>
        </>
      )}
      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet === 'deposit' ? 'Deposit tokens' : 'Withdraw tokens'}>
        <Field type='number' inputMode='numeric' placeholder='Amount in tokens' value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className='tiny muted mb12'>Real payments and payouts are processed by the backend payment provider once connected.</p>
        <Button full loading={busy} onClick={submit}>{sheet === 'deposit' ? 'Deposit' : 'Request withdrawal'}</Button>
      </Sheet>
    </div>
  );
}
