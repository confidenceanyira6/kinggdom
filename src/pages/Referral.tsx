import { useApp } from '../store/useApp';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { Button, Loading, TopBar, fmt } from '../components/ui';

export default function Referral() {
  const toast = useApp((s) => s.toast);
  const { data, loading } = useAsync(() => api.referral.get());
  if (loading || !data) return <div className='screen nonav'><TopBar title='Invite and Earn' /><Loading /></div>;
  const link = location.origin + '/signup?ref=' + data.code;
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast('Referral link copied'); } catch { toast(data.code); } };
  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: 'Join me on Kinggdom', text: 'Use my code ' + data.code, url: link }); else await copy(); } catch { /* cancelled */ }
  };
  return (
    <div className='screen nonav'>
      <TopBar title='Invite and Earn' />
      <div className='hero tc'>
        <div className='muted small'>Your referral code</div>
        <h1 className='gold' style={{ fontSize: 30, letterSpacing: 3 }}>{data.code}</h1>
        <div className='grid2 mt12'><Button onClick={copy}>Copy link</Button><Button variant='gold' onClick={share}>Share</Button></div>
      </div>
      <div className='grid2 mt16'>
        <div className='card stat'><b>{fmt(data.invited)}</b><span className='tiny muted'>Friends invited</span></div>
        <div className='card stat' style={{ marginTop: 0 }}><b className='gold'>{fmt(data.earned)}</b><span className='tiny muted'>Tokens earned</span></div>
      </div>
      <p className='small muted mt16'>Earn tokens when friends sign up with your code and play their first match.</p>
    </div>
  );
}
