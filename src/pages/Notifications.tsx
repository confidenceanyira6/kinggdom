import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Gift, MessageCircle, Radio, Trophy, UserPlus, Coins } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { useAsync } from '../hooks/useAsync';
import { Avatar, Empty, Loading, Tabs, TopBar } from '../components/ui';
import type { AppNotification } from '../types';

type Tab = 'all' | 'messages' | 'gifts' | 'tournaments';
const GROUPS: Record<Tab, AppNotification['type'][] | null> = {
  all: null, messages: ['message', 'comment', 'follow'], gifts: ['gift', 'reward'], tournaments: ['tournament', 'live'],
};
const ICON = { gift: Gift, comment: MessageCircle, live: Radio, tournament: Trophy, reward: Coins, follow: UserPlus, message: MessageCircle };

export default function Notifications() {
  const toast = useApp((s) => s.toast);
  const n = useAsync(() => api.notifications.list());
  const [tab, setTab] = useState<Tab>('all');
  const list = (n.data ?? []).filter((x) => !GROUPS[tab] || GROUPS[tab]!.includes(x.type));

  const markAll = async () => { await api.notifications.markAllRead(); n.reload(); toast('All caught up'); };

  return (
    <div className='screen nonav'>
      <TopBar title='Notifications' right={<button className='link small' onClick={markAll}>Mark all read</button>} />
      <Tabs<Tab> tabs={[{ id: 'all', label: 'All' }, { id: 'messages', label: 'Messages' }, { id: 'gifts', label: 'Gifts' }, { id: 'tournaments', label: 'Tournaments' }]} value={tab} onChange={setTab} />
      {n.loading ? <Loading /> : list.length === 0 ? <Empty text='Nothing here yet' /> : (
        <div className='card'>
          {list.map((x) => {
            const I = ICON[x.type] ?? Bell;
            return (
              <Link key={x.id} to={x.user ? '/u/' + x.user : '/tournaments'} className='list-row' style={{ opacity: x.read ? 0.7 : 1 }}>
                {x.user ? <Avatar name={x.user} size={40} /> : <span className='icon-btn'><I size={18} /></span>}
                <div className='grow'><b className='small'>{x.text}</b><div className='tiny muted'>{x.sub ?? x.time}</div></div>
                {!x.read && <i className='dot on' style={{ width: 8, height: 8, borderRadius: '50%' }} />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
