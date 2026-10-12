import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { Match } from '../types';
import { Avatar, fmt } from './ui';

export function MatchCard({ match }: { match: Match }) {
  return (
    <Link to={'/watch/' + match.id} className='card row gap12' style={{ display: 'flex' }}>
      <Avatar name={match.white.name} size={40} ring />
      <div className='grow'>
        <div className='row gap8'><span className='live-tag'>LIVE</span><b className='ellipsis'>{match.white.username} vs {match.black.username}</b></div>
        <div className='small muted'>{match.title}</div>
      </div>
      <div className='col' style={{ alignItems: 'flex-end', gap: 6 }}>
        <span className='small muted row gap4'><Eye size={13} />{fmt(match.viewers)}</span>
        <span className='btn primary sm'>Watch</span>
      </div>
    </Link>
  );
}
