import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { useDemoGame, useFakeChat } from '../hooks/useDemo';
import { ChessBoard } from '../components/ChessBoard';
import { Avatar, Loading, Tabs, TopBar } from '../components/ui';

type Tab = 'chat' | 'gifts' | 'leaders';

export default function WatchMatch() {
  const { id = 'm1' } = useParams();
  const me = useApp((s) => s.user)!;
  const { data: m, loading } = useAsync(() => api.matches.get(id), [id]);
  const gifts = useAsync(() => api.gifts.list());
  const demo = useDemoGame(2400);
  const chat = useFakeChat();
  const [tab, setTab] = useState<Tab>('chat');
  const [text, setText] = useState('');

  if (loading || !m) return <div className='screen nonav'><Loading /></div>;
  const send = () => { if (!text.trim()) return; chat.send(me.username, text.trim()); setText(''); };

  return (
    <div className='screen nonav'>
      <TopBar title='Watch Match' />
      <div className='row between mb12'>
        <div className='row gap8'><Avatar name={m.white.name} size={32} /><b className='small'>{m.white.username}</b></div>
        <span className='small muted'>vs</span>
        <div className='row gap8'><b className='small'>{m.black.username}</b><Avatar name={m.black.name} size={32} /></div>
      </div>
      <ChessBoard fen={demo.fen} last={demo.last} />
      <div className='moves'>{demo.moves.slice(-10).map((mv, i) => <span key={i}>{mv}</span>)}</div>
      <Tabs<Tab> tabs={[{ id: 'chat', label: 'Chat' }, { id: 'gifts', label: 'Gifts' }, { id: 'leaders', label: 'Leaderboard' }]} value={tab} onChange={setTab} />
      <div className='card'>
        {tab === 'chat' && (
          <>
            <div className='chatbox'>{chat.lines.slice(-10).map((l, i) => <div key={i} className='chatline'><b>{l.by}:</b> {l.text}</div>)}</div>
            <input className='mt12' placeholder='Say something...' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          </>
        )}
        {tab === 'gifts' && <div className='grid3'>{(gifts.data ?? []).map((g) => <Link key={g.id} className='gift' to={'/gift?to=' + m.white.username}><span className='em'>{g.emoji}</span><b className='small'>{g.name}</b><span className='tiny gold'>{g.cost}</span></Link>)}</div>}
        {tab === 'leaders' && ['ChessFan', 'RookLord', 'TacticsFan'].map((n, i) => <div key={n} className='list-row'><span className={'rank r' + (i + 1)}>{i + 1}</span><Avatar name={n} size={32} /><b className='grow'>{n}</b><span className='gold'>{(3 - i) * 400} tokens gifted</span></div>)}
      </div>
      <Link to={'/gift?to=' + m.white.username} className='btn gold full mt12'><Gift size={16} /> Send a Gift</Link>
    </div>
  );
}
