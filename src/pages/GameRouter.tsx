import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Game from './Game';
import OnlineChess from './OnlineChess';
import { Button, TopBar } from '../components/ui';

/**
 * Picks the right game screen. Online chess is server-driven. Online checkers (8x8 and
 * international) needs the server's board encoding, so it is not offered yet rather than faked.
 */
export default function GameRouter() {
  const { game } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const online = sp.get('mode') === 'online';
  const isCheckers = game === 'checkers' || game === 'international';
  if (online && !isCheckers) return <OnlineChess />;
  if (online && isCheckers) {
    return (
      <div className='screen nonav'>
        <TopBar title={game === 'international' ? 'Online International Checkers' : 'Online Checkers'} />
        <div className='col center gap12' style={{ minHeight: '50vh' }}>
          <p className='muted tc'>Online checkers is coming soon. You can still play vs AI or pass and play.</p>
          <Button onClick={() => nav('/play/' + game)}>Back</Button>
        </div>
      </div>
    );
  }
  return <Game />;
}
