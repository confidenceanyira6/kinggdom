import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Eye, Gift, Heart, Share2, Video, VideoOff } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { useFakeChat } from '../hooks/useDemo';
import { useCamera } from '../hooks/useCamera';
import { DemoBoard, FaceCam } from '../components/StreamStage';
import type { SideLabel } from '../components/StreamStage';
import { Loading, fmt } from '../components/ui';
import type { GameType } from '../types';
import '../styles/stream.css';

export default function LiveStream() {
  const { id = 'm1' } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const isSelf = id === 'self';
  const me = useApp((s) => s.user)!;
  const toast = useApp((s) => s.toast);
  const { data: m, loading } = useAsync(() => api.matches.get(isSelf ? 'm1' : id), [id]);
  const chat = useFakeChat();
  const [text, setText] = useState('');
  const [turn, setTurn] = useState<'a' | 'b'>('a');
  const [camOn, setCamOn] = useState(true);
  const [likes, setLikes] = useState(0);
  const [hearts, setHearts] = useState<number[]>([]);

  const audioOnly = isSelf && sp.get('audio') === '1';
  const cam = useCamera(isSelf && !audioOnly && camOn);
  useEffect(() => { if (cam.error) toast(cam.error); }, [cam.error, toast]);

  if (loading || !m) return <div className='stage'><div className='center-screen'><Loading /></div></div>;

  // Own stream: choose game + one/two faces on the Start Stream screen. Watching: use the match.
  const game: GameType = isSelf ? (sp.get('game') === 'checkers' ? 'checkers' : 'chess') : m.game;
  const dual = isSelf ? sp.get('dual') !== '0' : true;
  const a = isSelf ? me : m.white;
  const b = m.black;
  const title = isSelf ? sp.get('title') || 'Your live stream' : m.title;
  const sideA: SideLabel = game === 'chess' ? 'White' : 'Red';
  const sideB: SideLabel = 'Black';

  const send = () => { if (!text.trim()) return; chat.send(me.username, text.trim()); setText(''); };
  const like = () => {
    const hid = Date.now();
    setLikes((l) => l + 1);
    setHearts((h) => [...h, hid]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== hid)), 1200);
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Kinggdom Live', text: title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
    } catch { /* cancelled */ }
  };

  return (
    <div className='stage'>
      <div className='stage-top'>
        <Link to={isSelf ? '/live/start' : '/live'} className='stage-x' aria-label='Back'><ChevronLeft size={20} /></Link>
        <span className='live-tag'>LIVE</span>
        <span className='stage-pill'><Eye size={13} />{fmt(isSelf ? 1 : m.viewers)}</span>
        <span className='stage-title'>{dual ? title : ''}</span>
        {isSelf && <button className='stage-end' onClick={() => nav('/home')}>End</button>}
      </div>

      {dual ? (
        <div className='stage-cams dual'>
          <FaceCam user={a} side={sideA} stream={isSelf ? cam.stream : null} mirror active={turn === 'a'} camOff={isSelf && (audioOnly || !camOn)} />
          <span className='stage-vs'>VS</span>
          <FaceCam user={b} side={sideB} active={turn === 'b'} />
        </div>
      ) : (
        <div className='stage-cams solo'>
          <div className='stage-info'>
            <b>{title}</b>
            <span>{game === 'chess' ? '♟ Chess' : '⛀ Checkers'} · live with the community</span>
          </div>
          <FaceCam user={a} side={sideA} stream={cam.stream} mirror big camOff={audioOnly || !camOn} />
        </div>
      )}

      <div className='stage-board'>
        <DemoBoard game={game} onTurn={setTurn} />
      </div>

      <div className='stage-chat'>
        <div className='stage-lines'>
          {chat.lines.slice(-6).map((l, i) => <div key={i} className='stage-line'><b>{l.by}</b>{l.text}</div>)}
        </div>
      </div>

      <div className='stage-input'>
        <input placeholder='Say something...' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className='s-mini' onClick={like} aria-label='Like'><Heart size={20} />{likes > 0 && <i>{fmt(likes)}</i>}</button>
        <Link to={'/gift?to=' + a.username} className='s-mini gold' aria-label='Send gift'><Gift size={20} /></Link>
        <button className='s-mini' onClick={share} aria-label='Share'><Share2 size={18} /></button>
        {isSelf && !audioOnly && (
          <button className='s-mini' onClick={() => setCamOn((c) => !c)} aria-label='Toggle camera'>{camOn ? <Video size={18} /> : <VideoOff size={18} />}</button>
        )}
      </div>

      {hearts.map((h) => <span key={h} className='float-heart' style={{ right: 16 + (h % 24) }}><Heart size={30} fill='currentColor' /></span>)}
    </div>
  );
}
