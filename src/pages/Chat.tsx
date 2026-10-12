import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Loading, Tabs, TopBar } from '../components/ui';

type Tab = 'messages' | 'community';

export default function Chat() {
  const chats = useAsync(() => api.chat.list());
  const comm = useAsync(() => api.communities.list());
  const [tab, setTab] = useState<Tab>('messages');
  return (
    <div className='screen nonav'>
      <TopBar title='Chat' />
      <Tabs<Tab> tabs={[{ id: 'messages', label: 'Messages' }, { id: 'community', label: 'Community' }]} value={tab} onChange={setTab} />
      {chats.loading ? <Loading /> : tab === 'messages' ? (
        <div className='card'>
          {(chats.data ?? []).map((c) => (
            <Link key={c.id} to={'/chat/' + c.id} className='list-row'>
              <Avatar name={c.name} size={42} online={c.group ? undefined : !!c.online} />
              <div className='grow'><b>{c.name}</b><div className='small muted ellipsis'>{c.last}</div></div>
              <div className='col' style={{ alignItems: 'flex-end', gap: 4 }}><span className='tiny muted'>{c.time}</span>{c.unread > 0 && <span className='pill' style={{ background: 'var(--blue)', color: '#fff' }}>{c.unread}</span>}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className='card'>
          {(comm.data ?? []).filter((c) => c.joined).map((c) => <Link key={c.id} to='/community' className='list-row'><Avatar name={c.name} size={42} /><div className='grow'><b>{c.name}</b><div className='small muted ellipsis'>{c.preview}</div></div></Link>)}
        </div>
      )}
    </div>
  );
}
