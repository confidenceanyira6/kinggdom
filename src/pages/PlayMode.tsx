import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bot, Globe, Handshake, Users } from 'lucide-react';
import { TopBar } from '../components/ui';

const LEVELS = [{ n: 1, label: 'Easy' }, { n: 2, label: 'Medium' }, { n: 3, label: 'Hard' }];

export default function PlayMode() {
  const { game = 'chess' } = useParams();
  const nav = useNavigate();
  const [level, setLevel] = useState(2);
  const go = (mode: string) => nav('/game/' + game + '?mode=' + mode + '&level=' + level);
  const name = game === 'checkers' ? 'Checkers' : 'Chess';

  return (
    <div className='screen nonav'>
      <TopBar title={name} />
      <div className='card'>
        <div className='row gap12'><Bot className='gold' /><div className='grow'><b>Play vs AI</b><div className='tiny muted'>Practice against the computer</div></div></div>
        <div className='row gap8 mt12'>{LEVELS.map((l) => <button key={l.n} className={'chip' + (level === l.n ? ' active' : '')} onClick={() => setLevel(l.n)}>{l.label}</button>)}</div>
        <button className='btn primary full mt12' onClick={() => go('ai')}>Start vs AI</button>
      </div>
      <button className='card row gap12' style={{ width: '100%', textAlign: 'left' }} onClick={() => go('online')}><Globe className='gold' /><div><b>Play online</b><div className='tiny muted'>Match with a random player</div></div></button>
      <button className='card row gap12' style={{ width: '100%', textAlign: 'left' }} onClick={() => go('local')}><Handshake className='gold' /><div><b>Pass and play (offline)</b><div className='tiny muted'>Two players, one device</div></div></button>
      <button className='card row gap12' style={{ width: '100%', textAlign: 'left' }} onClick={() => nav('/friends')}><Users className='gold' /><div><b>Play with friends</b><div className='tiny muted'>Challenge someone from your friends list</div></div></button>
    </div>
  );
}
