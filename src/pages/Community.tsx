import { useState } from 'react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Button, Loading, Tabs, TopBar, fmt } from '../components/ui';

type Tab = 'global' | 'groups';

export default function Community() {
  const { data, loading, setData } = useAsync(() => api.communities.list());
  const [tab, setTab] = useState<Tab>('global');
  const join = async (id: string) => {
    const c = await api.communities.join(id);
    setData((data ?? []).map((x) => (x.id === id ? c : x)));
  };
  return (
    <div className='screen nonav'>
      <TopBar title='Community' />
      <Tabs<Tab> tabs={[{ id: 'global', label: 'Global' }, { id: 'groups', label: 'Groups' }]} value={tab} onChange={setTab} />
      {loading ? <Loading /> : (
        <div className='card'>
          {(data ?? []).filter((c) => c.scope === tab).map((c) => (
            <div key={c.id} className='list-row'>
              <Avatar name={c.name} size={44} />
              <div className='grow'><b>{c.name}</b><div className='tiny muted'>{fmt(c.members)} members</div><div className='small muted ellipsis'>{c.preview}</div></div>
              <Button sm variant={c.joined ? 'ghost' : 'primary'} onClick={() => join(c.id)}>{c.joined ? 'Joined' : 'Join'}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
