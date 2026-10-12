import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Toggle, TopBar } from '../components/ui';
import type { GameType } from '../types';

export default function StartStream() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [game, setGame] = useState<GameType>('chess');
  const [dual, setDual] = useState(true);
  const [audio, setAudio] = useState(false);
  return (
    <div className='screen nonav'>
      <TopBar title='Start Stream' />
      <Field label='Stream title' placeholder='e.g. Blitz night with the community' value={title} onChange={(e) => setTitle(e.target.value)} />
      <span className='small muted'>Game</span>
      <div className='row gap8 mt8 mb12'>{(['chess', 'checkers'] as GameType[]).map((g) => <button key={g} className={'chip' + (game === g ? ' active' : '')} onClick={() => setGame(g)}>{g === 'chess' ? 'Chess' : 'Checkers'}</button>)}</div>
      <div className='card'>
        <div className='list-row'><div className='grow'><b>Show both players</b><div className='tiny muted'>Both cameras visible during the match</div></div><Toggle checked={dual} onChange={setDual} /></div>
        <div className='list-row'><div className='grow'><b>Audio only</b><div className='tiny muted'>Hide camera, keep the voice</div></div><Toggle checked={audio} onChange={setAudio} /></div>
      </div>
      <p className='tiny muted mt12 mb12'>Camera and microphone streaming starts working once the live video service is connected.</p>
      <Button variant='danger' full onClick={() => nav('/live/self')}>● Go Live</Button>
    </div>
  );
}
