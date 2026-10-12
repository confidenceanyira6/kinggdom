import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swords, Trophy, Video } from 'lucide-react';
import { Button } from '../components/ui';

const slides = [
  { icon: Swords, title: 'Play Your Favourite Game', text: 'Chess or Checkers. Compete with players from around the world.' },
  { icon: Trophy, title: 'Join Tournaments', text: 'Win tokens, climb the leaderboard and get rewarded.' },
  { icon: Video, title: 'Watch and Stream', text: 'Enjoy live matches, support creators, chat and send gifts.' },
];

export default function Onboarding() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const s = slides[i];
  const last = i === slides.length - 1;
  return (
    <div className='screen nonav' style={{ paddingTop: 24 }}>
      <div className='row between'><span /><Link to='/signup' className='muted small'>Skip</Link></div>
      <div className='slide'>
        <div className='big-ico'><s.icon size={72} /></div>
        <h2 style={{ fontSize: 24 }}>{s.title}</h2>
        <p className='muted' style={{ maxWidth: 280 }}>{s.text}</p>
      </div>
      <div className='dots'>{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
      <Button full onClick={() => (last ? nav('/signup') : setI(i + 1))}>{last ? 'Get Started' : 'Next'}</Button>
    </div>
  );
}
