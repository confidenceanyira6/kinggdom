import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Eye, Gift, Share2, Trophy } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useFakeChat } from '../hooks/useDemo';
import { FaceCam } from '../components/StreamStage';
import { Countdown, useNow } from '../arena/ui';
import { SpectatorBoard } from '../arena/BoardView';
import { GAME_LABEL, OFFICIAL, freshBoard, pickFeatured, playerUser, sideName, useArena, useBoards } from '../arena/store';
import '../styles/stream.css';
import '../styles/arena.css';
import '../styles/arena-pages.css';

const ADMIN = import.meta.env.VITE_SHOW_ADMIN === 'true';

export default function ArenaLive() {
  const me = useApp((s) => s.user)!;
  const toast = useApp((s) => s.toast);
  const comps = useArena((s) => s.comps);
  const official = useArena((s) => s.official);
  const gifts = useArena((s) => s.gifts);
  const feat = official.live ? pickFeatured(comps, official) : null;
  const bs = useBoards((s) => (feat ? s.boards[feat.match.id] : undefined));
  const chat = useFakeChat();
  const now = useNow(3000);
  const [text, setText] = useState('');

  if (!feat) {
    return (
      <div className='stage'>
        <div className='stage-top'><Link to='/arena' className='stage-x' aria-label='Back'><ChevronLeft size={20} /></Link></div>
        <div className='center-screen' style={{ flex: 1, flexDirection: 'column', gap: 10, padding: 24, textAlign: 'center' }}>
          <h2>Official stream is offline</h2>
          <p className='small muted'>The admin starts the broadcast when a featured match begins.</p>
          <Link to='/arena' className='btn primary sm'>See schedule</Link>
        </div>
      </div>
    );
  }

  const { comp, match: m } = feat;
  const a = playerUser(m.a as string);
  const b = playerUser(m.b as string);
  const live = m.status === 'live';
  const board = bs ?? freshBoard();
  const viewers = 220 + (Math.floor(now / 3000) % 41);

  const send = () => { if (!text.trim()) return; chat.send(me.username, text.trim()); setText(''); };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Kinggdom Arena', text: comp.name, url: location.href });
      else { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
    } catch { /* cancelled */ }
  };

  return (
    <div className='stage scroll'>
      <div className='stage-top'>
        <Link to='/arena' className='stage-x' aria-label='Back'><ChevronLeft size={20} /></Link>
        <span className='live-tag'>LIVE</span>
        <span className='stage-pill'><Eye size={13} />{viewers}</span>
        <span className='stage-title'>{official.title}</span>
        {ADMIN && <Link to='/admin/arena' className='stage-end' style={{ background: 'var(--blue)', color: '#03281f' }}>Admin</Link>}
      </div>

      <div className='stage-cams dual'>
        <FaceCam user={a} side={sideName(comp.game, 'a')} active={live && board.turn === 'r'} />
        <span className='stage-vs'>VS</span>
        <FaceCam user={b} side={sideName(comp.game, 'b')} active={live && board.turn === 'b'} />
      </div>
      <div className='arena-sub'>
        {GAME_LABEL[comp.game]} · {comp.name} · {m.round}
        {!live && m.startsAt ? <> · starts in <Countdown to={m.startsAt} /></> : null}
      </div>

      <div className='stage-board'><SpectatorBoard game={comp.game} bs={board} /></div>

      <div className='stage-chat'>
        <div className='pinned'>🎁 Gifts go to Kinggdom Official and fund the prizes. They are not sent to the players.</div>
        <div className='gift-ticker'>{gifts.slice(0, 2).map((g) => <span key={g.id} className='gift-chip'>{g.emoji} {g.from} sent {g.name}</span>)}</div>
        <div className='stage-lines'>
          {chat.lines.slice(-4).map((l, i) => <div key={i} className='stage-line'><b>{l.by}</b>{l.text}</div>)}
        </div>
      </div>

      <div className='stage-input'>
        <input placeholder='Say something...' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <Link to={'/gift?to=' + OFFICIAL} className='s-mini gold' aria-label='Send gift to Kinggdom Official'><Gift size={20} /></Link>
        <Link to={'/arena/' + comp.id} className='s-mini' aria-label='Table'><Trophy size={18} /></Link>
        <button className='s-mini' onClick={share} aria-label='Share'><Share2 size={18} /></button>
      </div>
    </div>
  );
}
