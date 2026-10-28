import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Trophy } from 'lucide-react';
import { Button, Coin, Empty, Loading, TopBar, fmt } from '../components/ui';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { hostApi } from '../services/hostApi';
import type { HostDashboard, HostPlan } from '../services/hostApi';
import { useApp } from '../store/useApp';

interface State { dash: HostDashboard; plan: HostPlan | null; pct: number }

function Line({ label, value, minus, strong }: { label: string; value: number; minus?: boolean; strong?: boolean }) {
  return (
    <div className='list-row'>
      <span className='grow small'>{label}</span>
      <b className={'row gap4' + (strong ? ' gold' : '')}><Coin />{minus ? '−' : ''}{fmt(value)}</b>
    </div>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function Host() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [s, setS] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const returning = !!(sp.get('reference') || sp.get('trxref'));

  const load = useCallback(async () => {
    try {
      const [dash, plan, pct] = await Promise.all([hostApi.dashboard(), hostApi.plan(), hostApi.feePct()]);
      setS({ dash, plan, pct });
    } catch (e) { useApp.getState().toast((e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isHost = !!s?.dash.isHost;
  // After paying, the payment provider confirms in the background: check a few times until hosting is active.
  useEffect(() => {
    if (!returning || isHost) return;
    let n = 0;
    const id = setInterval(() => { n += 1; void load(); if (n >= 8) clearInterval(id); }, 3000);
    return () => clearInterval(id);
  }, [returning, isHost, load]);

  const subscribe = async () => {
    if (!s?.plan) return;
    setBusy(true);
    try { await hostApi.subscribe(s.plan.id); } catch (e) { useApp.getState().toast((e as Error).message); setBusy(false); }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await hostApi.cancel();
      useApp.getState().toast('Renewal cancelled. Hosting stays active until the end of the period.');
      setAskCancel(false);
      await load();
    } catch (e) { useApp.getState().toast((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <div className='screen nonav'><TopBar title='Host competitions' /><Loading /></div>;
  if (!s) return <div className='screen nonav'><TopBar title='Host competitions' /><Empty text='Could not load hosting details. Please try again.' /></div>;

  const { dash, plan, pct } = s;
  const example = 100;
  const exampleFee = Math.floor((example * pct) / 100);

  const feeCard = (
    <div className='card mt12'>
      <b>How the {pct}% platform fee works</b>
      <p className='small muted mt8'>Entry fees: {pct}% of every entry fee goes to Kinggdom. The rest goes into your prize pool.</p>
      <p className='small muted mt8'>Gifts and tips: while you are live with your competition, you keep {100 - pct}% and Kinggdom keeps {pct}%.</p>
      <p className='small mt8'>Example: a {example}-token gift gives you <b className='gold'>{example - exampleFee}</b> tokens and Kinggdom <b>{exampleFee}</b>.</p>
      <p className='tiny muted mt8'>Every fee is listed in your host dashboard. Nothing is hidden.</p>
    </div>
  );

  if (!dash.isHost) {
    return (
      <div className='screen nonav'>
        <TopBar title='Host competitions' />
        {returning && <div className='card'><b className='small'>Payment received. Activating your Host access…</b></div>}
        <div className='card hero'>
          <div className='row gap8'><Trophy size={22} className='gold' /><b>{plan ? plan.name : 'Kingdom Host'}</b></div>
          {plan ? (
            <>
              <h2 className='gold mt8'>${plan.priceUsd.toFixed(2)} <span className='small muted'>/ month</span></h2>
              {plan.features.map((f) => <div key={f} className='row gap8 mt8'><Check size={16} className='gold' /><span className='small'>{f}</span></div>)}
              <Button full className='mt16' loading={busy} onClick={subscribe}>Subscribe for ${plan.priceUsd.toFixed(2)} / month</Button>
            </>
          ) : <p className='small muted mt8'>Host subscriptions are not available yet.</p>}
        </div>
        {feeCard}
      </div>
    );
  }

  const { gifts, entries } = dash;
  return (
    <div className='screen nonav'>
      <TopBar title='Host dashboard' />
      <div className='card'>
        <div className='row between'>
          <b>Kingdom Host</b>
          <span className='kpill'>Active</span>
        </div>
        <p className='small muted mt8'>{dash.hostUntil ? (dash.cancelAtPeriodEnd ? 'Ends on ' : 'Renews or ends on ') + day(dash.hostUntil) : ''}</p>
        <Button full className='mt12' onClick={() => nav('/tournaments/new')}><Trophy size={16} /> Host a competition</Button>
      </div>

      {feeCard}

      <div className='section-title'><h3>Your earnings</h3></div>
      <div className='card'>
        <b className='small'>Gifts and tips while live with a competition ({fmt(gifts.count)})</b>
        <Line label='Sent by fans' value={gifts.gross} />
        <Line label={'Kinggdom platform fee (' + pct + '%)'} value={gifts.fee} minus />
        <Line label='You received' value={gifts.net} strong />
      </div>
      <div className='card'>
        <b className='small'>Entry fees from {fmt(entries.players)} players</b>
        <Line label='Collected' value={entries.gross} />
        <Line label={'Kinggdom platform fee (' + pct + '%)'} value={entries.fee} minus />
        <Line label='Added to your prize pools' value={Math.max(entries.gross - entries.fee, 0)} strong />
      </div>

      <div className='section-title'><h3>Your competitions</h3></div>
      {dash.competitions.length === 0 ? <Empty text='You have not hosted a competition yet' /> : (
        <div className='card'>
          {dash.competitions.map((c) => (
            <Link key={c.id} to={'/tournaments/' + c.id} className='list-row'>
              <div className='grow'>
                <b className='small'>{c.name}</b>
                <div className='tiny muted'>{c.status.replace('_', ' ')} · {c.players} players · {c.entryFee ? 'entry ' + fmt(c.entryFee) : 'free'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className='tiny muted'>Prize pool {fmt(c.prizePool)}</div>
                <div className='tiny muted'>Platform fee {fmt(c.platformFee)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className='grid2 mt16'>
        {plan && <Button variant='ghost' loading={busy} onClick={subscribe}>Add 1 month (${plan.priceUsd.toFixed(2)})</Button>}
        {!dash.cancelAtPeriodEnd && <Button variant='ghost' onClick={() => setAskCancel(true)}>Stop renewing</Button>}
      </div>

      <ConfirmSheet
        open={askCancel}
        title='Stop renewing Host?'
        message='You can keep hosting until the end of the paid period. Your open competitions are not affected.'
        confirmLabel='Stop renewing'
        danger
        busy={busy}
        onCancel={() => setAskCancel(false)}
        onConfirm={cancel}
      />
    </div>
  );
}
