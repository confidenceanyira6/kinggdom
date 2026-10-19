import { Link } from 'react-router-dom';
import { TopBar } from '../components/ui';

// Placeholder dashboard. Real admin tools must be protected by server-side role checks.
const ENABLED = import.meta.env.VITE_SHOW_ADMIN === 'true';

const stats = [['Users', '12,480'], ['Active today', '3,210'], ['Open reports', '14'], ['Pending withdrawals', '9']];
const areas = ['User management', 'Club management', 'Post moderation', 'Report management', 'Creator management', 'Advertisement management', 'Analytics dashboard', 'Notification management', 'Subscription management', 'Referral management', 'Wallet management'];

export default function Admin() {
  if (!ENABLED) return <div className='screen nonav'><TopBar title='Admin' /><p className='muted tc mt24'>Admin tools are not enabled for this account.</p><Link to='/home' className='link tc' style={{ display: 'block' }}>Back home</Link></div>;
  return (
    <div className='screen nonav'>
      <TopBar title='Admin Panel' />
      <Link to='/admin/arena' className='gc-row'>
        <div className='grow'><b>Arena Admin</b><div className='tiny muted'>Competitions, official livestream, gifts and prize payments</div></div>
      </Link>
      <div className='grid2'>{stats.map(([k, v]) => <div key={k} className='card stat' style={{ marginTop: 0 }}><b>{v}</b><span className='tiny muted'>{k}</span></div>)}</div>
      <div className='section-title'><h3>Management</h3></div>
      <div className='card'>{areas.map((a) => <div key={a} className='list-row'><b className='small grow'>{a}</b><span className='tiny muted'>Connects to backend</span></div>)}</div>
    </div>
  );
}
