import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Loading, TopBar } from '../components/ui';
import type { Message } from '../types';

export default function ChatThread() {
  const { id = '' } = useParams();
  const chats = useAsync(() => api.chat.list());
  const { data, loading } = useAsync(() => api.chat.messages(id), [id]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const name = chats.data?.find((c) => c.id === id)?.name ?? (id.startsWith('c-') ? id.slice(2) : 'Chat');

  useEffect(() => { if (data) setMsgs(data); }, [data]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    setMsgs((m) => [...m, { id: 'tmp' + m.length, from: 'me', text: t, time: 'now' }]);
    await api.chat.send(id, t);
  };

  return (
    <div className='screen nonav'>
      <TopBar title={<span className='row gap8'><Avatar name={name} size={30} />{name}</span>} />
      {loading ? <Loading /> : <div className='msgs'>{msgs.map((m) => <div key={m.id} className={'bubble' + (m.from === 'me' ? ' me' : '')}>{m.text}<div className='tiny' style={{ opacity: 0.6 }}>{m.time}</div></div>)}<div ref={end} /></div>}
      <div className='composer'>
        <input placeholder='Type a message...' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className='btn primary' onClick={send} aria-label='Send'><Send size={16} /></button>
      </div>
    </div>
  );
}
