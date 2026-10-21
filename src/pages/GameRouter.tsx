import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Game from './Game';
import OnlineChess from './OnlineChess';
import { Button, TopBar } from '../components/ui';

/**
 * Picks the right game screen. Online chess is server-driven. Online checkers needs the
 * server's board encoding, so it is not offered yet rather than faked.
 */
export default function GameRouter() {
  const { game } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const online = sp.get('mode') === 'online';
  if (online && game !== 'checkers') return <OnlineChess />;
  if (online && game === 'checkers') {
    return (
      <div className='screen nonav'>
        <TopBar title='Online Checkers' />
        <div className='col center gap12' style={{ minHeight: '50vh' }}>
          <p className='muted tc'>Online checkers is coming soon. You can still play vs AI or pass and play.</p>
          <Button onClick={() => nav('/play/checkers')}>Back</Button>
        </div>
      </div>
    );
  }
  return <Game />;
}
