import { Link } from 'react-router-dom';
import { Trophy, Video } from 'lucide-react';
import { TopBar } from '../components/ui';

export default function Play() {
  return (
    <div className='screen'>
      <TopBar title='Games' back={false} />
      <div className='grid2'>
        <Link to='/play/chess' className='card tc' style={{ background: 'linear-gradient(160deg,#1d2b66,#3b1d6e)' }}>
          <div style={{ fontSize: 56 }}>♞</div><h3>Chess</h3><span className='btn primary sm mt8'>Play Now</span>
        </Link>
        <Link to='/play/checkers' className='card tc' style={{ marginTop: 0, background: 'linear-gradient(160deg,#4a1d3d,#1d2b66)' }}>
          <div style={{ fontSize: 56 }}>⛀</div><h3>Checkers</h3><span className='btn primary sm mt8'>Play Now</span>
        </Link>
        <Link to='/tournaments' className='card tc' style={{ marginTop: 0 }}>
          <Trophy size={44} className='gold' /><h3 className='mt8'>Tournaments</h3><p className='tiny muted'>Compete and Win</p>
        </Link>
        <Link to='/live' className='card tc' style={{ marginTop: 0 }}>
          <Video size={44} style={{ color: '#7fa6ff' }} /><h3 className='mt8'>Live Stream</h3><p className='tiny muted'>Watch and Chat</p>
        </Link>
      </div>
      <div className='section-title'><h3>Quick links</h3></div>
      <div className='row wrap gap8'>
        <Link to='/leaderboard' className='chip'>🏆 Leaderboard</Link>
        <Link to='/friends' className='chip'>👥 Friends</Link>
        <Link to='/community' className='chip'>🏘️ Communities</Link>
      </div>
    </div>
  );
}
