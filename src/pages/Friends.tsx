import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Button, Empty, Field, Loading, Sheet, Tabs, TopBar } from '../components/ui';

type Tab = 'all' | 'online' | 'requests';

export default function Friends() {
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  const friends = useAsync(() => api.users.friends());
  const reqs = useAsync(() => api.users.requests());
  const [tab, setTab] = useState<Tab>('all');
  const [add, setAdd] = useState(false);
  const [name, setName] = useState('');

  const list = tab === 'requests' ? reqs.data ?? [] : (friends.data ?? []).filter((u) => tab === 'all' || u.online);
  const addFriend = async () => {
    if (!name.trim()) return;
    await api.users.follow(name.trim());
    toast('Friend request sent');
    setAdd(false); setName('');
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Friends' />
      <Tabs<Tab> tabs={[{ id: 'all', label: 'All' }, { id: 'online', label: 'Online' }, { id: 'requests', label: 'Requests' }]} value={tab} onChange={setTab} />
      {friends.loading ? <Loading /> : list.length === 0 ? <Empty text='No one here yet' /> : (
        <div className='card'>
          {list.map((u) => (
            <div key={u.id} className='list-row'>
              <Link to={'/u/' + u.username}><Avatar name={u.name} size={42} online={!!u.online} /></Link>
              <div className='grow'><b>{u.username}</b><div className='tiny muted'>{u.online ? 'Online' : 'Offline'}</div></div>
              {tab === 'requests' ? <Button sm onClick={() => toast('Request accepted')}>Accept</Button> : <Button sm variant='ghost' onClick={() => nav('/play/chess')}>Challenge</Button>}
            </div>
          ))}
        </div>
      )}
      <Button full className='mt16' onClick={() => setAdd(true)}>Add Friend</Button>
      <Sheet open={add} onClose={() => setAdd(false)} title='Add friend'>
        <Field placeholder='Username' value={name} onChange={(e) => setName(e.target.value)} />
        <Button full onClick={addFriend}>Send request</Button>
      </Sheet>
    </div>
  );
}
