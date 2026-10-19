import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useCamera } from '../hooks/useCamera';
import { useMic } from '../hooks/useMic';
import { FaceCam } from '../components/StreamStage';
import { Button, Field, Tabs, Toggle, TopBar, fmt } from '../components/ui';
import { GAME_LABEL, allPlayerNames, fundOf, useArena } from '../arena/store';
import type { CompKind } from '../arena/types';
import type { GameType } from '../types';
import '../styles/arena.css';
import '../styles/arena-pages.css';

// Front-end flag only. Real admin tools must be protected by server-side role checks.
const ENABLED = import.meta.env.VITE_SHOW_ADMIN === 'true';

type Tab = 'tournaments' | 'stream' | 'gifts' | 'prizes';

export default function AdminArena() {
  const me = useApp((s) => s.user)!;
  const toast = useApp((s) => s.toast);
  const s = useArena();
  const [tab, setTab] = useState<Tab>('tournaments');
  const [name, setName] = useState('');
  const [game, setGame] = useState<GameType>('checkers');
  const [kind, setKind] = useState<CompKind>('monthly');
  const [pool, setPool] = useState('4000');
  const [first, setFirst] = useState('5');
  const [gap, setGap] = useState('5');
  const [picked, setPicked] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const cam = useCamera(ENABLED && preview && camOn);
  const mic = useMic(ENABLED && preview && micOn);

  if (!ENABLED) {
    return (
      <div className='screen nonav'>
        <TopBar title='Arena Admin' />
        <p className='muted tc mt24'>Admin tools are not enabled for this account.</p>
        <Link to='/home' className='link tc' style={{ display: 'block' }}>Back home</Link>
      </div>
    );
  }

  const fund = fundOf(s);
  const total = s.gifts.reduce((n, g) => n + g.tokens, 0);
  const names = allPlayerNames();
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const create = () => {
    const n = picked.length;
    if (!name.trim()) { toast('Give the competition a name'); return; }
    if (kind === 'monthly' && n < 3) { toast('Pick at least 3 players'); return; }
    if (kind === 'championship' && ![4, 8, 16].includes(n)) { toast('A championship needs 4, 8 or 16 players'); return; }
    s.createCompetition({ name: name.trim(), game, kind, players: picked, prizePool: Math.max(0, Number(pool) || 0), firstStartMinutes: Math.max(1, Number(first) || 5), gapMinutes: Math.max(1, Number(gap) || 5) });
    toast('Competition created. Invitations go out automatically at match time.');
    setName(''); setPicked([]);
  };

  const startNext = (compId: string) => {
    const c = s.comps.find((x) => x.id === compId);
    const nxt = c ? c.matches.filter((m) => m.status === 'scheduled' && m.a && m.b).sort((x, y) => (x.startsAt ?? 9e15) - (y.startsAt ?? 9e15))[0] : undefined;
    if (!nxt) { toast('No match is ready to start'); return; }
    s.startNow(nxt.id);
    toast('Invitations are going out now');
  };

  const options = s.comps.flatMap((c) => c.matches.filter((m) => m.status !== 'finished' && m.a && m.b).map((m) => ({ id: m.id, label: c.name + ' · ' + m.round + ' · ' + m.a + ' vs ' + m.b + ' (' + m.status + ')' })));

  const byGift: Record<string, { emoji: string; n: number; tokens: number }> = {};
  s.gifts.forEach((g) => {
    const row = byGift[g.name] ?? { emoji: g.emoji, n: 0, tokens: 0 };
    row.n += 1; row.tokens += g.tokens;
    byGift[g.name] = row;
  });

  const pay = (compId: string, idx: number) => {
    const err = s.payPrize(compId, idx);
    toast(err ?? 'Prize paid from the gift fund');
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Arena Admin' />
      <Tabs<Tab> tabs={[{ id: 'tournaments', label: 'Events' }, { id: 'stream', label: 'Stream' }, { id: 'gifts', label: 'Gifts' }, { id: 'prizes', label: 'Prizes' }]} value={tab} onChange={setTab} />

      {tab === 'tournaments' && (
        <>
          {s.comps.map((c) => {
            const done = c.matches.filter((m) => m.status === 'finished').length;
            return (
              <div key={c.id} className='card'>
                <div className='row between'>
                  <b>{c.name}</b>
                  <span className={'kpill' + (c.status === 'live' ? ' live' : c.status === 'completed' ? ' done' : '')}>{c.status}</span>
                </div>
                <div className='tiny muted mt4'>{GAME_LABEL[c.game]} · {c.kind === 'monthly' ? 'Monthly league' : 'Championship'} · {c.players.length} players · {done}/{c.matches.length} matches · pool {fmt(c.prizePool)}</div>
                <div className='grid2 mt8'>
                  <Button sm variant='ghost' onClick={() => startNext(c.id)}>Start next match now</Button>
                  <Button sm variant='danger' onClick={() => { if (window.confirm('Delete ' + c.name + '?')) s.deleteCompetition(c.id); }}><Trash2 size={14} /> Delete</Button>
                </div>
              </div>
            );
          })}

          <div className='section-title'><h3>Create competition</h3></div>
          <div className='card'>
            <Field label='Name' placeholder='e.g. November Chess League' value={name} onChange={(e) => setName(e.target.value)} />
            <span className='small muted'>Game</span>
            <div className='row gap8 mt8 mb12'>{(['checkers', 'chess'] as GameType[]).map((g) => <button key={g} className={'chip' + (game === g ? ' active' : '')} onClick={() => setGame(g)}>{GAME_LABEL[g]}</button>)}</div>
            <span className='small muted'>Format</span>
            <div className='row gap8 mt8 mb12'>
              <button className={'chip' + (kind === 'monthly' ? ' active' : '')} onClick={() => setKind('monthly')}>Monthly league</button>
              <button className={'chip' + (kind === 'championship' ? ' active' : '')} onClick={() => setKind('championship')}>Championship</button>
            </div>
            <div className='grid3'>
              <Field label='Prize pool' type='number' inputMode='numeric' value={pool} onChange={(e) => setPool(e.target.value)} />
              <Field label='Starts in (min)' type='number' inputMode='numeric' value={first} onChange={(e) => setFirst(e.target.value)} />
              <Field label='Gap (min)' type='number' inputMode='numeric' value={gap} onChange={(e) => setGap(e.target.value)} />
            </div>
            <span className='small muted'>Players ({picked.length} selected){kind === 'championship' ? ' · pick 4, 8 or 16' : ''}</span>
            <div className='chips mt8 mb12'>{names.map((n) => <button key={n} className={'chip' + (picked.includes(n) ? ' active' : '')} onClick={() => toggle(n)}>{n === me.username ? n + ' (you)' : n}</button>)}</div>
            <Button full onClick={create}>Create and schedule</Button>
          </div>
        </>
      )}

      {tab === 'stream' && (
        <>
          <div className='card'>
            <div className='list-row'>
              <div className='grow'><b>Official stream is live</b><div className='tiny muted'>Viewers can only watch while this is on</div></div>
              <Toggle checked={s.official.live} onChange={(v) => s.setOfficial({ live: v })} />
            </div>
            <Field label='Stream title' value={s.official.title} onChange={(e) => s.setOfficial({ title: e.target.value })} />
            <span className='small muted'>Featured match</span>
            <select className='mt8' value={s.official.featuredMatchId ?? 'auto'} onChange={(e) => s.setOfficial({ featuredMatchId: e.target.value === 'auto' ? null : e.target.value })}>
              <option value='auto'>Automatic (championship first, then the live match)</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          <div className='card mt12'>
            <b>Your commentary camera and mic</b>
            <div className='tiny muted mt4'>Local preview only. A single outbound stream to a live provider can be connected here.</div>
            <div className='row center mt12'>{preview ? <FaceCam user={me} stream={cam.stream} mirror big camOff={!camOn} /> : <span className='small muted'>Preview is off</span>}</div>
            <div className='arena-controls'>
              <button className={'ctl' + (preview ? ' on' : '')} onClick={() => setPreview((v) => !v)}>{preview ? 'Stop preview' : 'Start preview'}</button>
              <button className={'ctl' + (camOn ? ' on' : '')} onClick={() => setCamOn((v) => !v)}>Camera {camOn ? 'on' : 'off'}</button>
              <button className={'ctl' + (micOn ? ' on' : '')} onClick={() => setMicOn((v) => !v)}>Mic {micOn ? 'on' : 'off'}<span className='lvl'><i style={{ width: Math.round(Math.min(1, mic.level) * 100) + '%' }} /></span></button>
            </div>
          </div>

          <div className='admin-note mt12'>Cost tip: viewers get the board as a stream of moves (tiny data), not video. Player faces connect peer-to-peer. Only this one commentary stream needs a paid video provider, so keep it off between matches.</div>
          <Link to='/arena/live' className='btn primary full mt12'>Open official stream</Link>
        </>
      )}

      {tab === 'gifts' && (
        <>
          <div className='grid3'>
            <div className='card stat' style={{ marginTop: 0 }}><b className='gold'>{fmt(total)}</b><span className='tiny muted'>Gift revenue</span></div>
            <div className='card stat' style={{ marginTop: 0 }}><b>{fmt(s.fundPaidOut)}</b><span className='tiny muted'>Paid out</span></div>
            <div className='card stat' style={{ marginTop: 0 }}><b className='green'>{fmt(fund)}</b><span className='tiny muted'>Prize fund</span></div>
          </div>
          <p className='tiny muted mt8'>Gifts are sent to Kinggdom Official (the admin), never to players. They fund prizes and championships.</p>
          <div className='section-title'><h3>By gift</h3></div>
          <div className='card'>
            {Object.entries(byGift).map(([k, v]) => <div key={k} className='list-row'><span style={{ fontSize: 22 }}>{v.emoji}</span><div className='grow'><b className='small'>{k}</b><div className='tiny muted'>{v.n} sent</div></div><b className='gold'>{fmt(v.tokens)}</b></div>)}
          </div>
          <div className='section-title'><h3>Recent gifts</h3></div>
          <div className='card'>
            {s.gifts.slice(0, 12).map((g) => <div key={g.id} className='list-row'><span style={{ fontSize: 20 }}>{g.emoji}</span><div className='grow'><b className='small'>{g.from}</b><div className='tiny muted'>{g.name} · {new Date(g.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div><b className='gold'>+{fmt(g.tokens)}</b></div>)}
          </div>
        </>
      )}

      {tab === 'prizes' && (
        <>
          <div className='card row between'><span className='muted small'>Available prize fund</span><b className='green'>{fmt(fund)} tokens</b></div>
          {s.comps.map((c) => (
            <div key={c.id}>
              <div className='section-title'><h3>{c.name}</h3><span className={'kpill' + (c.status === 'completed' ? ' done' : '')}>{c.status}</span></div>
              <div className='card'>
                {c.prizes.map((p, i) => (
                  <div key={i} className='list-row'>
                    <div className='grow'><b className='small'>{p.place}</b><div className='tiny muted'>{p.to ? 'Winner: ' + p.to : 'Winner not decided yet'}</div></div>
                    <b className='gold'>{fmt(p.tokens)}</b>
                    {p.paid ? <span className='kpill'>Paid</span> : <Button sm disabled={!p.to} onClick={() => pay(c.id, i)}>Pay</Button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className='tiny muted mt12'>Paying records the payout and deducts it from the fund. Crediting the winner wallet happens on the server once the backend is connected.</p>
        </>
      )}
    </div>
  );
}
