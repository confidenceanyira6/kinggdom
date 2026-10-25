import { FaceCam } from './StreamStage';
import type { SideLabel } from './StreamStage';
import { Button, Sheet } from './ui';
import type { User } from '../types';
import type { LivePhase } from '../hooks/useGameLive';
import '../styles/stream.css';
import '../styles/gamelive.css';

export interface LiveFace {
  id: string;
  name: string;
  username: string;
  rating?: number;
  /** The colour of the pieces this player has: White, Black or Red. */
  side: SideLabel;
  active?: boolean;
  mine?: boolean;
}

const asUser = (f: LiveFace) => ({ id: f.id, name: f.name, username: f.username, rating: f.rating ?? '' } as unknown as User);

/** Both players' faces, with their piece colour, shown at the top of the game while live. */
export function LiveFaces({ phase, left, right, streams, waitingFor }: {
  phase: LivePhase;
  left: LiveFace;
  right: LiveFace;
  streams: Record<string, MediaStream>;
  waitingFor?: string;
}) {
  if (phase === 'off' || phase === 'invited') return null;
  const label = phase === 'live' ? 'LIVE' : phase === 'pending' ? 'WAITING' : 'STARTING...';
  return (
    <div className='gl-strip'>
      <div className='gl-head'>
        <span className={'gl-tag' + (phase === 'live' ? ' on' : '')}>{label}</span>
        {phase === 'pending' && <span className='gl-note'>Waiting for {waitingFor ?? 'your opponent'} to accept...</span>}
      </div>
      <div className='gl-cams'>
        <FaceCam user={asUser(left)} side={left.side} stream={streams[left.id] ?? null} mirror={left.mine} active={left.active} />
        <span className='stage-vs'>VS</span>
        <FaceCam user={asUser(right)} side={right.side} stream={streams[right.id] ?? null} mirror={right.mine} active={right.active} />
      </div>
    </div>
  );
}

export function LiveButton({ phase, onStart, onStop }: { phase: LivePhase; onStart: () => void; onStop: () => void }) {
  const on = phase === 'live' || phase === 'pending';
  const text = phase === 'starting' ? 'Starting...' : phase === 'pending' ? 'Cancel live request' : phase === 'live' ? 'End live' : '● Go Live';
  return <Button variant={on ? 'danger' : 'ghost'} onClick={on ? onStop : onStart}>{text}</Button>;
}

/** The second player must accept before either of them goes live. */
export function LiveInvite({ phase, name, onAccept, onDecline }: { phase: LivePhase; name: string; onAccept: () => void; onDecline: () => void }) {
  return (
    <Sheet open={phase === 'invited'} onClose={() => undefined} title='Go live together?'>
      <p className='muted mb12'>{name} wants to go live with this game. If you accept, your face and voice will be shown to viewers.</p>
      <div className='grid2'>
        <Button onClick={onAccept}>Accept</Button>
        <Button variant='ghost' onClick={onDecline}>Decline</Button>
      </div>
    </Sheet>
  );
}
