import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, Gift, Mic } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { useDemoGame, useFakeChat } from '../hooks/useDemo';
import { ChessBoard } from '../components/ChessBoard';
import { Avatar, Button, Loading, TopBar, fmt } from '../components/ui';

export default function LiveStream() {
  const { id = 'm1' } = useParams();
  const isSelf = id === 'self';
  const me = useApp((s) => s.user)!;
  const { data: m, loading } = useAsync(() => api.matches.get(isSelf ? 'm1' : id), [id]);
  const demo = useDemoGame(2600);
  const chat = useFakeChat();
  const [text, setText] = useState('');

  if (loading || !m) return <div className='screen nonav'><Loading /></div>;
  const a = isSelf ? me : m.white;
  const b = m.black;

  const send = () => { if (!text.trim()) return; chat.send(me.username, text.trim()); setText(''); };

  return (
    <div className='screen nonav'>
      <TopBar title={isSelf ? 'Your live stream' : m.title} right={<span className='live-tag'>LIVE</span>} />
      <div className='video'>
        <span className='tl live-tag'>LIVE</span>
        <span className='tr small row gap4'><Eye size={14} /> {fmt(isSelf ? 1 : m.viewers)}</span>
        <div className='row gap12' style={{ width: '100%', padding: 12 }}>
          <div className='cam'><Avatar name={a.name} size={52} ring /><b className='small'>{a.username}</b><span className='tiny muted'>{a.rating}</span></div>
          <Mic className='gold' />
          <div className='cam'><Avatar name={b.name} size={52} /><b className='small'>{b.username}</b><span className='tiny muted'>{b.rating}</span></div>
        </div>
      </div>
      <div className='mt12'><ChessBoard fen={demo.fen} last={demo.last} /></div>
      <div className='card mt12'>
        <div className='chatbox'>{chat.lines.slice(-8).map((l, i) => <div key={i} className='chatline'><b>{l.by}:</b> {l.text}</div>)}</div>
        <div className='row gap8 mt12'>
          <input placeholder='Type a message...' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <Link to={'/gift?to=' + a.username} className='btn gold sm'><Gift size={16} /></Link>
        </div>
      </div>
      {isSelf && <Link to='/home'><Button variant='danger' full className='mt12'>End stream</Button></Link>}
    </div>
  );
}
